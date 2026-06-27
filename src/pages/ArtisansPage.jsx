import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiSearch, FiMapPin, FiStar, FiX, FiChevronDown,
  FiLoader, FiAward, FiZap, FiGrid, FiMap,
  FiNavigation, FiBriefcase, FiFilter, FiWifiOff,
} from 'react-icons/fi';
import { useArtisans } from '../hooks/useArtisans';
import usePageMeta from '../hooks/usePageMeta';
import { TYPES_RECHERCHE, hintForType } from '../config/searchTypes';

// Délai de debounce avant de lancer la recherche serveur après une frappe
// texte (évite un appel réseau à chaque caractère). Les actions délibérées
// (chip catégorie/ville, changement de type de recherche) restent immédiates
// — voir l'effet de recherche ci-dessous, miroir de SearchScreen (mobile).
const SEARCH_DEBOUNCE_MS = 450;

// ── Haversine ─────────────────────────────────────────────────────────────────
const VILLE_CENTERS = {
  'cotonou': [6.3654, 2.4183], 'porto-novo': [6.4969, 2.6289],
  'parakou': [9.337, 2.6283], 'abomey-calavi': [6.45, 2.3556],
  'djougou': [9.708, 1.6634], 'bohicon': [7.1791, 2.0665],
  'ouidah': [6.3618, 2.0836], 'lokossa': [6.64, 1.7167],
  'abomey': [7.1833, 1.9833], 'save': [8.0333, 2.4833],
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dL / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getArtisanCoords(a) {
  const loc = a?.localisation || a?.geopoint;
  if (loc) {
    const lat = loc.latitude ?? loc.lat;
    const lng = loc.longitude ?? loc.lng;
    if (lat && lng) return { coords: [lat, lng], precise: true };
  }
  if (a?.ville) {
    const key = a.ville.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const found = Object.entries(VILLE_CENTERS).find(([k]) => key.includes(k));
    if (found) return { coords: found[1], precise: false };
  }
  return null;
}

// Les catégories sont maintenant dérivées dynamiquement des artisans chargés (voir useMemo dans le composant)

// ── Étoiles ───────────────────────────────────────────────────────────────────
function Stars({ note, max = 5 }) {
  const rounded = Math.round(note);
  return (
    <span className="card-stars-row" aria-label={`${note.toFixed(1)} sur 5`}>
      {Array.from({ length: max }).map((_, i) => (
        <FiStar key={i} className={i < rounded ? 'cstar filled' : 'cstar'} />
      ))}
    </span>
  );
}

export default function ArtisansPage() {
  usePageMeta({ title: 'Annuaire des artisans', description: 'Trouvez des artisans qualifies au Benin : plombiers, electriciens, tailleurs, coiffeurs et plus. Annuaire Azotche.' });

  const {
    allArtisans, displayCount, loading, error, loadArtisans, loadMore,
    searchResults, searching, searchError, searchTotal, searchArtisansServer, clearSearch,
  } = useArtisans();
  const [searchParams] = useSearchParams();

  const [search, setSearch]         = useState(() => searchParams.get('q') || '');
  const [category, setCategory]     = useState('');
  const [ville, setVille]           = useState('');
  const [searchType, setSearchType] = useState('general');
  const initialised = useRef(false);
  const debounceRef = useRef(null);
  const prevCriteriaRef = useRef({ category: '', ville: '', searchType: 'general' });
  const firstSearchRunRef = useRef(true);

  // Géolocalisation visiteur pour distance
  const [userCoords, setUserCoords] = useState(null);
  const [geoAsked, setGeoAsked]     = useState(false);

  useEffect(() => {
    if (!geoAsked && 'geolocation' in navigator) {
      setGeoAsked(true);
      navigator.geolocation.getCurrentPosition(
        pos => setUserCoords([pos.coords.latitude, pos.coords.longitude]),
        () => {}, // Pas d'erreur affichée — la distance reste optionnelle
        { timeout: 8000 }
      );
    }
  }, [geoAsked]);

  // Pré-remplir la recherche depuis ?q=
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !initialised.current) { setSearch(q); initialised.current = true; }
  }, [searchParams]);

  useEffect(() => { loadArtisans(); }, [loadArtisans]);

  const villes = useMemo(() => {
    const set = new Set(allArtisans.map(a => a.ville).filter(Boolean).map(v => v.trim()));
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [allArtisans]);

  // ── Catégories dynamiques depuis les données réelles ─────────────────────────
  const dynamicCategories = useMemo(() => {
    const counts = {};
    allArtisans.forEach(a => {
      const m = (a.metierPrincipal || '').trim();
      if (m) counts[m] = (counts[m] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b - a) // les plus représentés en premier
      .map(([metier, count]) => ({ value: metier, label: metier, count }));
    return [
      { value: '', label: 'Tous', icon: <FiGrid size={14} /> },
      ...sorted,
    ];
  }, [allArtisans]);

  // ── Recherche 100% Firebase, sur TOUTE la base ──────────────────────────────
  // Dès qu'un critère est actif (texte, catégorie ou ville), on interroge la
  // Cloud Function `searchArtisans` (tolérante aux fautes, classement serveur)
  // au lieu de filtrer la page déjà chargée en mémoire — sinon un artisan
  // hors de cette page ne serait jamais trouvé. Sans critère, on retombe sur
  // l'affichage local paginé existant (aucun appel réseau superflu).
  // Miroir exact de SearchScreen (mobile) : _hasActiveServerCriteria / _updateResults.
  const hasFilters = !!(search.trim() || category || ville);

  const runSearchNow = useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    if (!hasFilters) { clearSearch(); return; }
    searchArtisansServer({
      requete: search.trim(),
      type: searchType,
      categorie: category || undefined,
      ville: ville || undefined,
      limite: 60,
    });
  }, [hasFilters, search, searchType, category, ville, searchArtisansServer, clearSearch]);

  // Debounce uniquement quand seul le texte a changé (frappe) ; immédiat pour
  // les changements structurels (chip catégorie/ville, type de recherche).
  useEffect(() => {
    const prev = prevCriteriaRef.current;
    const onlyTextChanged = prev.category === category && prev.ville === ville && prev.searchType === searchType;
    prevCriteriaRef.current = { category, ville, searchType };

    // Premier rendu : lancer immédiatement (ex : recherche pré-remplie via ?q=),
    // comme initState() → _runSearchNow() côté mobile.
    const delay = firstSearchRunRef.current ? 0 : (onlyTextChanged ? SEARCH_DEBOUNCE_MS : 0);
    firstSearchRunRef.current = false;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runSearchNow, delay);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, ville, searchType]);

  const displayed = hasFilters ? searchResults : allArtisans.slice(0, displayCount);
  const totalFiltered = hasFilters ? searchTotal : allArtisans.length;
  const isLoadingResults = hasFilters ? searching : loading;
  const activeError = hasFilters ? searchError : error;

  const clientHasMore = !hasFilters && displayCount < totalFiltered;
  const resetFilters = () => { setSearch(''); setCategory(''); setVille(''); setSearchType('general'); };

  const handleScroll = useCallback(() => {
    if (!clientHasMore) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) loadMore();
  }, [clientHasMore, loadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="artisans-page">
      {/* ── Hero compact ── */}
      <section className="artisans-hero">
        <div className="container">
          <h1>Trouvez un <span className="text-orange">artisan de confiance</span></h1>
          <p>Des milliers de professionnels qualifiés près de chez vous au Bénin</p>

          <div className="artisans-hero-actions">
            <Link to="/carte" className="btn btn-outline btn-sm artisans-map-btn">
              <FiMap size={15} /> Vue carte
            </Link>
            {userCoords && (
              <span className="artisans-geo-indicator">
                <FiNavigation size={13} /> Localisation active
              </span>
            )}
          </div>

          <div className="artisans-search-bar">
            {searching
              ? <FiLoader className="search-icon spinner" />
              : <FiSearch className="search-icon" />
            }
            <input
              type="text"
              placeholder={hintForType(searchType)}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearchNow(); }}
            />
            {search && (
              <button className="clear-btn" onClick={() => setSearch('')}><FiX /></button>
            )}
          </div>
        </div>
      </section>

      {/* ── Filtres ── */}
      <div className="artisans-filters-bar">
        <div className="container">
          {/* ── Sélecteur de type de recherche : recherche 100% Firebase, sur ──
              toute la base, avec tolérance aux fautes — miroir de SearchScreen
              (mobile). Choisir "Métier" puis taper filtre désormais uniquement
              sur le métier (avec tolérance), etc. */}
          <div className="search-type-row">
            <span className="search-type-label"><FiFilter size={12} /> Rechercher par</span>
            <div className="type-chips">
              {TYPES_RECHERCHE.map(t => (
                <button
                  key={t.value}
                  className={`type-chip ${searchType === t.value ? 'active' : ''}`}
                  onClick={() => setSearchType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filters-row">
            <div className="cat-chips">
              {dynamicCategories.map(cat => (
                <button
                  key={cat.value}
                  className={`cat-chip ${category === cat.value ? 'active' : ''}`}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.icon
                    ? <span className="cat-icon">{cat.icon}</span>
                    : <span className="cat-icon"><FiBriefcase size={14} /></span>
                  }
                  <span>{cat.label}</span>
                  {cat.count && <span className="cat-chip-count">{cat.count}</span>}
                </button>
              ))}
            </div>

            <div className="filters-right">
              {villes.length > 0 && (
                <div className="select-wrap">
                  <FiMapPin />
                  <select value={ville} onChange={e => setVille(e.target.value)}>
                    <option value="">Toutes les villes</option>
                    {villes.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <FiChevronDown className="select-arrow" />
                </div>
              )}
              {hasFilters && (
                <button className="btn-reset" onClick={resetFilters}>
                  <FiX /> Effacer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="container artisans-content">
        {!isLoadingResults && (
          <div className="results-count">
            <strong>{displayed.length}</strong> artisan{displayed.length !== 1 ? 's' : ''} trouvé{displayed.length !== 1 ? 's' : ''}
            {hasFilters && totalFiltered > displayed.length && (
              <span className="filter-hint"> · {displayed.length} sur {totalFiltered} résultats</span>
            )}
            {hasFilters && totalFiltered <= displayed.length && (
              <span className="filter-hint"> · recherche sur toute la base</span>
            )}
            {!hasFilters && clientHasMore && (
              <span className="filter-hint"> · {displayed.length} affichés sur {totalFiltered}</span>
            )}
          </div>
        )}

        {activeError && (
          <div className="artisans-error">
            <FiWifiOff className="empty-icon-lg" />
            <p>{activeError}</p>
            <button className="btn btn-primary" onClick={hasFilters ? runSearchNow : loadArtisans}>Réessayer</button>
          </div>
        )}

        {isLoadingResults && displayed.length === 0 && (
          <div className="artisans-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="artisan-card skeleton" />
            ))}
          </div>
        )}

        {!isLoadingResults && displayed.length === 0 && !activeError && (
          <div className="artisans-empty">
            <FiSearch className="empty-icon-lg" />
            <h3>Aucun artisan trouvé</h3>
            <p>Essayez d'élargir votre recherche ou de changer les filtres.</p>
            {hasFilters && (
              <button className="btn btn-outline" onClick={resetFilters}>Effacer les filtres</button>
            )}
          </div>
        )}

        {displayed.length > 0 && (
          <div className="artisans-grid">
            {displayed.map(artisan => (
              <ArtisanCard key={artisan.uid} artisan={artisan} userCoords={userCoords} />
            ))}
          </div>
        )}

        {clientHasMore && (
          <div className="load-more-spinner">
            <FiLoader className="spinner" /><span>Chargement…</span>
          </div>
        )}
        {!loading && !clientHasMore && allArtisans.length > 0 && !hasFilters && (
          <p className="end-of-list">Tous les artisans ont été chargés ✓</p>
        )}
      </div>
    </div>
  );
}

// ── Carte artisan ─────────────────────────────────────────────────────────────
function ArtisanCard({ artisan, userCoords }) {
  const planClass = artisan.plan === 'premium' || artisan.comptePayant
    ? 'plan-premium'
    : artisan.plan === 'pro'
    ? 'plan-pro'
    : 'plan-gratuit';

  // Distance du visiteur
  const distanceInfo = useMemo(() => {
    if (!userCoords) return null;
    const ac = getArtisanCoords(artisan);
    if (!ac) return null;
    const km = haversineKm(userCoords[0], userCoords[1], ac.coords[0], ac.coords[1]);
    const label = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
    return { label: ac.precise ? label : `~${label}`, precise: ac.precise };
  }, [artisan, userCoords]);

  return (
    <Link to={`/artisans/${artisan.uid}`} className={`artisan-card ${planClass}`}>
      {artisan.boostActif && (
        <div className="boost-badge"><FiZap /> Boosté</div>
      )}

      <div className="card-photo-wrap">
        {artisan.photoUrl ? (
          <img src={artisan.photoUrl} alt={artisan.nom} className="card-photo" loading="lazy" />
        ) : (
          <div className="card-photo-placeholder">
            <span>{artisan.nom?.charAt(0)?.toUpperCase() || '?'}</span>
          </div>
        )}
        {artisan.isCertified && (
          <div className="certified-dot" title="Profil vérifié"><FiAward /></div>
        )}
      </div>

      <div className="card-body">
        <div className="card-name-row">
          <h3>{artisan.nom}</h3>
          {(artisan.plan === 'premium' || artisan.comptePayant) && (
            <span className="premium-star"><FiStar size={13} /></span>
          )}
        </div>
        <p className="card-metier">{artisan.metierPrincipal || 'Artisan'}</p>

        <div className="card-meta">
          {artisan.noteMoyenne > 0 && (
            <span className="card-note">
              <Stars note={artisan.noteMoyenne} />
              <span className="note-val">{artisan.noteMoyenne.toFixed(1)}</span>
              <span className="note-count">({artisan.nombreAvis})</span>
            </span>
          )}
          {artisan.ville && (
            <span className="card-ville"><FiMapPin /> {artisan.ville}</span>
          )}
          {distanceInfo && (
            <span className={`card-distance ${distanceInfo.precise ? '' : 'approx'}`}>
              <FiNavigation size={12} /> {distanceInfo.label}
            </span>
          )}
        </div>

        {artisan.description ? (
          <p className="card-desc">{artisan.description}</p>
        ) : null}

        <div className="card-footer">
          <span className={`plan-chip ${planClass}`}>
            {artisan.plan === 'premium' || artisan.comptePayant
              ? 'Premium'
              : artisan.plan === 'pro'
              ? 'Pro'
              : 'Gratuit'}
          </span>
          <span className="card-cta">Voir le profil →</span>
        </div>
      </div>
    </Link>
  );
}
