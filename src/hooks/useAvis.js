import { useState, useCallback } from 'react';
import {
  collection, query, where, limit, getDocs,
  addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Soumettre un avis ─────────────────────────────────────────────────────────
export function useSubmitAvis() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  const submitAvis = async ({ artisanUid, clientUid, clientNom, clientPhotoUrl, note, commentaire }) => {
    if (!artisanUid || !clientUid) return { success: false, error: 'Parametres manquants.' };
    if (!note || note < 1 || note > 5) return { success: false, error: 'Note invalide.' };
    if (!commentaire?.trim()) return { success: false, error: 'Le commentaire est obligatoire.' };

    setSubmitting(true);
    setError(null);

    try {
      // Verifier si l'utilisateur a deja note cet artisan
      const existingQ = query(
        collection(db, 'avis'),
        where('artisanUid', '==', artisanUid),
        where('clientUid', '==', clientUid),
        limit(1),
      );
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        setError('Vous avez deja laisse un avis pour cet artisan.');
        return { success: false, error: 'deja_note' };
      }

      // Creer l'avis
      const avisRef = await addDoc(collection(db, 'avis'), {
        artisanUid,
        clientUid,
        clientNom: clientNom || 'Client',
        clientPhotoUrl: clientPhotoUrl || '',
        note,
        commentaire: commentaire.trim(),
        statut: 'actif',
        dateCreation: serverTimestamp(),
      });

      // Mettre a jour la moyenne sur le profil de l'artisan
      await recalculerMoyenne(artisanUid);

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

  const editAvis = async (avisId, artisanUid, { note, commentaire }) => {
    if (!note || note < 1 || note > 5) return { success: false };
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'avis', avisId), {
        note,
        commentaire: commentaire?.trim() || '',
        updatedAt: serverTimestamp(),
      });
      await recalculerMoyenne(artisanUid);
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
export async function deleteAvis(avisId, artisanUid) {
  try {
    await deleteDoc(doc(db, 'avis', avisId));
    await recalculerMoyenne(artisanUid);
    return { success: true };
  } catch (e) {
    console.error('deleteAvis:', e);
    return { success: false };
  }
}

// ── Verifier si l'utilisateur a deja note ────────────────────────────────────
export async function checkAvisExistant(artisanUid, clientUid) {
  if (!artisanUid || !clientUid) return null;
  try {
    const q = query(
      collection(db, 'avis'),
      where('artisanUid', '==', artisanUid),
      where('clientUid', '==', clientUid),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (e) {
    console.error('checkAvisExistant:', e);
    return null;
  }
}

// ── Charger les avis d'un artisan ────────────────────────────────────────────
// NOTE: pas d'orderBy ni de where statut → évite les index composites Firestore.
// Filtrage statut + tri par date côté client.
export function useAvisArtisan(artisanUid) {
  const [avis, setAvis]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const PAGE = 20;

  const loadAvis = useCallback(async () => {
    if (!artisanUid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'avis'),
        where('artisanUid', '==', artisanUid),
        limit(PAGE),
      );
      const snap = await getDocs(q);
      const getTs = (d) => {
        const v = d.dateCreation || d.date;
        return v?.toMillis?.() ?? 0;
      };
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => !a.statut || a.statut === 'actif')
        .sort((a, b) => getTs(b) - getTs(a));
      setAvis(sorted);
      setHasMore(snap.docs.length === PAGE);
    } catch (e) {
      console.error('loadAvis:', e);
    }
    setLoading(false);
  }, [artisanUid]);

  return { avis, loading, hasMore, loadAvis, setAvis };
}

// ── Interne : recalculer la moyenne d'un artisan ──────────────────────────────
async function recalculerMoyenne(artisanUid) {
  try {
    const q = query(
      collection(db, 'avis'),
      where('artisanUid', '==', artisanUid),
      where('statut', '==', 'actif'),
    );
    const snap = await getDocs(q);
    const notes = snap.docs.map(d => d.data().note).filter(n => n >= 1 && n <= 5);
    const count = notes.length;
    const moyenne = count > 0 ? notes.reduce((a, b) => a + b, 0) / count : 0;

    await updateDoc(doc(db, 'users', artisanUid), {
      noteMoyenne: Math.round(moyenne * 10) / 10,
      nombreAvis: count,
    });
  } catch (e) {
    console.error('recalculerMoyenne:', e);
  }
}
