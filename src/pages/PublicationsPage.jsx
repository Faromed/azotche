import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiMapPin, FiTag, FiX, FiLoader,
  FiChevronDown, FiEye, FiGrid, FiScissors, FiUser,
  FiDroplet, FiZap, FiHome, FiTool, FiSettings,
  FiEdit2, FiMoreHorizontal, FiFileText, FiImage,
} from 'react-icons/fi';
import { usePublicationsFeed } from '../hooks/usePublications';
import usePageMeta from '../hooks/usePageMeta';

const CATEGORIES = [
  { value: '', label: 'Toutes', icon: <FiGrid /> },
  { value: 'Tailleur', label: 'Couture', icon: <FiScissors /> },
  { value: 'Coiffeur', label: 'Coiffure', icon: <FiUser /> },
  { value: 'Plombier', label: 'Plomberie', icon: <FiDroplet /> },
  { value: 'Electricien', label: 'Electricite', icon: <FiZap /> },
  { value: 'Macon', label: 'Maconnerie', icon: <FiHome /> },
  { value: 'Menuisier', label: 'Menuiserie', icon: <FiTool /> },
  { value: 'Soudeur', label: 'Soudure', icon: <FiSettings /> },
  { value: 'Mecanicien', label: 'Mecanique', icon: <FiSettings /> },
  { value: 'Peintre', label: 'Peinture', icon: <FiEdit2 /> },
  { value: 'Autre', label: 'Autre', icon: <FiMoreHorizontal /> },
];

const norm = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const formatPrix = (prix) => {
  if (!prix && prix !== 0) return null;
  return Number(prix).toLocaleString('fr-FR') + ' FCFA';
};

export default function PublicationsPage() {
  usePageMeta({ title: 'Offres de service', description: "Decouvrez les offres et services proposes par les artisans certifies d'Azotche au Benin." });
  const { publications, loading, loadingMore, hasMore, error, loadPublications, loadMore } =
    usePublicationsFeed();

  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [ville, setVille]       = useState('');

  useEffect(() => { loadPublications(); }, [loadPublications]);

  const villes = useMemo(() => {
    const set = new Set(publications.map(p => p.ville).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [publications]);

  const displayed = useMemo(() => {
    const q = norm(search);
    return publications.filter(p => {
      if (q && !norm(p.titre).includes(q) && !norm(p.description).includes(q)
           && !norm(p.legende).includes(q)
           && !norm(p.categorie).includes(q) && !norm(p.ville).includes(q))
        return false;
      if (category && norm(p.categorie) !== norm(category)) return false;
      if (ville && norm(p.ville) !== norm(ville)) return false;
      return true;
    });
  }, [publications, search, category, ville]);

  const hasFilters = search || category || ville;
  const reset = () => { setSearch(''); setCategory(''); setVille(''); };

  const handleScroll = useCallback(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
      loadMore();
    }
  }, [loadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="pub-page">
      {/* Hero */}
      <section className="pub-hero">
        <div className="container">
          <span className="pub-hero-tag">Offres de services</span>
          <h1>Publications des <span className="text-orange">artisans</span></h1>
          <p>Découvrez les offres et services proposés par nos artisans de confiance</p>
          <div className="artisans-search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher un service, une offre, une ville..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-btn" onClick={() => setSearch('')}><FiX /></button>
            )}
          </div>
        </div>
      </section>

      {/* Filtres */}
      <div className="artisans-filters-bar">
        <div className="container">
          <div className="filters-row">
            <div className="cat-chips">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  className={`cat-chip ${category === cat.value ? 'active' : ''}`}
                  onClick={() => setCategory(cat.value)}
                >
                  <span className="cat-icon">{cat.icon}</span>
                  <span>{cat.label}</span>
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
                <button className="btn-reset" onClick={reset}><FiX /> Effacer</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="container pub-content">
        {!loading && (
          <div className="results-count">
            <strong>{displayed.length}</strong> publication{displayed.length !== 1 ? 's' : ''}
            {hasFilters && <span className="filter-hint"> filtrée{displayed.length !== 1 ? 's' : ''}</span>}
          </div>
        )}

        {error && (
          <div className="artisans-error">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadPublications}>Réessayer</button>
          </div>
        )}

        {loading && (
          <div className="pub-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="pub-card pub-skeleton" />
            ))}
          </div>
        )}

        {!loading && displayed.length === 0 && !error && (
          <div className="artisans-empty">
            <FiFileText className="empty-icon-lg" />
            <h3>Aucune publication trouvée</h3>
            <p>Essayez d'élargir votre recherche ou de changer les filtres.</p>
            {hasFilters && <button className="btn btn-outline" onClick={reset}>Effacer les filtres</button>}
          </div>
        )}

        {!loading && displayed.length > 0 && (
          <div className="pub-grid">
            {displayed.map(pub => <PublicationCard key={pub.id} pub={pub} />)}
          </div>
        )}

        {loadingMore && (
          <div className="load-more-spinner">
            <FiLoader className="spinner" /><span>Chargement...</span>
          </div>
        )}
        {!loading && !loadingMore && !hasMore && publications.length > 0 && (
          <p className="end-of-list">Toutes les publications ont ete chargees</p>
        )}
      </div>
    </div>
  );
}

