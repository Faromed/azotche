import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiMapPin, FiNavigation, FiSliders, FiX,
  FiPhone, FiStar, FiList, FiMap, FiUser, FiAlertCircle,
} from 'react-icons/fi';
import { useArtisans } from '../hooks/useArtisans';
import usePageMeta from '../hooks/usePageMeta';

// ── Centres des villes du Bénin ───────────────────────────────────────────────
const VILLE_CENTERS = {
  'cotonou':       [6.3654, 2.4183],
  'porto-novo':    [6.4969, 2.6289],
  'parakou':       [9.3370, 2.6283],
  'abomey-calavi': [6.4500, 2.3556],
  'djougou':       [9.7080, 1.6634],
  'bohicon':       [7.1791, 2.0665],
  'kandi':         [11.1338, 2.9373],
  'natitingou':    [10.3133, 1.3785],
  'ouidah':        [6.3618, 2.0836],
  'lokossa':       [6.6400, 1.7167],
  'malanville':    [11.8700, 3.3833],
  'abomey':        [7.1833, 1.9833],
  'nikki':         [9.9500, 3.2000],
  'save':          [8.0333, 2.4833],
};
const DEFAULT_CENTER = [6.3654, 2.4183]; // Cotonou par défaut
const BENIN_BOUNDS = [[5.8, 0.9], [12.5, 3.9]];

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dL / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Obtenir coords d'un artisan ───────────────────────────────────────────────
function getArtisanCoords(a) {
  const loc = a?.localisation || a?.geopoint;
  if (loc) {
    const lat = loc.latitude ?? loc.lat;
    const lng = loc.longitude ?? loc.lng;
    if (lat && lng) return { coords: [lat, lng], precise: true };
  }
  if (a?.ville) {
    const key = a.ville.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    const found = Object.entries(VILLE_CENTERS).find(([k]) => key.includes(k));
    if (found) return { coords: found[1], precise: false };
  }
  return null;
}

