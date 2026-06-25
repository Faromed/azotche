import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiPhone, FiMessageCircle, FiMapPin, FiStar,
  FiAward, FiZap, FiEye, FiX, FiChevronLeft, FiChevronRight,
  FiCalendar, FiClock, FiEdit3, FiLoader, FiCheck,
  FiAlertCircle, FiImage, FiGrid,
} from 'react-icons/fi';
import {
  doc, updateDoc, increment,
  collection, query, where, getDocs, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { fetchArtisanByUid, fetchAvisForArtisan } from '../hooks/useArtisans';
import { useAuth } from '../context/AuthContext';
import { checkAvisExistant, useSubmitAvis, useEditAvis } from '../hooks/useAvis';
import usePageMeta from '../hooks/usePageMeta';
import MapView from '../components/MapView';

const toDate = (v) => v?.toDate?.() ?? (v instanceof Date ? v : null);

function Stars({ note, max = 5 }) {
  return (
    <div className="stars-row">
      {Array.from({ length: max }).map((_, i) => (
        <FiStar key={i} className={i < Math.round(note) ? 'star filled' : 'star'} />
      ))}
    </div>
  );
}

function StarsInput({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="stars-input">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          className={`star-btn ${i < (hovered || value) ? 'active' : ''}`}
          onMouseEnter={() => !disabled && setHovered(i + 1)}
          onMouseLeave={() => !disabled && setHovered(0)}
          onClick={() => !disabled && onChange(i + 1)}
          disabled={disabled}
          aria-label={`${i + 1} etoile${i > 0 ? 's' : ''}`}
        >
          <FiStar />
        </button>
      ))}
      {value > 0 && (
        <span className="stars-input-label">
          {['', 'Mauvais', 'Passable', 'Bien', 'Tres bien', 'Excellent'][value]}
        </span>
      )}
    </div>
  );
}

