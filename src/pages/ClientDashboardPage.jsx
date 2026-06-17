import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiCompass, FiStar, FiHeart, FiUser,
  FiMapPin, FiLogOut, FiLoader, FiSearch,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import usePageMeta from '../hooks/usePageMeta';
import { db } from '../firebase';
import {
  collection, query, where, getDocs, orderBy, limit, doc, getDoc,
} from 'firebase/firestore';

/* ── Petites étoiles réutilisables ── */
function Stars({ note = 0 }) {
  return (
    <span className="stars-row">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`star ${i <= Math.round(note) ? 'filled' : ''}`}>★</span>
      ))}
    </span>
  );
}

/* ── Carte artisan simplifiée ── */
function ArtisanMiniCard({ artisan }) {
  return (
    <Link to={`/artisans/${artisan.uid}`} className="artisan-card" style={{ textDecoration: 'none' }}>
      <div className="card-photo-wrap">
        {artisan.photoUrl
          ? <img src={artisan.photoUrl} alt={artisan.nom} className="card-photo" />
          : <div className="card-photo-placeholder">{artisan.nom?.[0] || '?'}</div>
        }
      </div>
      <div className="card-body">
        <div className="card-name-row"><h3>{artisan.nom}</h3></div>
        <div className="card-metier">{artisan.metierPrincipal}</div>
        <div className="card-meta">
          <span className="card-note">
            <Stars note={artisan.noteMoyenne || 0} />
            <span className="note-count">({artisan.nombreAvis || 0})</span>
          </span>
          <span className="card-ville"><FiMapPin />{artisan.ville}</span>
        </div>
      </div>
    </Link>
  );
}

const TABS = [
  { id: 'decouvrir', label: 'Découvrir', Icon: FiCompass },
  { id: 'avis',      label: 'Mes avis',  Icon: FiStar    },
  { id: 'favoris',   label: 'Favoris',   Icon: FiHeart   },
  { id: 'profil',    label: 'Mon profil',Icon: FiUser    },
];

