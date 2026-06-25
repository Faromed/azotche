import { useState, useCallback } from 'react';
import {
  collection, query, where, limit, getDocs,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Schéma aligné strictement sur le modèle mobile (lib/models/avis_model.dart) :
//   proUid (et non artisanUid), date (et non dateCreation),
//   statut: 'approved' | 'pending' | 'rejected' (et non 'actif').
// Compatibilité de lecture : les avis déjà créés par le web avant cet
// alignement utilisaient artisanUid/dateCreation/statut:'actif'. On les
// fusionne au passage (même principe défensif que normalizePhotos()/isFlutter
// dans usePublications.js) pour ne perdre aucun avis déjà publié par un client.
// ─────────────────────────────────────────────────────────────────────────────

function isAvisVisible(a) {
  // Pas de statut du tout = ancien doc jamais modéré → visible (comportement historique).
  if (!a.statut) return true;
  return a.statut === 'approved' || a.statut === 'actif';
}

function getAvisDate(a) {
  const v = a.date || a.dateCreation;
  return v?.toMillis?.() ?? 0;
}

/** Charge les avis d'un artisan en fusionnant nouveau champ (proUid) et ancien (artisanUid). */
async function fetchAvisBothSchemas(proUid, { max } = {}) {
  const newQ = max
    ? query(collection(db, 'avis'), where('proUid', '==', proUid), limit(max))
    : query(collection(db, 'avis'), where('proUid', '==', proUid));
  const legacyQ = max
    ? query(collection(db, 'avis'), where('artisanUid', '==', proUid), limit(max))
    : query(collection(db, 'avis'), where('artisanUid', '==', proUid));

  const [snapNew, snapLegacy] = await Promise.all([getDocs(newQ), getDocs(legacyQ)]);
  const byId = new Map();
  [...snapNew.docs, ...snapLegacy.docs].forEach(d => byId.set(d.id, { id: d.id, ...d.data() }));
  return Array.from(byId.values());
}

// ── Soumettre un avis ─────────────────────────────────────────────────────────
export function useSubmitAvis() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  const submitAvis = async ({ proUid, clientUid, clientNom, clientPhotoUrl, note, commentaire }) => {
    if (!proUid || !clientUid) return { success: false, error: 'Parametres manquants.' };
    if (!note || note < 1 || note > 5) return { success: false, error: 'Note invalide.' };
    if (!commentaire?.trim()) return { success: false, error: 'Le commentaire est obligatoire.' };

    setSubmitting(true);
    setError(null);

    try {
      // Verifier si l'utilisateur a deja note cet artisan (nouveau + ancien schema)
      const existing = await checkAvisExistant(proUid, clientUid);
      if (existing) {
        setError('Vous avez deja laisse un avis pour cet artisan.');
        return { success: false, error: 'deja_note' };
      }

      // Creer l'avis — schema mobile strict (proUid, date, statut: 'approved')
      const avisRef = await addDoc(collection(db, 'avis'), {
        proUid,
        clientUid,
        clientNom: clientNom || 'Client',
        clientPhotoUrl: clientPhotoUrl || '',
        note,
        commentaire: commentaire.trim(),
        statut: 'approved',
        date: serverTimestamp(),
      });

      // Mettre a jour la moyenne sur le profil de l'artisan (collection pros, jamais users)
      await recalculerMoyenne(proUid);

      return { success: true, id: avisRef.id };
    } catch (e) {
      console.error('submitAvis:', e);
      const msg = 'Impossible de soumettre votre avis.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, error, setError, submitAvis };
}

// ── Modifier un avis existant ─────────────────────────────────────────────────
export function useEditAvis() {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const editAvis = async (avisId, proUid, { note, commentaire }) => {
    if (!note || note < 1 || note > 5) return { success: false };
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'avis', avisId), {
        note,
        commentaire: commentaire?.trim() || '',
        updatedAt: serverTimestamp(),
      });
      await recalculerMoyenne(proUid);
      return { success: true };
    } catch (e) {
      console.error('editAvis:', e);
      setError('Impossible de modifier votre avis.');
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  return { saving, error, setError, editAvis };
}

// ── Supprimer un avis ─────────────────────────────────────────────────────────
export async function deleteAvis(avisId, proUid) {
  try {
    await deleteDoc(doc(db, 'avis', avisId));
    await recalculerMoyenne(proUid);
    return { success: true };
  } catch (e) {
    console.error('deleteAvis:', e);
    return { success: false };
  }
}

// ── Verifier si l'utilisateur a deja note (nouveau + ancien schema) ─────────
export async function checkAvisExistant(proUid, clientUid) {
  if (!proUid || !clientUid) return null;
  try {
    const liste = await fetchAvisBothSchemas(proUid, { max: 50 });
    const mien = liste.find(a => a.clientUid === clientUid);
    return mien || null;
  } catch (e) {
    console.error('checkAvisExistant:', e);
    return null;
  }
}

// ── Charger les avis d'un artisan (onglet Avis du tableau de bord pro) ──────
// NOTE: pas d'orderBy ni de where statut → évite les index composites Firestore.
// Filtrage statut + tri par date côté client.
export function useAvisArtisan(proUid) {
  const [avis, setAvis]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const PAGE = 20;

  const loadAvis = useCallback(async () => {
    if (!proUid) return;
    setLoading(true);
    try {
      const liste = await fetchAvisBothSchemas(proUid, { max: PAGE });
      const sorted = liste
        .filter(isAvisVisible)
        .sort((a, b) => getAvisDate(b) - getAvisDate(a));
      setAvis(sorted);
      setHasMore(liste.length === PAGE);
    } catch (e) {
      console.error('loadAvis:', e);
    }
    setLoading(false);
  }, [proUid]);

  return { avis, loading, hasMore, loadAvis, setAvis };
}

// ── Interne : recalculer la moyenne d'un artisan ──────────────────────────────
// SÉCURITÉ/COHÉRENCE : la moyenne vit sur pros/{uid}, exactement comme le
// mobile (pro_detail_screen.dart → _updateNoteMoyenne). Écrire sur users/{uid}
// échouait silencieusement (la règle isAvisRatingUpdate() n'est rattachée
// qu'au bloc match /pros/{proId} dans firestore.rules) et serait de toute
// façon restée invisible au mobile, qui lit uniquement pros/{uid}.
async function recalculerMoyenne(proUid) {
  try {
    const liste = await fetchAvisBothSchemas(proUid);
    const notes = liste
      .filter(isAvisVisible)
      .map(a => a.note)
      .filter(n => n >= 1 && n <= 5);
    const count = notes.length;
    const moyenne = count > 0 ? notes.reduce((a, b) => a + b, 0) / count : 0;

    await updateDoc(doc(db, 'pros', proUid), {
      noteMoyenne: Math.round(moyenne * 10) / 10,
      nombreAvis: count,
    });
  } catch (e) {
    console.error('recalculerMoyenne:', e);
  }
}
