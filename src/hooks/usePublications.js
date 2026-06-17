import { useState, useCallback, useRef } from 'react';
import {
  collection, query, where, limit, startAfter,
  getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

const PAGE_SIZE = 12;

// ── Tri client-side : supporte les champs Flutter (datePublication) et web (dateCreation) ──
function sortByDate(arr) {
  return [...arr].sort((a, b) => {
    const getTs = (d) => {
      // Flutter publie avec 'datePublication', le web utilise 'date' ou 'dateCreation'
      const v = d.datePublication || d.date || d.dateCreation || d.updatedAt;
      if (!v) return 0;
      if (v?.toMillis) return v.toMillis();
      if (v instanceof Date) return v.getTime();
      return 0;
    };
    return getTs(b) - getTs(a);
  });
}

// ── Fetch feed public (toutes publications — Flutter n'a PAS de champ 'statut') ─
// NOTE: pas d'orderBy Firestore → évite l'index composite manquant.
// Le tri se fait côté client. On accepte les deux formats : Flutter ET web.
export function usePublicationsFeed() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMore, setHasMore]           = useState(true);
  const [error, setError]               = useState(null);
  const lastDocRef = useRef(null);

  const loadPublications = useCallback(async () => {
    setLoading(true);
    setError(null);
    lastDocRef.current = null;

    try {
      // Pas de filtre 'statut' — les publications Flutter n'ont pas ce champ
      const q = query(
        collection(db, 'publications'),
        limit(PAGE_SIZE * 2), // large batch pour compenser l'absence de filtre serveur
      );
      const snap = await getDocs(q);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Côté client : exclure seulement les publications explicitement désactivées (web)
      const visible = all.filter(p => !p.statut || p.statut === 'actif');
      setHasMore(snap.docs.length === PAGE_SIZE * 2);
      setPublications(sortByDate(visible));
    } catch (e) {
      console.error('loadPublications:', e);
      setError('Impossible de charger les publications.');
    }
    setLoading(false);
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'publications'),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE * 2),
      );
      const snap = await getDocs(q);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const visible = all.filter(p => !p.statut || p.statut === 'actif');
      setHasMore(snap.docs.length === PAGE_SIZE * 2);
      setPublications(prev =>
        sortByDate([...prev, ...visible])
      );
    } catch (e) {
      console.error('loadMore:', e);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore]);

  return { publications, loading, loadingMore, hasMore, error, loadPublications, loadMore };
}

// ── Fetch publications d'un artisan (espace pro) ──────────────────────────────
export async function fetchProPublications(proUid) {
  try {
    const q = query(
      collection(db, 'publications'),
      where('proUid', '==', proUid),
    );
    const snap = await getDocs(q);
    return sortByDate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.error('fetchProPublications:', e);
    return [];
  }
}

// ── Fetch une publication par ID ──────────────────────────────────────────────
export async function fetchPublicationById(id) {
  try {
    const snap = await getDoc(doc(db, 'publications', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (e) {
    console.error('fetchPublicationById:', e);
    return null;
  }
}

// ── CRUD complet pour l'espace pro ────────────────────────────────────────────
export function usePublicationCrud(proUid) {
  const [saving, setSaving]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState(null);

  // Créer une nouvelle publication
  const createPublication = async (data) => {
    setSaving(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'publications'), {
        ...data,
        proUid,
        statut: 'actif',
        nombreVues: 0,
        nombreContacts: 0,
        date: serverTimestamp(),          // champ attendu par l'app Flutter (orderBy 'date')
        dateCreation: serverTimestamp(),  // alias compat web
        updatedAt: serverTimestamp(),
      });
      return { success: true, id: docRef.id };
    } catch (e) {
      console.error('createPublication:', e);
      setError('Impossible de créer la publication.');
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  // Modifier une publication
  const updatePublication = async (id, data) => {
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'publications', id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (e) {
      console.error('updatePublication:', e);
      setError('Impossible de modifier la publication.');
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  // Activer / désactiver
  const togglePublication = async (id, currentStatut) => {
    const newStatut = currentStatut === 'actif' ? 'inactif' : 'actif';
    return updatePublication(id, { statut: newStatut });
  };

  // Supprimer
  const deletePublication = async (id, photos = []) => {
    setSaving(true);
    setError(null);
    try {
      // Supprimer les photos du Storage
      for (const url of photos) {
        if (url.includes('firebasestorage.googleapis.com')) {
          try { await deleteObject(ref(storage, url)); } catch (_) {}
        }
      }
      await deleteDoc(doc(db, 'publications', id));
      return { success: true };
    } catch (e) {
      console.error('deletePublication:', e);
      setError('Impossible de supprimer.');
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  // Upload photo pour une publication
  const uploadPublicationPhoto = async (file) => {
    if (!file) return { success: false };
    if (!file.type.startsWith('image/')) return { success: false, error: 'Image requise.' };
    if (file.size > 8 * 1024 * 1024) return { success: false, error: 'Max 8 Mo.' };

    setSaving(true);
    setProgress(0);
    try {
      const ts  = Date.now();
      const ext = file.name.split('.').pop().toLowerCase();
      const storageRef = ref(storage, `publications/${proUid}/${ts}.${ext}`);
      const url = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
        task.on('state_changed',
          s => setProgress(Math.round(s.bytesTransferred / s.totalBytes * 100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
      });
      return { success: true, url };
    } catch (e) {
      setError("Erreur upload photo.");
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  return {
    saving, progress, error, setError,
    createPublication, updatePublication, togglePublication,
    deletePublication, uploadPublicationPhoto,
  };
}