function distLabel(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const RADIUS_OPTIONS = [1, 3, 5, 10, 20, 50];

// ── Composant principal ───────────────────────────────────────────────────────
export default function MapPage() {
  usePageMeta({ title: 'Carte des artisans', description: 'Trouvez des artisans près de vous sur la carte interactive — Azôtché Bénin.' });

  const { allArtisans, loading, loadArtisans } = useArtisans();
  useEffect(() => { loadArtisans(); }, [loadArtisans]);

  const [search, setSearch]         = useState('');
  const [userPos, setUserPos]       = useState(null);   // { lat, lng }
  const [geoError, setGeoError]     = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [radius, setRadius]         = useState(5);      // km
  const [showRadius, setShowRadius] = useState(false);
  const [activeId, setActiveId]     = useState(null);
  const [mobileTab, setMobileTab]   = useState('map');  // 'map' | 'list'

  // Map Leaflet refs
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef({});     // uid → marker
  const circleRef       = useRef(null);
  const userMarkerRef   = useRef(null);

  // ── Artisans avec coords + distance ─────────────────────────────────────────
  const enriched = useMemo(() => {
    return allArtisans
      .map(a => {
        const info = getArtisanCoords(a);
        if (!info) return null;
        const dist = userPos
          ? haversineKm(userPos.lat, userPos.lng, info.coords[0], info.coords[1])
          : null;
        return { ...a, coords: info.coords, precise: info.precise, dist };
      })
      .filter(Boolean);
  }, [allArtisans, userPos]);

  // ── Filtrage ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = norm(search);
    return enriched.filter(a => {
      if (q && !norm(a.nom).includes(q) && !norm(a.metierPrincipal).includes(q) && !norm(a.ville).includes(q))
        return false;
      if (userPos && a.dist !== null && a.dist > radius)
        return false;
      return true;
    }).sort((a, b) => {
      if (a.dist !== null && b.dist !== null) return a.dist - b.dist;
      if (a.dist !== null) return -1;
      if (b.dist !== null) return 1;
      return 0;
    });
  }, [enriched, search, userPos, radius]);

  // ── Init carte ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const L = window.L;
    if (!L || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      scrollWheelZoom: true,
      maxBounds: BENIN_BOUNDS,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Marqueurs artisans ───────────────────────────────────────────────────────
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    // Supprimer anciens marqueurs
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    filtered.forEach(a => {
      const color = a.plan === 'premium' || a.comptePayant ? '#F59E0B'
        : a.plan === 'pro' ? '#2E7D32'
        : '#FF6B35';

      const icon = L.divIcon({
        html: `<div class="map-pin" style="--pin-color:${color}">
          <div class="map-pin-inner"></div>
        </div>`,
        iconSize: [30, 38],
        iconAnchor: [15, 38],
        popupAnchor: [0, -38],
        className: '',
      });

      const distStr = a.dist !== null ? `<br/><span style="color:#FF6B35;font-weight:600;">${distLabel(a.dist)}</span>` : '';
      const popup = `
        <div class="map-popup">
          <strong>${a.nom}</strong>
          <span>${a.metierPrincipal || 'Artisan'}</span>
          <span>${a.ville || ''}${distStr}</span>
          ${!a.precise ? '<small style="opacity:.6">Position approximative</small>' : ''}
          <a href="/artisans/${a.uid}" class="map-popup-link">Voir le profil →</a>
        </div>`;

      const marker = L.marker(a.coords, { icon })
        .addTo(map)
        .bindPopup(popup, { maxWidth: 220 });

      marker.on('click', () => setActiveId(a.uid));
      markersRef.current[a.uid] = marker;
    });
  }, [filtered]);

  // ── Marqueur utilisateur + cercle rayon ──────────────────────────────────────
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (circleRef.current) { circleRef.current.remove(); circleRef.current = null; }

    if (!userPos) return;

    const userIcon = L.divIcon({
      html: `<div class="user-pin"><div class="user-pin-pulse"></div></div>`,
      iconSize: [20, 20], iconAnchor: [10, 10], className: '',
    });
    userMarkerRef.current = L.marker([userPos.lat, userPos.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup('📍 Vous êtes ici');

    circleRef.current = L.circle([userPos.lat, userPos.lng], {
      radius: radius * 1000,
      color: '#FF6B35',
      fillColor: '#FF6B35',
      fillOpacity: 0.06,
      weight: 1.5,
      dashArray: '6 4',
    }).addTo(map);

    map.setView([userPos.lat, userPos.lng], 13);
  }, [userPos, radius]);

  // ── Géolocalisation ──────────────────────────────────────────────────────────
  const geolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas disponible sur ce navigateur.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      err => {
        setGeoLoading(false);
        if (err.code === 1) setGeoError('Permission de géolocalisation refusée.');
        else setGeoError('Impossible d\'obtenir votre position.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  // ── Clic sur artisan dans la liste → centrer carte ───────────────────────────
  const handleListClick = useCallback((a) => {
    const map = mapRef.current;
    const marker = markersRef.current[a.uid];
    setActiveId(a.uid);
    setMobileTab('map');
    if (map && marker) {
      map.setView(a.coords, 15, { animate: true });
      marker.openPopup();
    }
  }, []);

  return (
    <div className="mappage">
      {/* ── Barre de contrôles ──────────────────────────────────────── */}
      <div className="mappage-bar">
        <div className="mappage-search">
          <FiSearch className="mappage-search-icon" />
          <input
            type="text"
            placeholder="Rechercher un artisan, métier, ville…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="mappage-clear" onClick={() => setSearch('')}><FiX /></button>}
        </div>

        <div className="mappage-controls">
          {/* Bouton rayon */}
          <div className="mappage-radius-wrap">
            <button
              className={`mappage-ctrl-btn ${showRadius ? 'active' : ''}`}
              onClick={() => setShowRadius(v => !v)}
              title="Rayon de recherche"
            >
              <FiSliders /> {userPos ? `${radius} km` : 'Rayon'}
            </button>
            {showRadius && (
              <div className="mappage-radius-panel">
                <p className="mappage-radius-label">Rayon de recherche</p>
                <div className="mappage-radius-chips">
                  {RADIUS_OPTIONS.map(r => (
                    <button
                      key={r}
                      className={`radius-chip ${radius === r ? 'active' : ''}`}
                      onClick={() => { setRadius(r); setShowRadius(false); }}
                    >{r} km</button>
                  ))}
                </div>
                <p className="mappage-radius-note">
                  {userPos ? `${filtered.length} artisan${filtered.length !== 1 ? 's' : ''} dans un rayon de ${radius} km`
                    : 'Activez la géolocalisation pour filtrer par distance'}
                </p>
              </div>
            )}
          </div>

          {/* Bouton géoloc */}
          <button
            className={`mappage-ctrl-btn mappage-geolocbtn ${userPos ? 'located' : ''} ${geoLoading ? 'loading' : ''}`}
            onClick={geolocate}
            title={userPos ? 'Position active' : 'Me localiser'}
            disabled={geoLoading}
          >
            <FiNavigation />
            {geoLoading ? 'Localisation…' : userPos ? 'Localisé' : 'Me localiser'}
          </button>
        </div>

        {/* Onglets mobile */}
        <div className="mappage-tabs">
          <button className={`mappage-tab ${mobileTab === 'map' ? 'active' : ''}`} onClick={() => setMobileTab('map')}>
            <FiMap /> Carte
          </button>
          <button className={`mappage-tab ${mobileTab === 'list' ? 'active' : ''}`} onClick={() => setMobileTab('list')}>
            <FiList /> Liste ({filtered.length})
          </button>
        </div>
      </div>

      {geoError && (
        <div className="mappage-geo-error">
          <FiAlertCircle /> {geoError}
          <button onClick={() => setGeoError('')}><FiX /></button>
        </div>
      )}

      {/* ── Corps principal ──────────────────────────────────────────── */}
      <div className="mappage-body">
        {/* Panneau liste */}
        <aside className={`mappage-list ${mobileTab === 'list' ? 'mobile-visible' : ''}`}>
          <div className="mappage-list-header">
            <span>
              <strong>{filtered.length}</strong> artisan{filtered.length !== 1 ? 's' : ''}
              {userPos && ` · rayon ${radius} km`}
            </span>
            {loading && <span className="mappage-loading-dot" />}
          </div>

          {loading && filtered.length === 0 && (
            <div className="mappage-list-skeleton">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="mpl-skel" />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="mappage-empty">
              <FiMapPin size={32} />
              <p>Aucun artisan trouvé{userPos ? ` dans ${radius} km` : ''}.</p>
              {userPos && <button className="btn btn-outline btn-sm" onClick={() => setRadius(50)}>Élargir à 50 km</button>}
            </div>
          )}

          <div className="mappage-list-items">
            {filtered.map(a => (
              <button
                key={a.uid}
                className={`mpl-item ${activeId === a.uid ? 'active' : ''}`}
                onClick={() => handleListClick(a)}
              >
                <div className="mpl-photo">
                  {a.photoUrl
                    ? <img src={a.photoUrl} alt={a.nom} loading="lazy" />
                    : <div className="mpl-photo-placeholder">{a.nom?.charAt(0)?.toUpperCase()}</div>
                  }
                  {a.isCertified && <span className="mpl-verified" title="Vérifié">✓</span>}
                </div>
                <div className="mpl-info">
                  <div className="mpl-name">{a.nom}</div>
                  <div className="mpl-metier">{a.metierPrincipal}</div>
                  <div className="mpl-meta">
                    {a.ville && <span><FiMapPin size={11} /> {a.ville}</span>}
                    {a.noteMoyenne > 0 && (
                      <span><FiStar size={11} style={{ color: '#F59E0B' }} /> {a.noteMoyenne.toFixed(1)}</span>
                    )}
                  </div>
                </div>
                <div className="mpl-right">
                  {a.dist !== null && (
                    <span className={`mpl-dist ${a.precise ? '' : 'approx'}`} title={a.precise ? '' : 'Distance approximative (centre-ville)'}>
                      {distLabel(a.dist)}
                      {!a.precise && ' ~'}
                    </span>
                  )}
                  <span className={`mpl-plan ${a.plan === 'premium' || a.comptePayant ? 'premium' : a.plan === 'pro' ? 'pro' : 'free'}`}>
                    {a.plan === 'premium' || a.comptePayant ? '★' : a.plan === 'pro' ? '●' : '○'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {activeId && (
            <div className="mappage-profile-link">
              <Link to={`/artisans/${activeId}`} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                <FiUser /> Voir le profil
              </Link>
            </div>
          )}
        </aside>

        {/* Carte */}
        <div className={`mappage-map-wrap ${mobileTab === 'map' ? 'mobile-visible' : ''}`}>
          <div ref={mapContainerRef} className="mappage-map" />

          {/* Légende */}
          <div className="mappage-legend">
            <span><span className="legend-dot" style={{ background: '#F59E0B' }} /> Premium</span>
            <span><span className="legend-dot" style={{ background: '#2E7D32' }} /> Pro</span>
            <span><span className="legend-dot" style={{ background: '#FF6B35' }} /> Gratuit</span>
          </div>

          {/* Info compteur flottant */}
          {userPos && (
            <div className="mappage-float-count">
              <FiNavigation size={13} /> {filtered.length} artisan{filtered.length !== 1 ? 's' : ''} · {radius} km
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
