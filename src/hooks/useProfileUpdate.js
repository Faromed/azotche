import { useState } from 'react';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

/**
 * Hook pour mettre à jour le profil d'un artisan.
 * Gère : users/{uid}, pros/{uid}, upload photo + galerie vers Storage.
 */
export function useProfileUpdate(uid) {
  const [saving, setSaving]     = useState(false);
  const [progress, setProgress] = useState(0); // upload progress 0–100
  const [error, setError]       = useState(null);

  // ── Sauvegarde des infos de base (users doc) ──────────────────────────────
  const saveUserInfo = async (data) => {
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (e) {
      console.error('saveUserInfo:', e);
      setError("Impossible de sauvegarder. Vérifiez votre connexion.");
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  };

  // ── Sauvegarde des infos pro (pros doc) ───────────────────────────────────
  const saveProInfo = async (data) => {
    setSaving(true);
    setError(null);
    try {
      const proRef = doc(db, 'pros', uid);
      await setDoc(proRef, {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { success: true };
    } catch (e) {
      console.error('saveProInfo:', e);
      setError("Impossible de sauvegarder les infos pro.");
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  };

  // ── Upload photo de profil ─────────────────────────────────────────────────
  const uploadProfilePhoto = async (file) => {
    if (!file) return { success: false };
    setSaving(true);
    setError(null);
    setProgress(0);

    try {
      // Valider le fichier
      if (!file.type.startsWith('image/')) {
        throw new Error('Veuillez sélectionner une image (JPG, PNG, WEBP).');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image trop lourde (max 5 Mo).');
      }

      const ext = file.name.split('.').pop().toLowerCase();
      const storageRef = ref(storage, `profiles/${uid}/photo.${ext}`);

      // Upload avec suivi de progression
      const downloadUrl = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file, {
          contentType: file.type,
        });
        task.on(
          'state_changed',
          snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
      });

      // Enregistrer l'URL dans Firestore
      await updateDoc(doc(db, 'users', uid), {
        photoUrl: downloadUrl,
        updatedAt: serverTimestamp(),
      });

      setProgress(100);
      return { success: true, url: downloadUrl };
    } catch (e) {
      console.error('uploadProfilePhoto:', e);
      setError(e.message || "Erreur lors de l'upload de la photo.");
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  };

  // ── Upload image galerie ───────────────────────────────────────────────────
  const uploadGalleryImage = async (file, currentGallery = []) => {
    if (!file) return { success: false };
    if (currentGallery.length >= 10) {
      setError('Maximum 10 photos dans la galerie.');
      return { success: false };
    }
    setSaving(true);
    setError(null);
    setProgress(0);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Veuillez sélectionner une image.');
      }
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('Image trop lourde (max 8 Mo).');
      }

      const ts  = Date.now();
      const ext = file.name.split('.').pop().toLowerCase();
      const storageRef = ref(storage, `profiles/${uid}/gallery/${ts}.${ext}`);

      const downloadUrl = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
        task.on(
          'state_changed',
          snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
      });

      const newGallery = [...currentGallery, downloadUrl];
      await setDoc(doc(db, 'pros', uid), {
        galerie: newGallery,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setProgress(100);
      return { success: true, url: downloadUrl, gallery: newGallery };
    } catch (e) {
      console.error('uploadGalleryImage:', e);
      setError(e.message || "Erreur lors de l'upload.");
      return { success: false, error: e.message };
    } finally {
      setSaving(false);
    }
  };

  // ── Supprimer image galerie ────────────────────────────────────────────────
  const deleteGalleryImage = async (url, currentGallery = []) => {
    setSaving(true);
    setError(null);
    try {
      // Supprimer du Storage si c'est bien notre bucket
      if (url.includes('firebasestorage.googleapis.com')) {
        try {
          const storageRef = ref(storage, url);
          await deleteObject(storageRef);
        } catch (_) {
          // Ignorer si le fichier n'existe plus
        }
      }
      const newGallery = currentGallery.filter(u => u !== url);
      await setDoc(doc(db, 'pros', uid), {
        galerie: newGallery,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { success: true, gallery: newGallery };
    } catch (e) {
      console.error('deleteGalleryImage:', e);
      setError("Impossible de supprimer l'image.");
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    progress,
    error,
    setError,
    saveUserInfo,
    saveProInfo,
    uploadProfilePhoto,
    uploadGalleryImage,
    deleteGalleryImage,
  };
}