export default function ArtisanProfilePage() {
  const { uid } = useParams();
  const { user, profile } = useAuth();

  const [artisan, setArtisan]     = useState(null);

  usePageMeta(artisan ? {
    title: `${artisan.nom} — ${artisan.metierPrincipal}${artisan.ville ? ' a ' + artisan.ville : ''}`,
    description: artisan.description
      ? artisan.description.slice(0, 155)
      : `Contactez ${artisan.nom}, ${artisan.metierPrincipal} a ${artisan.ville || 'Benin'}. Profil verifie sur Azotche.`,
    ogImage: artisan.photoUrl || undefined,
    ogType: 'profile',
  } : { title: 'Profil artisan' });

  const [avis, setAvis]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [gallery, setGallery]     = useState(null);

  const [myAvis, setMyAvis]             = useState(null);
  const [checkingAvis, setCheckingAvis] = useState(false);
  const [showAvisForm, setShowAvisForm] = useState(false);
  const [avisNote, setAvisNote]         = useState(0);
  const [avisComment, setAvisComment]   = useState('');
  const [avisSuccess, setAvisSuccess]   = useState(false);
  const [editingMyAvis, setEditingMyAvis] = useState(false);

  const { submitting, error: submitError, setError: setSubmitError, submitAvis } = useSubmitAvis();
  const { saving: editSaving, editAvis } = useEditAvis();

  // Chargement profil + avis
  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    Promise.all([
      fetchArtisanByUid(uid),
      fetchAvisForArtisan(uid),
    ])
      .then(([artisanData, avisData]) => {
        setArtisan(artisanData);
        setAvis(avisData);
      })
      .catch(() => setError('Impossible de charger ce profil.'))
      .finally(() => setLoading(false));
  }, [uid]);

  // Incrementer vues (comme Flutter pros_provider.incrementVues)
  useEffect(() => {
    if (!uid || !artisan) return;
    if (user?.uid === uid) return;
    updateDoc(doc(db, 'pros', uid), { nombreVues: increment(1) }).catch(() => {});
  }, [uid, artisan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Verifier si l'utilisateur a deja note cet artisan
  useEffect(() => {
    if (!user?.uid || !uid || user.uid === uid) return;
    setCheckingAvis(true);
    checkAvisExistant(uid, user.uid)
      .then(setMyAvis)
      .finally(() => setCheckingAvis(false));
  }, [user?.uid, uid]);

  const canLeaveAvis = user && profile?.role === 'client' && user.uid !== uid && !checkingAvis;

  const handleSubmitAvis = async () => {
    if (avisNote === 0) { setSubmitError('Veuillez choisir une note.'); return; }
    if (!avisComment.trim()) { setSubmitError('Veuillez ecrire un commentaire.'); return; }
    const result = await submitAvis({
      proUid: uid,
      clientUid: user.uid,
      clientNom: profile?.nom || user.displayName || 'Client',
      clientPhotoUrl: profile?.photoUrl || user.photoURL || '',
      note: avisNote,
      commentaire: avisComment,
    });
    if (result.success) {
      const newAvis = {
        id: result.id, proUid: uid, clientUid: user.uid,
        clientNom: profile?.nom || user.displayName || 'Client',
        note: avisNote, commentaire: avisComment, date: new Date(), statut: 'approved',
      };
      setMyAvis(newAvis);
      setAvis(prev => [newAvis, ...prev]);
      setArtisan(prev => prev ? {
        ...prev,
        noteMoyenne: ((prev.noteMoyenne || 0) * (prev.nombreAvis || 0) + avisNote) / ((prev.nombreAvis || 0) + 1),
        nombreAvis: (prev.nombreAvis || 0) + 1,
      } : prev);
      setAvisSuccess(true);
      setShowAvisForm(false);
      setAvisNote(0);
      setAvisComment('');
      setTimeout(() => setAvisSuccess(false), 4000);
    }
  };

  const handleEditAvis = async () => {
    if (avisNote === 0 || !avisComment.trim()) return;
    const result = await editAvis(myAvis.id, uid, { note: avisNote, commentaire: avisComment });
    if (result.success) {
      const updated = { ...myAvis, note: avisNote, commentaire: avisComment };
      setMyAvis(updated);
      setAvis(prev => prev.map(a => a.id === myAvis.id ? updated : a));
      setEditingMyAvis(false);
      setAvisSuccess(true);
      setTimeout(() => setAvisSuccess(false), 4000);
    }
  };

  const startEditMyAvis = () => {
    setAvisNote(myAvis.note);
    setAvisComment(myAvis.commentaire || '');
    setEditingMyAvis(true);
    setShowAvisForm(false);
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-skeleton-hero" />
        <div className="container"><div className="profile-skeleton-body" /></div>
      </div>
    );
  }

  if (error || !artisan) {
    return (
      <div className="container artisans-empty" style={{ minHeight: '60vh' }}>
        <FiAlertCircle className="empty-icon-lg" />
        <h3>Profil introuvable</h3>
        <p>{error || "Cet artisan n'existe pas ou a ete supprime."}</p>
        <Link to="/artisans" className="btn btn-primary"><FiArrowLeft /> Retour a l'annuaire</Link>
      </div>
    );
  }

  const planClass   = artisan.plan === 'premium' || artisan.comptePayant ? 'plan-premium'
    : artisan.plan === 'pro' ? 'plan-pro' : '';
  const whatsappUrl = `https://wa.me/${(artisan.phoneWhatsapp || '').replace(/\D/g, '')}`;
  const callUrl     = `tel:${artisan.phoneCall || artisan.phoneNumber}`;
  const galleryImages = artisan.galerie || [];

  // Suivi contacts (Flutter : pros_provider.incrementClicsAppel / incrementClicsWhatsApp)
  const handleCall = () => {
    updateDoc(doc(db, 'pros', uid), { nombreClicsAppel: increment(1) }).catch(() => {});
    window.location.href = callUrl;
  };
  const handleWhatsApp = () => {
    updateDoc(doc(db, 'pros', uid), { nombreClicsWhatsApp: increment(1) }).catch(() => {});
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`profile-page ${planClass}`}>
      <div className="container profile-back">
        <Link to="/artisans" className="back-link"><FiArrowLeft /> Retour a l'annuaire</Link>
      </div>

      {/* Hero */}
      <section className="profile-hero">
        <div className="container">
          <div className="profile-hero-inner">
            <div className="profile-photo-wrap">
              {artisan.photoUrl ? (
                <img src={artisan.photoUrl} alt={artisan.nom} className="profile-photo" />
              ) : (
                <div className="profile-photo-placeholder">{artisan.nom?.charAt(0)?.toUpperCase() || '?'}</div>
              )}
              {artisan.isCertified && <div className="profile-certified-badge"><FiAward /> Verifie</div>}
              {artisan.boostActif && <div className="profile-boost-badge"><FiZap /> Booste</div>}
            </div>
            <div className="profile-info">
              <div className="profile-name-row">
                <h1>{artisan.nom}</h1>
                {(artisan.plan === 'premium' || artisan.comptePayant) && <span className="premium-chip">Premium</span>}
                {artisan.plan === 'pro' && !artisan.comptePayant && <span className="pro-chip">Pro</span>}
              </div>
              <p className="profile-metier">{artisan.metierPrincipal}</p>
              {artisan.metiersSecondaires?.length > 0 && (
                <div className="profile-metiers-sec">
                  {artisan.metiersSecondaires.map(m => <span key={m} className="metier-chip">{m}</span>)}
                </div>
              )}
              <div className="profile-meta-row">
                {artisan.ville && (
                  <span className="meta-item"><FiMapPin /> {artisan.ville}{artisan.quartier && `, ${artisan.quartier}`}</span>
                )}
                {artisan.noteMoyenne > 0 && (
                  <span className="meta-item meta-note">
                    <FiStar /> {artisan.noteMoyenne.toFixed(1)}
                    <span className="note-count">({artisan.nombreAvis} avis)</span>
                  </span>
                )}
                {artisan.nombreVues > 0 && <span className="meta-item"><FiEye /> {artisan.nombreVues} vues</span>}
                {artisan.anneesExperience && (
                  <span className="meta-item"><FiClock /> {artisan.anneesExperience} an{artisan.anneesExperience > 1 ? 's' : ''} d'experience</span>
                )}
              </div>
              <div className="profile-contact-btns">
                <button onClick={handleCall} className="btn-contact btn-call"><FiPhone /> Appeler</button>
                <button onClick={handleWhatsApp} className="btn-contact btn-whatsapp">
                  <FiMessageCircle /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Corps */}
      <div className="container profile-body">
        <div className="profile-layout">
          <div className="profile-main">

            {artisan.description && (
              <section className="profile-section">
                <h2>A propos</h2>
                <p className="profile-description">{artisan.description}</p>
              </section>
            )}

            {/* Galerie photos brutes */}
            {galleryImages.length > 0 && (
              <section className="profile-section">
                <h2><FiImage size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />Galerie</h2>
                <div className="profile-gallery">
                  {galleryImages.map((url, i) => (
                    <button key={i} className="gallery-item" onClick={() => setGallery(i)}>
                      <img src={url} alt={`Photo ${i + 1}`} loading="lazy" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Réalisations avec légende (port du tab Flutter InspirationCard) */}
            <ArtisanRealisations proUid={uid} />

            {/* Avis */}
            <section className="profile-section">
              <div className="avis-section-head">
                <h2>Avis clients {avis.length > 0 && <span className="avis-count-badge">{avis.length}</span>}</h2>
                {canLeaveAvis && !myAvis && !showAvisForm && (
                  <button className="btn-leave-avis" onClick={() => setShowAvisForm(true)}>
                    <FiStar /> Laisser un avis
                  </button>
                )}
              </div>

              {avisSuccess && (
                <div className="avis-success-bar"><FiCheck /> Votre avis a ete publie !</div>
              )}

              {myAvis && !editingMyAvis && (
                <div className="my-avis-card">
                  <div className="my-avis-head">
                    <span className="my-avis-label"><FiCheck /> Votre avis</span>
                    <button className="btn-edit-avis" onClick={startEditMyAvis}><FiEdit3 /> Modifier</button>
                  </div>
                  <Stars note={myAvis.note} />
                  {myAvis.commentaire && <p className="avis-comment">{myAvis.commentaire}</p>}
                </div>
              )}

              {myAvis && editingMyAvis && (
                <div className="avis-form-card">
                  <h4>Modifier votre avis</h4>
                  <StarsInput value={avisNote} onChange={setAvisNote} disabled={editSaving} />
                  <textarea
                    className="avis-textarea"
                    value={avisComment}
                    onChange={e => setAvisComment(e.target.value)}
                    placeholder="Partagez votre experience avec cet artisan…"
                    maxLength={500}
                    disabled={editSaving}
                  />
                  <span className="avis-char-count">{avisComment.length}/500</span>
                  <div className="avis-form-actions">
                    <button className="btn btn-outline" onClick={() => setEditingMyAvis(false)} disabled={editSaving}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleEditAvis} disabled={editSaving || avisNote === 0}>
                      {editSaving ? <><FiLoader className="spinner" /> Sauvegarde…</> : <><FiCheck /> Mettre a jour</>}
                    </button>
                  </div>
                </div>
              )}

              {showAvisForm && !myAvis && (
                <div className="avis-form-card">
                  <h4>Votre avis sur {artisan.nom}</h4>
                  <StarsInput value={avisNote} onChange={setAvisNote} disabled={submitting} />
                  {submitError && <p className="avis-form-error">{submitError}</p>}
                  <textarea
                    className="avis-textarea"
                    value={avisComment}
                    onChange={e => { setAvisComment(e.target.value); setSubmitError(null); }}
                    placeholder="Partagez votre experience : qualite du travail, serieux, ponctualite…"
                    maxLength={500}
                    disabled={submitting}
                  />
                  <span className="avis-char-count">{avisComment.length}/500</span>
                  <div className="avis-form-actions">
                    <button className="btn btn-outline" onClick={() => { setShowAvisForm(false); setAvisNote(0); setAvisComment(''); setSubmitError(null); }} disabled={submitting}>
                      Annuler
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmitAvis} disabled={submitting || avisNote === 0}>
                      {submitting ? <><FiLoader className="spinner" /> Publication…</> : <><FiStar /> Publier l'avis</>}
                    </button>
                  </div>
                </div>
              )}

              {!user && (
                <div className="avis-login-cta">
                  <FiStar />
                  <p>Connectez-vous pour laisser un avis sur cet artisan</p>
                  <Link to="/connexion" className="btn btn-outline btn-sm">Se connecter</Link>
                </div>
              )}

              {avis.length > 0 && artisan.noteMoyenne > 0 && (
                <div className="avis-summary">
                  <span className="avis-avg">{artisan.noteMoyenne.toFixed(1)}</span>
                  <div>
                    <Stars note={artisan.noteMoyenne} />
                    <span className="avis-total">{artisan.nombreAvis} avis</span>
                  </div>
                </div>
              )}

              {avis.length > 0 ? (
                <div className="avis-list">
                  {avis.map(av => <AvisCard key={av.id} avis={av} myUid={user?.uid} />)}
                </div>
              ) : (
                !showAvisForm && !myAvis && (
                  <div className="avis-empty">
                    <FiStar />
                    <p>Aucun avis pour l'instant. Soyez le premier a noter cet artisan !</p>
                  </div>
                )
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="profile-sidebar">
            <div className="sidebar-card">
              <h3>Informations</h3>
              <ul className="info-list">
                {artisan.adresse && <li><FiMapPin /> <span>{artisan.adresse}</span></li>}
                {artisan.dateInscription && (() => {
                  const d = toDate(artisan.dateInscription);
                  return d ? (
                    <li><FiCalendar /><span>Membre depuis {d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span></li>
                  ) : null;
                })()}
              </ul>
              <div className="sidebar-contact">
                <button onClick={handleCall} className="btn btn-primary w-full"><FiPhone /> Appeler maintenant</button>
                <button onClick={handleWhatsApp} className="btn-whatsapp-solid w-full">
                  <FiMessageCircle /> Contacter sur WhatsApp
                </button>
              </div>
            </div>

            {(artisan.localisation || artisan.geopoint || artisan.ville) && (
              <div className="sidebar-card map-sidebar-card">
                <h3><FiMapPin /> Localisation</h3>
                <MapView artisan={artisan} height={220} />
                <Link
                  to="/carte"
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'center' }}
                >
                  <FiMapPin size={14} /> Voir sur la carte interactive
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Lightbox galerie */}
      {gallery !== null && (
        <div className="lightbox" onClick={() => setGallery(null)}>
          <button className="lightbox-close"><FiX /></button>
          <button className="lightbox-prev" onClick={e => { e.stopPropagation(); setGallery(g => (g - 1 + galleryImages.length) % galleryImages.length); }}>
            <FiChevronLeft />
          </button>
          <img src={galleryImages[gallery]} alt={`Photo ${gallery + 1}`} onClick={e => e.stopPropagation()} />
          <button className="lightbox-next" onClick={e => { e.stopPropagation(); setGallery(g => (g + 1) % galleryImages.length); }}>
            <FiChevronRight />
          </button>
          <span className="lightbox-counter">{gallery + 1} / {galleryImages.length}</span>
        </div>
      )}
    </div>
  );
}

// ── Réalisations : publications de l'artisan avec légende (port du tab Flutter) ──
function ArtisanRealisations({ proUid }) {
  const [pubs, setPubs]         = useState(null);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!proUid) return;
    const q = query(
      collection(db, 'publications'),
      where('proUid', '==', proUid),
      orderBy('datePublication', 'desc'),
      limit(30),
    );
    getDocs(q)
      .then(snap => setPubs(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {
        // Fallback sans orderBy si index composite manquant
        const q2 = query(collection(db, 'publications'), where('proUid', '==', proUid), limit(30));
        getDocs(q2).then(snap => {
          const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          arr.sort((a, b) => {
            const ts = d => {
              const v = d.datePublication || d.dateCreation || d.date;
              return v?.toMillis ? v.toMillis() : 0;
            };
            return ts(b) - ts(a);
          });
          setPubs(arr);
        }).catch(() => setPubs([]));
      });
  }, [proUid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (pubs === null || pubs.length === 0) return null;

  const getPhoto  = (pub) => pub.photos?.[0] || pub.imageUrl || pub.imageUrls?.[0] || null;
  const getPhotos = (pub) => pub.imageUrls || pub.photos || (pub.imageUrl ? [pub.imageUrl] : []);

  const closeLightbox = () => setLightbox(null);
  const prevImg = () => {
    const imgs = getPhotos(lightbox.pub);
    setLightbox(lb => ({ ...lb, imgIdx: (lb.imgIdx - 1 + imgs.length) % imgs.length }));
  };
  const nextImg = () => {
    const imgs = getPhotos(lightbox.pub);
    setLightbox(lb => ({ ...lb, imgIdx: (lb.imgIdx + 1) % imgs.length }));
  };

  return (
    <>
      <section className="profile-section">
        <h2>
          <FiGrid size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />
          Réalisations
        </h2>
        <div className="realisations-grid">
          {pubs.map(pub => {
            const photo = getPhoto(pub);
            const imgs  = getPhotos(pub);
            return (
              <div
                key={pub.id}
                className="realisation-card"
                onClick={() => photo && setLightbox({ pub, imgIdx: 0 })}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && photo && setLightbox({ pub, imgIdx: 0 })}
              >
                <div className="realisation-img-wrap">
                  {photo ? (
                    <img src={photo} alt={pub.legende || pub.titre || 'Réalisation'} loading="lazy" />
                  ) : (
                    <div className="realisation-img-placeholder"><FiImage size={24} /></div>
                  )}
                  {imgs.length > 1 && (
                    <span className="realisation-count"><FiImage size={11} /> {imgs.length}</span>
                  )}
                </div>
                {(pub.legende || pub.description) && (
                  <p className="realisation-legende">
                    {(pub.legende || pub.description).length > 120
                      ? (pub.legende || pub.description).substring(0, 120) + '...'
                      : (pub.legende || pub.description)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Lightbox réalisations */}
      {lightbox && (() => {
        const imgs = getPhotos(lightbox.pub);
        return (
          <div className="lightbox" onClick={closeLightbox}>
            <button className="lightbox-close" onClick={closeLightbox}><FiX /></button>
            {imgs.length > 1 && (
              <button className="lightbox-prev" onClick={e => { e.stopPropagation(); prevImg(); }}>
                <FiChevronLeft />
              </button>
            )}
            <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
              <img src={imgs[lightbox.imgIdx]} alt={lightbox.pub.legende || ''} />
              {(lightbox.pub.legende || lightbox.pub.description) && (
                <p className="lightbox-caption">{lightbox.pub.legende || lightbox.pub.description}</p>
              )}
            </div>
            {imgs.length > 1 && (
              <button className="lightbox-next" onClick={e => { e.stopPropagation(); nextImg(); }}>
                <FiChevronRight />
              </button>
            )}
            {imgs.length > 1 && (
              <span className="lightbox-counter">{lightbox.imgIdx + 1} / {imgs.length}</span>
            )}
          </div>
        );
      })()}
    </>
  );
}

function AvisCard({ avis, myUid }) {
  const d = toDate(avis.dateCreation || avis.date);
  const isMe = avis.clientUid === myUid;
  return (
    <div className={`avis-card ${isMe ? 'avis-card--mine' : ''}`}>
      <div className="avis-header">
        <div className="avis-author">
          {avis.clientPhotoUrl ? (
            <img src={avis.clientPhotoUrl} alt={avis.clientNom} className="avis-avatar-img" />
          ) : (
            <div className="avis-avatar-placeholder">
              {avis.clientNom?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="avis-author-info">
            <span className="avis-author-name">
              {isMe ? 'Vous' : (avis.clientNom || 'Anonyme')}
              {isMe && <span className="avis-mine-badge">vous</span>}
            </span>
            {d && (
              <span className="avis-date">
                {d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
        <div className="avis-stars">
          {[1,2,3,4,5].map(n => (
            <FiStar key={n} className={n <= avis.note ? 'star-filled' : 'star-empty'} />
          ))}
          <span className="avis-note-num">{avis.note}/5</span>
        </div>
      </div>
      {avis.commentaire && <p className="avis-comment">{avis.commentaire}</p>}
    </div>
  );
}
