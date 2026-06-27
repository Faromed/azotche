import { useState, useCallback, useRef } from 'react';
import {
  collection, query, where,
  getDocs, doc, getDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

/**
 * Fusionne un doc users + un doc pros en un objet artisan unifié.
 */
function mergeArtisan(userDoc, proData = {}) {
  const u = userDoc;
  const p = proData;
  return {
    uid:               u.id,
    nom:               u.nom || '',
    phoneNumber:       u.phoneNumber || '',
    metierPrincipal:   u.metierPrincipal || '',
    metiersSecondaires: u.metiersSecondaires || [],
    ville:             u.ville || '',
    quartier:          u.quartier || '',
    adresse:           u.adresse || '',
    photoUrl:          u.photoUrl || '',
    plan:              u.plan || 'gratuit',
    comptePayant:      u.comptePayant || false,
    isVerifiedProfile: u.isVerifiedProfile || false,
    isCertified:       (u.isVerifiedProfile && u.statut === 'actif') || false,
    badge:             u.badge || null,
    statut:            u.statut || 'actif',
    phoneCall:         u.phoneCall || u.phoneNumber || '',
    phoneWhatsapp:     u.phoneWhatsapp || u.phoneNumber || '',
    localisation:      u.localisation || null,
    anneesExperience:  u.anneesExperience || null,
    dateInscription:   u.dateInscription || null,
    // Données pros
    description:       p.description || '',
    galerie:           p.galerie || [],
    noteMoyenne:       p.noteMoyenne || 0,
    nombreAvis:        p.nombreAvis || 0,
    nombreVues:        p.nombreVues || 0,
    boostActif:        p.boostActif || false,
    boostExpire:       p.boostExpire || null,
    categorie:         p.categorie || '',
    scorePopularite:   p.scorePopularite || 0,
    totalContacts:     p.totalContacts || 0,
  };
}

/** Tri identique à l'app Flutter */
function sortArtisans(list) {
  return [...list].sort((a, b) => {
    if (a.boostActif && !b.boostActif) return -1;
    if (!a.boostActif && b.boostActif) return 1;
    if (a.isCertified && !b.isCertified) return -1;
    if (!a.isCertified && b.isCertified) return 1;
    const planRank = (art) => {
      if (art.plan === 'premium' || art.comptePayant) return 3;
      if (art.plan === 'pro') return 2;
      return 1;
    };
    const pr = planRank(b) - planRank(a);
    if (pr !== 0) return pr;
    return b.scorePopularite - a.scorePopularite;
  });
}

const PAGE_STEP = 24; // nombre de cartes révélées à chaque scroll

export function useArtisans() {
  const [allArtisans, setAllArtisans] = useState([]); // dataset complet en mémoire
  const [displayCount, setDisplayCount] = useState(PAGE_STEP);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  // ── Recherche serveur (100% Firebase, sur TOUTE la base) ──
  // Miroir exact de SearchService (mobile) : la Cloud Function `searchArtisans`
  // renvoie uniquement {uid, score} triés par pertinence ; on "hydrate" ensuite
  // chaque uid en document complet via Firestore, en conservant l'ordre serveur.
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [searchError, setSearchError]     = useState(null);
  const [searchTotal, setSearchTotal]     = useState(0);
  const searchTokenRef = useRef(0);

  /**
   * Charge TOUS les artisans actifs en une seule requête Firestore.
   * — Pas de orderBy → aucun artisan exclu pour champ manquant
   * — Pas de limit  → tous les artisans sont disponibles pour la recherche
   * La pagination se fait ensuite en mémoire via displayCount.
   */
  const loadArtisans = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDisplayCount(PAGE_STEP);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'pro'),
        where('statut', '==', 'actif'),
      );
      const snap = await getDocs(q);
      const userDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const merged = await fetchAndMerge(userDocs);
      setAllArtisans(sortArtisans(merged));
    } catch (e) {
      console.error('Erreur chargement artisans:', e);
      setError('Impossible de charger les artisans. Vérifiez votre connexion.');
    }
    setLoading(false);
  }, []);

  /** Révèle la page suivante depuis la mémoire (pas de requête Firestore) */
  const loadMore = useCallback(() => {
    setDisplayCount(c => c + PAGE_STEP);
  }, []);

  /**
   * Recherche server-side sur TOUTE la base via la Cloud Function `searchArtisans`
   * (même fonction que l'app mobile — voir functions/src/search/searchArtisans.ts).
   * Un jeton incrémental ignore les réponses devenues obsolètes (recherche
   * suivante lancée avant que la précédente n'ait répondu).
   */
  const searchArtisansServer = useCallback(async (params = {}) => {
    const token = ++searchTokenRef.current;
    setSearching(true);
    setSearchError(null);
    try {
      const callable = httpsCallable(functions, 'searchArtisans');
      const response = await callable({
        requete: params.requete || '',
        type: params.type || 'general',
        ...(params.categorie ? { categorie: params.categorie } : {}),
        ...(params.ville ? { ville: params.ville } : {}),
        certifieSeulement: !!params.certifieSeulement,
        boostSeulement: !!params.boostSeulement,
        ...(params.noteMin > 0 ? { noteMin: params.noteMin } : {}),
        limite: params.limite || 60,
      });

      if (token !== searchTokenRef.current) return; // réponse obsolète

      const data = response.data || {};
      const rawResults = Array.isArray(data.results) ? data.results : [];
      const uids = rawResults.map(r => r?.uid).filter(Boolean);

      const hydrated = await hydrateByUids(uids);
      if (token !== searchTokenRef.current) return; // obsolète après l'hydratation

      setSearchResults(hydrated);
      setSearchTotal(typeof data.total === 'number' ? data.total : hydrated.length);
    } catch (e) {
      if (token !== searchTokenRef.current) return;
      console.error('Erreur recherche serveur:', e);
      setSearchResults([]);
      setSearchTotal(0);
      setSearchError('Recherche momentanément indisponible. Vérifiez votre connexion et réessayez.');
    } finally {
      if (token === searchTokenRef.current) setSearching(false);
    }
  }, []);

  /** Réinitialise l'état de recherche (retour à l'affichage local paginé). */
  const clearSearch = useCallback(() => {
    searchTokenRef.current++; // invalide toute recherche en cours
    setSearchResults([]);
    setSearching(false);
    setSearchError(null);
    setSearchTotal(0);
  }, []);

  return {
    allArtisans,
    displayCount,
    loading,
    error,
    loadArtisans,
    loadMore,
    // Recherche serveur
    searchResults,
    searching,
    searchError,
    searchTotal,
    searchArtisansServer,
    clearSearch,
  };
}

