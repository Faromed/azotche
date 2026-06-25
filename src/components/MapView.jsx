import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Centres géographiques des principales villes du Bénin
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
  'savè':          [8.0333, 2.4833],
  'tchaourou':     [8.8833, 2.6000],
};

const DEFAULT_CENTER = [9.3077, 2.3158]; // Bénin centre

function getCenter(artisan) {
  // GeoPoint Firestore : { latitude, longitude }
  const loc = artisan?.localisation || artisan?.geopoint;
  if (loc) {
    const lat = loc.latitude  ?? loc.lat;
    const lng = loc.longitude ?? loc.lng;
    if (lat && lng) return { coords: [lat, lng], precise: true };
  }
  // Sinon → centre de la ville
  if (artisan?.ville) {
    const key = artisan.ville.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const found = Object.entries(VILLE_CENTERS).find(([k]) => key.includes(k));
    if (found) return { coords: found[1], precise: false };
  }
  return null;
}

export default function MapView({ artisan, height = 280 }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Éviter la double-initialisation si la carte existe déjà
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const info = getCenter(artisan);
    if (!info) return; // pas de données de localisation du tout

    const { coords, precise } = info;

    const map = L.map(containerRef.current, {
      center:         coords,
      zoom:           precise ? 15 : 12,
      scrollWheelZoom: false,
      zoomControl:    true,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Icône personnalisée orange
    const icon = L.divIcon({
      html: `<div class="map-marker-pin" style="background:#FF6B35;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
      iconSize:   [28, 28],
      iconAnchor: [14, 28],
      className:  '',
    });

    const popup = precise
      ? `<strong>${artisan?.nom || 'Artisan'}</strong><br/>${artisan?.adresse || artisan?.quartier || ''}`
      : `<strong>${artisan?.nom || 'Artisan'}</strong><br/>${artisan?.ville || ''} (position approximative)`;

    L.marker(coords, { icon })
      .addTo(map)
      .bindPopup(popup, { maxWidth: 200 })
      .openPopup();

    // Cercle de zone si position approximative
    if (!precise) {
      L.circle(coords, {
        radius:      2000,
        color:       '#FF6B35',
        fillColor:   '#FF6B35',
        fillOpacity: 0.07,
        weight:      1,
      }).addTo(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [artisan]);

  const info = getCenter(artisan);
  if (!info) return null; // rien à afficher

  return (
    <div className="map-view-wrap">
      <div
        ref={containerRef}
        style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
      />
      {!info.precise && (
        <p className="map-approx-note">
          📍 Position approximative — ville : {artisan?.ville}
        </p>
      )}
    </div>
  );
}