export default function ClientDashboardPage() {
  usePageMeta({ title: 'Mon espace — AZÔTCHÉ' });

  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('decouvrir');

  // Artisans récents
  const [artisans, setArtisans]   = useState([]);
  const [artLoad,  setArtLoad]    = useState(true);
  // Avis du client
  const [avis,     setAvis]       = useState([]);
  const [avisLoad, setAvisLoad]   = useState(false);
  // Favoris (uid list in localStorage mock → Firestore)
  const [favs,     setFavs]       = useState([]);
  const [favsLoad, setFavsLoad]   = useState(false);

  useEffect(() => {
    if (!user) navigate('/connexion', { replace: true });
  }, [user, navigate]);

  /* ── Charger artisans récents ── */
  useEffect(() => {
    if (tab !== 'decouvrir') return;
    setArtLoad(true);
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'pro'),
      where('statut', '==', 'actif'),
      orderBy('dateInscription', 'desc'),
      limit(20)
    );
    getDocs(q).then(snap => {
      setArtisans(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setArtLoad(false);
    }).catch(() => setArtLoad(false));
  }, [tab]);

  /* ── Charger avis ── */
  useEffect(() => {
    if (tab !== 'avis' || !user) return;
    setAvisLoad(true);
    const q = query(
      collection(db, 'avis'),
      where('auteurUid', '==', user.uid),
      orderBy('date', 'desc'),
      limit(30)
    );
    getDocs(q).then(async snap => {
      const items = [];
      for (const d of snap.docs) {
        const data = d.data();
        // Récupérer le nom de l'artisan
        let artisanNom = 'Artisan';
        let artisanMetier = '';
        try {
          const aDoc = await getDoc(doc(db, 'users', data.artisanUid));
          if (aDoc.exists()) {
            artisanNom    = aDoc.data().nom || artisanNom;
            artisanMetier = aDoc.data().metierPrincipal || '';
          }
        } catch (_) {}
        items.push({ id: d.id, ...data, artisanNom, artisanMetier });
      }
      setAvis(items);
      setAvisLoad(false);
    }).catch(() => setAvisLoad(false));
  }, [tab, user]);

  /* ── Charger favoris ── */
  useEffect(() => {
    if (tab !== 'favoris' || !user) return;
    // Les favoris sont stockés dans users/{uid}/favoris sous-collection
    setFavsLoad(true);
    const q = query(
      collection(db, 'users', user.uid, 'favoris'),
      orderBy('ajouteLe', 'desc'),
      limit(50)
    );
    getDocs(q).then(async snap => {
      const items = [];
      for (const d of snap.docs) {
        const artisanUid = d.id;
        try {
          const aDoc = await getDoc(doc(db, 'users', artisanUid));
          if (aDoc.exists()) items.push({ uid: artisanUid, ...aDoc.data() });
        } catch (_) {}
      }
      setFavs(items);
      setFavsLoad(false);
    }).catch(() => setFavsLoad(false));
  }, [tab, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const initiale = profile?.nom?.[0]?.toUpperCase() || user?.phoneNumber?.[0] || '?';

  return (
    <div className="client-dash-page">
      {/* Header */}
      <div className="client-dash-header">
        <div className="container">
          <div className="client-dash-header-inner">
            <div className="client-dash-avatar-wrap">
              <div className="client-dash-avatar">{initiale}</div>
              <div>
                <div className="client-dash-hello">Bonjour,</div>
                <div className="client-dash-name">{profile?.nom || 'Client'}</div>
                {profile?.ville && (
                  <div className="client-dash-ville"><FiMapPin />{profile.ville}</div>
                )}
              </div>
            </div>
            <button className="client-dash-signout" onClick={handleSignOut}>
              <FiLogOut /> Se déconnecter
            </button>
          </div>
        </div>
      </div>

      {/* Navigation onglets */}
      <nav className="client-dash-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`client-dash-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Corps */}
      <div className="client-dash-body">
        <div className="container">

          {/* ── Découvrir ── */}
          <div className={`client-dash-panel ${tab === 'decouvrir' ? 'active' : ''}`}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Artisans près de vous</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Découvrez les meilleurs professionnels disponibles au Bénin
              </p>
            </div>
            {artLoad ? (
              <div className="route-loading">
                <div className="route-loading-spinner" />
              </div>
            ) : artisans.length === 0 ? (
              <div className="client-empty-state">
                <div className="client-empty-icon"><FiSearch size={28} /></div>
                <h3>Aucun artisan trouvé</h3>
                <p>Les artisans rejoindront bientôt la plateforme</p>
              </div>
            ) : (
              <div className="artisans-grid">
                {artisans.map(a => <ArtisanMiniCard key={a.uid} artisan={a} />)}
              </div>
            )}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Link to="/artisans" className="btn btn-outline">
                Voir tous les artisans <FiCompass />
              </Link>
            </div>
          </div>

          {/* ── Mes avis ── */}
          <div className={`client-dash-panel ${tab === 'avis' ? 'active' : ''}`}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Mes avis</h2>
            </div>
            {avisLoad ? (
              <div className="route-loading"><div className="route-loading-spinner" /></div>
            ) : avis.length === 0 ? (
              <div className="client-empty-state">
                <div className="client-empty-icon"><FiStar size={28} /></div>
                <h3>Aucun avis pour l'instant</h3>
                <p>Après avoir travaillé avec un artisan, vous pourrez laisser votre avis sur son profil</p>
                <Link to="/artisans" className="btn btn-primary" style={{ marginTop: 8 }}>
                  Trouver un artisan
                </Link>
              </div>
            ) : (
              <div className="client-avis-list">
                {avis.map(av => (
                  <div key={av.id} className="client-avis-card">
                    <div className="client-avis-artisan-avatar">
                      {av.artisanNom?.[0] || 'A'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="client-avis-artisan-name">{av.artisanNom}</div>
                      <div className="client-avis-artisan-metier">{av.artisanMetier}</div>
                      <div className="client-avis-note-row">
                        <Stars note={av.note || 0} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{av.note}/5</span>
                      </div>
                      {av.commentaire && (
                        <p className="client-avis-comment">"{av.commentaire}"</p>
                      )}
                      <div className="client-avis-date">
                        {av.date?.toDate ? av.date.toDate().toLocaleDateString('fr-FR') : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Favoris ── */}
          <div className={`client-dash-panel ${tab === 'favoris' ? 'active' : ''}`}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Mes favoris</h2>
            </div>
            {favsLoad ? (
              <div className="route-loading"><div className="route-loading-spinner" /></div>
            ) : favs.length === 0 ? (
              <div className="client-empty-state">
                <div className="client-empty-icon"><FiHeart size={28} /></div>
                <h3>Aucun favori</h3>
                <p>Ajoutez des artisans à vos favoris en visitant leur profil</p>
                <Link to="/artisans" className="btn btn-primary" style={{ marginTop: 8 }}>
                  Découvrir des artisans
                </Link>
              </div>
            ) : (
              <div className="client-favs-grid">
                {favs.map(a => <ArtisanMiniCard key={a.uid} artisan={a} />)}
              </div>
            )}
          </div>

          {/* ── Mon profil ── */}
          <div className={`client-dash-panel ${tab === 'profil' ? 'active' : ''}`}>
            <div className="client-profil-card" style={{ textAlign: 'center' }}>
              <div className="client-profil-avatar-big">{initiale}</div>
              <h2 style={{ fontWeight: 800, marginBottom: 4 }}>{profile?.nom}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <FiMapPin style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {profile?.ville || 'Ville non renseignée'}
              </p>

              {profile?.referralCode && (
                <div className="client-profil-referral">
                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                      Mon code de parrainage
                    </p>
                    <div className="client-profil-referral-code">{profile.referralCode}</div>
                    <p>Partagez ce code pour gagner des crédits</p>
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--grey-100)', marginTop: 16, paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Téléphone</span>
                  <span style={{ fontWeight: 600 }}>{user?.phoneNumber || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.9rem', borderTop: '1px solid var(--grey-50)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Filleuls</span>
                  <span style={{ fontWeight: 600 }}>{profile?.referralCount || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.9rem', borderTop: '1px solid var(--grey-50)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Crédits parrainage</span>
                  <span style={{ fontWeight: 600, color: 'var(--green)' }}>{profile?.creditParrainage || 0} FCFA</span>
                </div>
              </div>
            </div>


            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button className="btn-signout" onClick={handleSignOut}>
                <FiLogOut /> Se déconnecter
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