/** Charge un artisan par UID */
export async function fetchArtisanByUid(uid) {
  const [userSnap, proSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'pros', uid)),
  ]);
  if (!userSnap.exists()) return null;
  const userDoc = { id: userSnap.id, ...userSnap.data() };
  const proData = proSnap.exists() ? proSnap.data() : {};
  return mergeArtisan(userDoc, proData);
}

/**
 * Charge les avis d'un artisan.
 * Fusionne le schéma mobile strict (proUid/date) avec l'ancien schéma web
 * (artisanUid/dateCreation) pour ne pas faire disparaître les avis déjà
 * déposés avant l'alignement des deux plateformes — voir useAvis.js.
 */
export async function fetchAvisForArtisan(uid) {
  try {
    const { limit } = await import('firebase/firestore');
    const [snapNew, snapLegacy] = await Promise.all([
      getDocs(query(collection(db, 'avis'), where('proUid', '==', uid), limit(10))),
      getDocs(query(collection(db, 'avis'), where('artisanUid', '==', uid), limit(10))),
    ]);
    const byId = new Map();
    [...snapNew.docs, ...snapLegacy.docs].forEach(d => byId.set(d.id, { id: d.id, ...d.data() }));
    const getTs = (a) => (a.date || a.dateCreation)?.toMillis?.() ?? 0;
    return Array.from(byId.values())
      .filter(a => !a.statut || a.statut === 'approved' || a.statut === 'actif')
      .sort((a, b) => getTs(b) - getTs(a))
      .slice(0, 10);
  } catch (e) {
    console.error('Erreur avis:', e);
    return [];
  }
}

// ── Helpers internes ──────────────────────────────────────────────────────────

async function fetchAndMerge(userDocs) {
  if (userDocs.length === 0) return [];
  const proSnaps = await Promise.all(
    userDocs.map(u => getDoc(doc(db, 'pros', u.id)).catch(() => null))
  );
  return userDocs.map((u, i) => {
    const proData = proSnaps[i]?.exists() ? proSnaps[i].data() : {};
    return mergeArtisan(u, proData);
  });
}

/**
 * Récupère les documents users/{uid} + pros/{uid} pour chaque uid renvoyé par
 * la Cloud Function searchArtisans, EN CONSERVANT L'ORDRE DE PERTINENCE
 * déterminé côté serveur — miroir exact de SearchService._hydrate (mobile).
 */
async function hydrateByUids(uids) {
  if (!uids || uids.length === 0) return [];

  const settled = await Promise.all(
    uids.map(async (uid) => {
      try {
        const [userSnap, proSnap] = await Promise.all([
          getDoc(doc(db, 'users', uid)),
          getDoc(doc(db, 'pros', uid)),
        ]);
        if (!userSnap.exists()) return null;
        const userDoc = { id: userSnap.id, ...userSnap.data() };
        const proData = proSnap.exists() ? proSnap.data() : {};
        return mergeArtisan(userDoc, proData);
      } catch {
        return null; // doc supprimé entre-temps ou erreur réseau ponctuelle
      }
    })
  );

  const byUid = new Map();
  settled.forEach(a => { if (a) byUid.set(a.uid, a); });

  // Reconstituer la liste dans l'ordre exact renvoyé par le serveur.
  return uids.map(uid => byUid.get(uid)).filter(Boolean);
}
