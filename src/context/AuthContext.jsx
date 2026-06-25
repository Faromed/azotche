import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, query, where, limit, getDocs, addDoc, increment,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { genReferralCode, genClientReferralCode } from '../config/metiers';

const AuthContext = createContext(null);

/**
 * Applique un code de parrainage saisi à l'inscription — port fidèle de
 * firestore_service.dart → applyReferral() (Flutter). Appelé par le FILLEUL
 * juste après la création de son propre document, exactement comme sur
 * mobile : c'est pourquoi la règle Firestore isValidReferralCreditUpdate()
 * autorise un utilisateur connecté à incrémenter referralCount/creditParrainage
 * sur le document d'un AUTRE utilisateur (le parrain) — c'est le filleul qui
 * crédite son parrain, jamais l'inverse.
 *
 * IMPORTANT : referredBy doit toujours contenir l'UID du parrain (jamais le
 * code saisi tel quel) — c'est ce que lit ParrainagePage.jsx et UsersPage.js
 * (admin) pour compter les filleuls.
 */
async function applyReferral({ referralCode, newUserId }) {
  try {
    const code = (referralCode || '').trim().toUpperCase();
    if (!code) return;

    // Trouver le parrain par son code
    const q = query(collection(db, 'users'), where('referralCode', '==', code), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const parrainDoc = snap.docs[0];
    const parrain     = parrainDoc.data();
    const parrainUid  = parrainDoc.id;
    if (parrainUid === newUserId) return; // pas d'auto-parrainage

    // Config parrainage — config/app (mobile), repli sur parametres/config
    let creditParReferral = 1, creditPremiumMultiplier = 2, milestoneReferrals = 5,
        milestoneBoostJours = 7, featureDoubleReferral = true;
    try {
      const cfgSnap = await getDoc(doc(db, 'config', 'app'));
      const c = cfgSnap.data() || {};
      creditParReferral       = c.creditParReferral ?? 1;
      creditPremiumMultiplier = c.creditPremiumMultiplier ?? 2;
      milestoneReferrals      = c.milestoneReferrals ?? milestoneReferrals;
      milestoneBoostJours     = c.milestoneBoostDays ?? 7;
      featureDoubleReferral   = c.feature_premium_double_referral ?? true;
    } catch (_) { /* defaults ci-dessus */ }

    const isParrainPremium = parrain.plan === 'premium';
    const applyDouble      = isParrainPremium && featureDoubleReferral;
    const creditAGagner    = applyDouble ? creditParReferral * creditPremiumMultiplier : creditParReferral;

    const newCount    = (parrain.referralCount || 0) + 1;
    const isMilestone = newCount % milestoneReferrals === 0;

    // 1. Lier le filleul à son parrain (UID, jamais le code saisi)
    await updateDoc(doc(db, 'users', newUserId), { referredBy: parrainUid });

    // 2. Créditer le parrain : compteur + crédits (+ jours de boost en attente si palier)
    const parrainUpdate = {
      referralCount:    increment(1),
      creditParrainage: increment(creditAGagner),
    };
    if (isMilestone) {
      parrainUpdate.milestoneBoostEnAttente = increment(milestoneBoostJours);
    }
    await updateDoc(doc(db, 'users', parrainUid), parrainUpdate);

    // 3. Notifier le parrain — même collection que mobile (users/{uid}/user_notifications)
    const bonusLabel = applyDouble ? ` (×${creditPremiumMultiplier} Premium !)` : '';
    await addDoc(collection(db, 'users', parrainUid, 'user_notifications'), {
      title: 'Nouveau parrainage ! 🎉',
      body: `Un artisan vient de rejoindre AZÔTCHÉ grâce à vous. Vous gagnez ${creditAGagner} crédit${creditAGagner > 1 ? 's' : ''}${bonusLabel} !`,
      date: serverTimestamp(),
      read: false,
      type: 'referral',
      credit: creditAGagner,
    }).catch(() => {});

    if (isMilestone) {
      await addDoc(collection(db, 'users', parrainUid, 'user_notifications'), {
        title: `🏆 Palier ${newCount} parrainages atteint !`,
        body: `Félicitations ! Vous gagnez ${milestoneBoostJours} jours de Boost offerts. Contactez-nous pour l'activer.`,
        date: serverTimestamp(),
        read: false,
        type: 'referral_milestone',
        boostJours: milestoneBoostJours,
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Erreur applyReferral:', e);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loadProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setProfile(data);
        return data;
      }
      setProfile(null);
      return null;
    } catch (e) {
      console.error('Erreur chargement profil:', e);
      setProfile(null);
      return null;
    }
  };

  /**
   * Verifie si un profil existe et retourne son role.
   * Retourne { exists: bool, role: string|null }
   */
  const checkProfileExists = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return { exists: true, role: snap.data().role || null };
      }
      return { exists: false, role: null };
    } catch {
      return { exists: false, role: null };
    }
  };

  /**
   * Inscrit un nouvel ARTISAN.
   * Cree users/{uid} + pros/{uid} conformement au modele Flutter.
   */
  const registerArtisan = async (data, photoFile = null) => {
    if (!auth.currentUser) return { success: false, error: 'Non authentifie.' };
    const uid = auth.currentUser.uid;
    try {
      let photoUrl = '';
      if (photoFile) {
        const pRef = storageRef(storage, `profiles/${uid}/photo_profil`);
        const snap = await uploadBytes(pRef, photoFile);
        photoUrl = await getDownloadURL(snap.ref);
      }

      const now         = serverTimestamp();
      const phoneNumber = auth.currentUser.phoneNumber || '';
      const referralCode = genReferralCode(data.nom, uid);

      // Document users/{uid}
      const userDoc = {
        uid,
        phoneNumber,
        role:              'pro',
        nom:               data.nom || '',
        metierPrincipal:   data.metierPrincipal || '',
        metiersSecondaires: data.metiersSecondaires || [],
        siteWeb:           data.siteWeb || '',
        ville:             data.ville || '',
        adresse:           data.adresse || '',
        photoUrl,
        statut:            'actif',
        plan:              'gratuit',
        comptePayant:      false,
        referralCode,
        referralCount:     0,
        creditParrainage:  0,
        isVerifiedProfile: false,
        verificationEnCours: false,
        verificationAttempts: 0,
        isDiplome:         data.isDiplome || false,
        anneeDiplome:      data.isDiplome ? (Number(data.anneeDiplome) || null) : null,
        dateInscription:   now,
        categorie:         data.categorie || '',
      };

      // Document pros/{uid}
      const proDoc = {
        description:        data.description || '',
        galerie:            [],
        nombreVues:         0,
        nombreClicsAppel:   0,
        nombreClicsWhatsApp: 0,
        noteMoyenne:        0.0,
        nombreAvis:         0,
        boostActif:         false,
        finBoost:           null,
        qrCodeUrl:          null,
        categorie:          data.categorie || '',
        sousMetiers:        data.metiersSecondaires || [],
        horaires:           null,
        ouvertMaintenant:   true,
      };

      await setDoc(doc(db, 'users', uid), userDoc);
      await setDoc(doc(db, 'pros',  uid), proDoc);

      // Appliquer le parrainage si un code a été saisi — résout le code vers
      // l'UID du parrain et le crédite (referredBy n'est JAMAIS le code brut).
      if (data.referredBy && data.referredBy.trim()) {
        await applyReferral({ referralCode: data.referredBy, newUserId: uid });
      }

      await loadProfile(uid);
      return { success: true };
    } catch (e) {
      console.error('Erreur registerArtisan:', e);
      return { success: false, error: e.message };
    }
  };

  /**
   * Inscrit un nouveau CLIENT.
   * Cree uniquement users/{uid} avec role:'client'.
   */
  const registerClient = async (data) => {
    if (!auth.currentUser) return { success: false, error: 'Non authentifie.' };
    const uid = auth.currentUser.uid;
    try {
      const now         = serverTimestamp();
      const phoneNumber = auth.currentUser.phoneNumber || '';
      const referralCode = genClientReferralCode(uid);

      const userDoc = {
        uid,
        phoneNumber,
        role:              'client',
        nom:               data.nom || '',
        ville:             data.ville || '',
        metierPrincipal:   '',
        metiersSecondaires: [],
        statut:            'actif',
        plan:              'gratuit',
        comptePayant:      false,
        referralCode,
        referralCount:     0,
        creditParrainage:  0,
        isVerifiedProfile: false,
        verificationEnCours: false,
        dateInscription:   now,
      };

      await setDoc(doc(db, 'users', uid), userDoc);

      // Appliquer le parrainage si un code a été saisi — résout le code vers
      // l'UID du parrain et le crédite (referredBy n'est JAMAIS le code brut).
      if (data.referredBy && data.referredBy.trim()) {
        await applyReferral({ referralCode: data.referredBy, newUserId: uid });
      }

      await loadProfile(uid);
      return { success: true };
    } catch (e) {
      console.error('Erreur registerClient:', e);
      return { success: false, error: e.message };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const refreshProfile = () => user && loadProfile(user.uid);

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      registerArtisan, registerClient,
      checkProfileExists, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
