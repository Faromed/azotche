import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { genReferralCode, genClientReferralCode } from '../config/metiers';

const AuthContext = createContext(null);

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

      // Appliquer le parrainage si code saisi
      if (data.referredBy && data.referredBy.trim()) {
        userDoc.referredBy = data.referredBy.trim().toUpperCase();
      }

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

      if (data.referredBy && data.referredBy.trim()) {
        userDoc.referredBy = data.referredBy.trim().toUpperCase();
      }

      await setDoc(doc(db, 'users', uid), userDoc);
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
