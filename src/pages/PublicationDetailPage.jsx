import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiPhone, FiMessageCircle, FiMapPin,
  FiCalendar, FiEye, FiChevronLeft, FiChevronRight, FiX,
  FiUser, FiAlertCircle, FiHeart, FiMessageSquare, FiSend,
} from 'react-icons/fi';
import { fetchPublicationById } from '../hooks/usePublications';
import { fetchArtisanByUid } from '../hooks/useArtisans';
import {
  doc, updateDoc, increment,
  collection, addDoc, getDocs, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import usePageMeta from '../hooks/usePageMeta';

const toDate = (v) => v?.toDate?.() ?? (v instanceof Date ? v : null);
const formatPrix = (p) => p != null ? Number(p).toLocaleString('fr-FR') + ' FCFA' : null;

/** Normalise le champ photo — supporte les formats Flutter ET web */
function normalizePhotos(pub) {
  if (!pub) return [];
  if (pub.photos?.length)     return pub.photos;
  if (pub.imageUrls?.length)  return pub.imageUrls;
  if (pub.imageUrl)            return [pub.imageUrl];
  return [];
}

export default function PublicationDetailPage() {
  const { id }    = useParams();
  const { user, profile } = useAuth();

  const [pub, setPub]         = useState(null);
  const [artisan, setArtisan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [gallery, setGallery] = useState(null);

  // ── Likes ────────────────────────────────────────────────────────────────────
  const [liked, setLiked]       = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // ── Commentaires ─────────────────────────────────────────────────────────────
  const [comments, setComments]     = useState([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [commentName, setCommentName]   = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const commentInputRef = useRef(null);

  usePageMeta(pub ? {
    title: pub.titre || pub.legende?.substring(0, 60) || 'Réalisation',
    description: pub.description || pub.legende
      ? (pub.description || pub.legende).slice(0, 155)
      : `Réalisation — Azotche`,
    ogImage: normalizePhotos(pub)[0] || undefined,
    ogType: 'article',
  } : { title: 'Publication' });

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);

    fetchPublicationById(id)
      .then(async (data) => {
        if (!data) { setError('Publication introuvable.'); return; }
        setPub(data);
        setLikesCount(data.likes ?? data.nombreLikes ?? 0);
        // Vérifier si déjà liké (localStorage)
        const likedKey = `liked_pub_${id}`;
        setLiked(localStorage.getItem(likedKey) === '1');
        // Incrémenter vues
        try { await updateDoc(doc(db, 'publications', id), { nombreVues: increment(1) }); } catch (_) {}
        // Charger profil artisan
        if (data.proUid) {
          const a = await fetchArtisanByUid(data.proUid);
          setArtisan(a);
        }
        // Charger commentaires
        try {
          const q = query(
            collection(db, 'publications', id, 'commentaires'),
            orderBy('createdAt', 'asc'),
          );
          const snap = await getDocs(q);
          setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (_) {}
      })
      .catch(() => setError('Impossible de charger cette publication.'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Handlers like / commentaire ──────────────────────────────────────────────
  const handleLike = async () => {
    const likedKey = `liked_pub_${id}`;
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikesCount(c => c + (nowLiked ? 1 : -1));
    localStorage.setItem(likedKey, nowLiked ? '1' : '0');
    try {
      await updateDoc(doc(db, 'publications', id), { likes: increment(nowLiked ? 1 : -1) });
    } catch (_) {}
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    const name = commentName.trim() || (profile?.nom) || 'Anonyme';
    if (!text) return;
    setSendingComment(true);
    try {
      const newComment = {
        texte: text,
        auteurNom: name,
        auteurUid: user?.uid || null,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'publications', id, 'commentaires'), newComment);
      setComments(prev => [...prev, { id: ref.id, ...newComment, createdAt: new Date() }]);
      // Incrémenter commentsCount sur la publication
      await updateDoc(doc(db, 'publications', id), { commentsCount: increment(1) }).catch(() => {});
      setCommentText('');
    } catch (_) {}
    setSendingComment(false);
  };

  if (loading) {
    return (
      <div className="route-loading"><div className="route-loading-spinner" /></div>
    );
  }

  if (error || !pub) {
    return (
      <div className="container artisans-empty" style={{ minHeight: '60vh', paddingTop: '120px' }}>
        <FiAlertCircle className="empty-icon-lg" />
        <h3>{error || 'Publication introuvable'}</h3>
        <Link to="/publications" className="btn btn-primary"><FiArrowLeft /> Retour aux publications</Link>
      </div>
    );
  }

  const photos  = normalizePhotos(pub);
  const prix    = formatPrix(pub.prix);
  const d       = toDate(pub.datePublication || pub.dateCreation);
  const titre   = pub.titre || pub.legende?.substring(0, 80) || 'Réalisation';
  const description = pub.description || pub.legende || null;
  const isFlutter = !pub.titre && (pub.legende || pub.imageUrl || pub.imageUrls);
  const callUrl      = artisan ? `tel:${artisan.phoneCall || artisan.phoneNumber}` : '#';
  const whatsappUrl  = artisan
    ? `https://wa.me/${(artisan.phoneWhatsapp || artisan.phoneNumber || '').replace(/\D/g, '')}`
    : '#';

  return (
    <div className="pub-detail-page">
      {/* Retour */}
      <div className="container pub-detail-back">
        <Link to="/publications" className="back-link">
          <FiArrowLeft /> Toutes les publications
        </Link>
      </div>

      <div className="container pub-detail-layout">
        {/* Colonne principale */}
        <div className="pub-detail-main">

          {/* Galerie */}
          <div className="pub-detail-gallery">
            {photos.length > 0 ? (
              <>
                <button className="pub-main-photo" onClick={() => setGallery(0)}>
                  <img src={photos[0]} alt={pub.titre} />
                  {photos.length > 1 && (
                    <span className="pub-gallery-count-badge">
                      +{photos.length - 1} photo{photos.length > 2 ? 's' : ''}
                    </span>
                  )}
                </button>
                {photos.length > 1 && (
                  <div className="pub-gallery-thumbs">
                    {photos.slice(1, 4).map((url, i) => (
                      <button key={i} className="pub-thumb" onClick={() => setGallery(i + 1)}>
                        <img src={url} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="pub-detail-no-photo">
                <span>Pas de photo disponible</span>
              </div>
            )}
          </div>

          {/* En-tete */}
          <div className="pub-detail-header">
            {pub.categorie && <span className="pub-detail-cat-chip">{pub.categorie}</span>}
            <h1>{titre}</h1>
            <div className="pub-detail-meta">
              {pub.ville && (
                <span className="pub-meta-item"><FiMapPin /> {pub.ville}</span>
              )}
              {pub.nombreVues > 0 && (
                <span className="pub-meta-item"><FiEye /> {pub.nombreVues} vues</span>
              )}
              {d && (
                <span className="pub-meta-item">
                  <FiCalendar /> {d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
            {prix && <div className="pub-detail-prix">{prix}</div>}

            {/* Likes & commentaires */}
            <div className="pub-detail-reactions">
              <button
                className={`pub-react-btn ${liked ? 'pub-react-btn--liked' : ''}`}
                onClick={handleLike}
                aria-label="J'aime"
              >
                <FiHeart size={18} className={liked ? 'heart-filled' : ''} />
                <span>{likesCount > 0 ? likesCount : ''} J'aime</span>
              </button>
              <button
                className="pub-react-btn"
                onClick={() => { setCommentsOpen(o => !o); setTimeout(() => commentInputRef.current?.focus(), 100); }}
              >
                <FiMessageSquare size={18} />
                <span>{comments.length > 0 ? comments.length : ''} Commenter</span>
              </button>
            </div>
          </div>

          {/* Description */}
          {description && (
            <div className="pub-detail-section">
              <h2>{isFlutter ? 'Légende' : 'Description'}</h2>
              <p className="pub-detail-desc">{description}</p>
            </div>
          )}


          {/* Informations complementaires */}
          {(pub.duree || pub.disponibilite) && (
            <div className="pub-detail-section">
              <h2>Details</h2>
              <div className="pub-detail-infos">
                {pub.duree && (
                  <div className="pub-detail-info-item">
                    <span className="pdi-label">Duree</span>
                    <span className="pdi-value">{pub.duree}</span>
                  </div>
                )}
                {pub.disponibilite && (
                  <div className="pub-detail-info-item">
                    <span className="pdi-label">Disponibilite</span>
                    <span className="pdi-value">{pub.disponibilite}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section commentaires */}
          <div className="pub-detail-section pub-comments-section">
            <h2>
              <FiMessageSquare size={18} style={{ marginRight: 8 }} />
              Commentaires {comments.length > 0 && <span className="pub-comments-count">({comments.length})</span>}
            </h2>

            {/* Liste */}
            {comments.length > 0 ? (
              <div className="pub-comments-list">
                {comments.map((c, i) => (
                  <div key={c.id || i} className="pub-comment-item">
                    <div className="pub-comment-avatar">{(c.auteurNom || 'A').charAt(0).toUpperCase()}</div>
                    <div className="pub-comment-body">
                      <strong className="pub-comment-name">{c.auteurNom || 'Anonyme'}</strong>
                      <p className="pub-comment-text">{c.texte}</p>
                      {c.createdAt && (
                        <span className="pub-comment-date">
                          {(c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt))
                            .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pub-no-comments">Aucun commentaire pour l'instant. Soyez le premier !</p>
            )}

            {/* Formulaire */}
            <form className="pub-comment-form" onSubmit={handleAddComment}>
              {!user && (
                <input
                  type="text"
                  className="pub-comment-name-input"
                  placeholder="Votre prénom (optionnel)"
                  value={commentName}
                  onChange={e => setCommentName(e.target.value)}
                  maxLength={40}
                />
              )}
              <div className="pub-comment-input-row">
                <textarea
                  ref={commentInputRef}
                  className="pub-comment-textarea"
                  placeholder="Écrivez un commentaire…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={2}
                  maxLength={500}
                  required
                />
                <button
                  type="submit"
                  className="pub-comment-send"
                  disabled={sendingComment || !commentText.trim()}
                  aria-label="Envoyer"
                >
                  <FiSend size={18} />
                </button>
              </div>
            </form>
          </div>

          {/* Artisan section mobile */}
          {artisan && (
            <div className="pub-detail-section pub-artisan-mobile">
              <ArtisanCard artisan={artisan} callUrl={callUrl} whatsappUrl={whatsappUrl} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="pub-detail-sidebar">
          {/* Prix */}
          <div className="pub-sidebar-card pub-price-card">
            {prix ? (
              <>
                <div className="pub-sidebar-prix">{prix}</div>
                <p className="pub-sidebar-prix-note">Prix indicatif · a negocier</p>
              </>
            ) : (
              <>
                <div className="pub-sidebar-prix-libre">Prix sur demande</div>
                <p className="pub-sidebar-prix-note">Contactez l'artisan pour un devis</p>
              </>
            )}

            {artisan && (
              <div className="pub-sidebar-actions">
                <a href={callUrl} className="btn btn-primary w-full">
                  <FiPhone /> Appeler
                </a>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp-solid">
                  <FiMessageCircle /> WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* Artisan */}
          {artisan && (
            <div className="pub-sidebar-card">
              <ArtisanCard artisan={artisan} callUrl={callUrl} whatsappUrl={whatsappUrl} sidebar />
            </div>
          )}
        </aside>
      </div>

      {/* Lightbox */}
      {gallery !== null && (
        <div className="lightbox" onClick={() => setGallery(null)}>
          <button className="lightbox-close"><FiX /></button>
          <button className="lightbox-prev" onClick={e => { e.stopPropagation(); setGallery(g => (g - 1 + photos.length) % photos.length); }}>
            <FiChevronLeft />
          </button>
          <img src={photos[gallery]} alt="" onClick={e => e.stopPropagation()} />
          <button className="lightbox-next" onClick={e => { e.stopPropagation(); setGallery(g => (g + 1) % photos.length); }}>
            <FiChevronRight />
          </button>
          <span className="lightbox-counter">{gallery + 1} / {photos.length}</span>
        </div>
      )}
    </div>
  );
}

function ArtisanCard({ artisan, callUrl, whatsappUrl, sidebar }) {
  return (
    <div className={`pub-artisan-card ${sidebar ? 'pub-artisan-card--sidebar' : ''}`}>
      <h3 className="pub-artisan-title">L'artisan</h3>
      <div className="pub-artisan-row">
        {artisan.photoUrl ? (
          <img src={artisan.photoUrl} alt={artisan.nom} className="pub-artisan-photo" />
        ) : (
          <div className="pub-artisan-photo-placeholder">
            {artisan.nom?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <div className="pub-artisan-info">
          <strong>{artisan.nom}</strong>
          <span>{artisan.metierPrincipal}</span>
          {artisan.ville && <span className="pub-artisan-ville"><FiMapPin /> {artisan.ville}</span>}
        </div>
      </div>
      <Link to={`/artisans/${artisan.uid}`} className="pub-artisan-profile-link">
        <FiUser /> Voir le profil complet
      </Link>
      {!sidebar && (
        <div className="pub-artisan-btns">
          <a href={callUrl} className="btn btn-primary"><FiPhone /> Appeler</a>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp-solid">
            <FiMessageCircle /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