function PublicationCard({ pub }) {
  const toDate = (v) => v?.toDate?.() ?? (v instanceof Date ? v : null);

  // Compatibilité dual-format : Flutter (datePublication) vs Web (dateCreation)
  const d = toDate(pub.datePublication || pub.dateCreation || pub.date);
  const dateStr = d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

  // Photo : Flutter → imageUrl ou imageUrls[0] | Web → photos[0]
  const primaryPhoto = pub.photos?.[0] || pub.imageUrl || pub.imageUrls?.[0] || null;
  const photoCount   = pub.photos?.length || pub.imageUrls?.length || (pub.imageUrl ? 1 : 0);

  // Titre : Web → titre | Flutter → extrait du legende (les publications Flutter ont seulement legende)
  const titre = pub.titre || (pub.legende ? pub.legende.substring(0, 60) + (pub.legende.length > 60 ? '…' : '') : '');

  // Description / légende
  const description = pub.description || pub.legende || null;

  const prix = formatPrix(pub.prix);
  const isFlutterFormat = !pub.titre && (pub.legende || pub.imageUrl || pub.imageUrls);

  // Tableau complet des photos pour la grille
  const allPhotos = pub.photos?.length ? pub.photos
    : pub.imageUrls?.length ? pub.imageUrls
    : pub.imageUrl ? [pub.imageUrl]
    : [];

  return (
    <Link to={`/publications/${pub.id}`} className={`pub-card ${isFlutterFormat ? 'pub-card--inspiration' : ''}`}>
      {/* Grille photos */}
      <div className="pub-card-img-wrap">
        {allPhotos.length === 0 && (
          <div className="pub-card-img-placeholder"><FiImage size={28} /></div>
        )}
        {allPhotos.length === 1 && (
          <img src={allPhotos[0]} alt={titre || 'Réalisation'} loading="lazy" className="pub-card-img" />
        )}
        {allPhotos.length === 2 && (
          <div className="pub-photo-grid pub-photo-grid--2">
            {allPhotos.map((url, i) => (
              <div key={i} className="pub-photo-cell">
                <img src={url} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        )}
        {allPhotos.length === 3 && (
          <div className="pub-photo-grid pub-photo-grid--3">
            <div className="pub-photo-cell pub-photo-cell--main">
              <img src={allPhotos[0]} alt="" loading="lazy" />
            </div>
            <div className="pub-photo-col">
              {allPhotos.slice(1).map((url, i) => (
                <div key={i} className="pub-photo-cell">
                  <img src={url} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}
        {allPhotos.length >= 4 && (
          <div className="pub-photo-grid pub-photo-grid--4">
            <div className="pub-photo-cell pub-photo-cell--main">
              <img src={allPhotos[0]} alt="" loading="lazy" />
            </div>
            <div className="pub-photo-col">
              {allPhotos.slice(1, 3).map((url, i) => (
                <div key={i} className="pub-photo-cell">
                  <img src={url} alt="" loading="lazy" />
                </div>
              ))}
              {allPhotos.length > 3 && (
                <div className="pub-photo-cell pub-photo-cell--more">
                  <span className="pub-photo-more-overlay">+{allPhotos.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {pub.categorie && <span className="pub-cat-chip">{pub.categorie}</span>}
      </div>

      {/* Body */}
      <div className="pub-card-body">
        {titre && <h3 className="pub-title">{titre}</h3>}
        {description && description !== titre && (
          <p className="pub-desc">{description.length > 100 ? description.substring(0, 100) + '…' : description}</p>
        )}

        <div className="pub-card-meta">
          {pub.ville && (
            <span className="pub-meta-item"><FiMapPin size={12} /> {pub.ville}</span>
          )}
          {(pub.vues > 0 || pub.nombreVues > 0 || pub.likes > 0) && (
            <span className="pub-meta-item">
              <FiEye size={12} /> {pub.vues || pub.nombreVues || pub.likes || 0}
            </span>
          )}
          {dateStr && <span className="pub-date">{dateStr}</span>}
        </div>

        <div className="pub-card-footer">
          {prix ? (
            <span className="pub-prix">{prix}</span>
          ) : isFlutterFormat ? (
            <span className="pub-voir">Voir la réalisation</span>
          ) : (
            <span className="pub-prix-libre">Prix sur demande</span>
          )}
          {!isFlutterFormat && <span className="pub-voir">Voir l’offre</span>}
        </div>
      </div>

      {/* Artisan mini */}
      {pub.proNom && (
        <div className="pub-artisan-strip">
          {pub.proPhotoUrl ? (
            <img src={pub.proPhotoUrl} alt={pub.proNom} className="pub-artisan-avatar" />
          ) : (
            <div className="pub-artisan-avatar-placeholder">
              {pub.proNom?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <span>{pub.proNom}</span>
        </div>
      )}
    </Link>
  );
}
