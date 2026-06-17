import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiUser, FiEdit3, FiSave, FiCamera, FiPlus, FiTrash2,
  FiEye, FiStar, FiPhone, FiMapPin, FiZap, FiAward,
  FiAlertCircle, FiCheck, FiLoader, FiImage, FiClock,
  FiFileText, FiX, FiToggleLeft, FiToggleRight,
  FiTrendingUp, FiGift, FiArrowRight, FiTool, FiShare2,
  FiCopy, FiDownload, FiShield, FiFlag, FiLink,
} from 'react-icons/fi';
import { FaWhatsapp, FaFacebook } from 'react-icons/fa';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProfileUpdate } from '../hooks/useProfileUpdate';
import { fetchArtisanByUid } from '../hooks/useArtisans';
import {
  fetchProPublications,
  usePublicationCrud,
} from '../hooks/usePublications';
import { useAvisArtisan } from '../hooks/useAvis';

const METIERS = [
  'Tailleur', 'Coiffeur', 'Plombier', 'Electricien', 'Macon',
  'Menuisier', 'Soudeur', 'Mecanicien', 'Peintre', 'Photographe',
  'Informaticien', 'Traiteur', 'Carreleur', 'Climaticien', 'Autre',
];

const CATEGORIES = [
  'Couture', 'Coiffure', 'Plomberie', 'Electricite', 'Maconnerie',
  'Menuiserie', 'Soudure', 'Mecanique', 'Peinture', 'Photographie',
  'Informatique', 'Traiteur', 'Carrelage', 'Climatisation', 'Autre',
];

const formatPrix = (p) => p != null ? Number(p).toLocaleString('fr-FR') + ' FCFA' : null;

export default function EspaceProPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const uid = user?.uid;

  const {
    saving: savingProfile, progress, error, setError,
    saveUserInfo, saveProInfo,
    uploadProfilePhoto, uploadGalleryImage, deleteGalleryImage,
  } = useProfileUpdate(uid);

  const {
    saving: savingPub, progress: pubProgress, error: pubError, setError: setPubError,
    createPublication, updatePublication, togglePublication,
    deletePublication, uploadPublicationPhoto,
  } = usePublicationCrud(uid);

  // Navigation par onglets
  const [activeTab, setActiveTab] = useState('profil');

  // Onglet avis
  const { avis, loading: loadingAvis, loadAvis } = useAvisArtisan(uid);

  // Donnees profil
  const [artisan, setArtisan]         = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saved, setSaved]             = useState(null);
  const [editSection, setEditSection] = useState(null);

  // Champs profil
  const [nom, setNom]               = useState('');
  const [ville, setVille]           = useState('');
  const [quartier, setQuartier]     = useState('');
  const [phoneCall, setPhoneCall]   = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [metier, setMetier]         = useState('');
  const [description, setDescription] = useState('');
  const [anneesExp, setAnneesExp]   = useState('');

  const photoInputRef   = useRef(null);
  const galleryInputRef = useRef(null);
  const pubPhotoRef     = useRef(null);

  // Publications
  const [publications, setPublications]   = useState([]);
  const [loadingPubs, setLoadingPubs]     = useState(false);
  const [showPubForm, setShowPubForm]     = useState(false);
  const [editingPub, setEditingPub]       = useState(null); // null = creation, else pub object
  const [pubTitre, setPubTitre]           = useState('');
  const [pubDescription, setPubDescription] = useState('');
  const [pubPrix, setPubPrix]             = useState('');
  const [pubCategorie, setPubCategorie]   = useState('');
  const [pubVille, setPubVille]           = useState('');
  const [pubPhotos, setPubPhotos]         = useState([]);
  const [uploadingPubPhoto, setUploadingPubPhoto] = useState(false);
  const [deletingPubId, setDeletingPubId] = useState(null);

  // ── Quotas publications depuis config/app ────────────────────────────────────
  const [pubQuota, setPubQuota] = useState({ gratuit: 3, pro: 15 });
  useEffect(() => {
    getDoc(doc(db, 'config', 'app')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setPubQuota({
          gratuit: d.quota_gratuit ?? 3,
          pro:     d.quota_pro     ?? 15,
        });
      }
    }).catch(() => {});
  }, []);

  // Quota de l'artisan selon son plan
  const getPubLimit = () => {
    const plan = artisan?.plan || 'gratuit';
    if (plan === 'premium') return Infinity;
    if (plan === 'pro') return pubQuota.pro;
    return pubQuota.gratuit;
  };

  // Chargement initial profil
  useEffect(() => {
    if (!uid) return;
    setLoadingData(true);
    fetchArtisanByUid(uid)
      .then(data => {
        setArtisan(data);
        if (data) {
          setNom(data.nom || '');
          setVille(data.ville || '');
          setQuartier(data.quartier || '');
          setPhoneCall(data.phoneCall || data.phoneNumber || '');
          setPhoneWhatsapp(data.phoneWhatsapp || data.phoneNumber || '');
          setMetier(data.metierPrincipal || '');
          setDescription(data.description || '');
          setAnneesExp(data.anneesExperience?.toString() || '');
        }
      })
      .finally(() => setLoadingData(false));
  }, [uid]);

  // Chargement publications quand on passe sur l'onglet
  useEffect(() => {
    if (activeTab !== 'publications' || !uid) return;
    setLoadingPubs(true);
    fetchProPublications(uid)
      .then(setPublications)
      .finally(() => setLoadingPubs(false));
  }, [activeTab, uid]);

  // Chargement avis quand on passe sur l'onglet avis
  useEffect(() => {
    if (activeTab === 'avis' && uid) loadAvis();
  }, [activeTab, uid, loadAvis]);

  // ── Profil handlers ──────────────────────────────────────────────────────────
  const handleSaveInfo = async () => {
    const result = await saveUserInfo({ nom, ville, quartier, phoneCall, phoneWhatsapp, phoneNumber: phoneCall });
    if (result.success) {
      setArtisan(prev => ({ ...prev, nom, ville, quartier, phoneCall, phoneWhatsapp }));
      await refreshProfile();
      showSaved('info');
      setEditSection(null);
    }
  };

  const handleSavePro = async () => {
    const r1 = await saveProInfo({ description, categorie: metier });
    const r2 = await saveUserInfo({ metierPrincipal: metier, anneesExperience: anneesExp ? parseInt(anneesExp) : null });
    if (r1.success && r2.success) {
      setArtisan(prev => ({ ...prev, description, metierPrincipal: metier }));
      showSaved('pro');
      setEditSection(null);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadProfilePhoto(file);
    if (result.success) {
      setArtisan(prev => ({ ...prev, photoUrl: result.url }));
      await refreshProfile();
      showSaved('photo');
    }
    e.target.value = '';
  };

  const handleGalleryAdd = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadGalleryImage(file, artisan?.galerie || []);
    if (result.success) {
      setArtisan(prev => ({ ...prev, galerie: result.gallery }));
      showSaved('gallery');
    }
    e.target.value = '';
  };

  const handleGalleryDelete = async (url) => {
    if (!window.confirm('Supprimer cette photo de la galerie ?')) return;
    const result = await deleteGalleryImage(url, artisan?.galerie || []);
    if (result.success) setArtisan(prev => ({ ...prev, galerie: result.gallery }));
  };

  const showSaved = (section) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 3000);
  };

  // ── Publications handlers ────────────────────────────────────────────────────
  const openCreateForm = () => {
    const limit = getPubLimit();
    if (publications.length >= limit) {
      const plan = artisan?.plan || 'gratuit';
      setPubError(
        `Quota atteint (${limit} publication${limit > 1 ? 's' : ''} max pour le plan ${plan === 'pro' ? 'Pro' : 'Gratuit'}).` +
        ` Passez au plan supérieur pour publier davantage.`
      );
      setActiveTab('publications');
      return;
    }
    setEditingPub(null);
    setPubTitre(''); setPubDescription(''); setPubPrix('');
    setPubCategorie(''); setPubVille(ville || ''); setPubPhotos([]);
    setShowPubForm(true);
  };

  const openEditForm = (pub) => {
    setEditingPub(pub);
    setPubTitre(pub.titre || '');
    setPubDescription(pub.description || '');
    setPubPrix(pub.prix != null ? String(pub.prix) : '');
    setPubCategorie(pub.categorie || '');
    setPubVille(pub.ville || '');
    setPubPhotos(pub.photos || []);
    setShowPubForm(true);
  };

  const closePubForm = () => {
    setShowPubForm(false);
    setEditingPub(null);
    setPubPhotos([]);
  };

  const handleAddPubPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pubPhotos.length >= 4) { alert('Maximum 4 photos par publication.'); return; }
    setUploadingPubPhoto(true);
    const result = await uploadPublicationPhoto(file);
    if (result.success) setPubPhotos(prev => [...prev, result.url]);
    setUploadingPubPhoto(false);
    e.target.value = '';
  };

  const handleRemovePubPhoto = (url) => {
    setPubPhotos(prev => prev.filter(u => u !== url));
  };

  const handleSavePub = async () => {
    if (!pubTitre.trim()) { alert('Le titre est obligatoire.'); return; }
    const data = {
      titre: pubTitre.trim(),
      description: pubDescription.trim(),
      prix: pubPrix ? parseFloat(pubPrix) : null,
      categorie: pubCategorie,
      ville: pubVille.trim(),
      photos: pubPhotos,
      proNom: nom || profile?.nom || '',
      proPhotoUrl: artisan?.photoUrl || '',
    };
    let result;
    if (editingPub) {
      result = await updatePublication(editingPub.id, data);
      if (result.success) {
        setPublications(prev => prev.map(p => p.id === editingPub.id ? { ...p, ...data } : p));
      }
    } else {
      result = await createPublication(data);
      if (result.success) {
        setPublications(prev => [{ id: result.id, ...data, statut: 'actif', nombreVues: 0, dateCreation: new Date() }, ...prev]);
      }
    }
    if (result.success) closePubForm();
  };

  const handleTogglePub = async (pub) => {
    const result = await togglePublication(pub.id, pub.statut);
    if (result.success) {
      const newStatut = pub.statut === 'actif' ? 'inactif' : 'actif';
      setPublications(prev => prev.map(p => p.id === pub.id ? { ...p, statut: newStatut } : p));
    }
  };

  const handleDeletePub = async (pub) => {
    if (!window.confirm('Supprimer definitivement cette publication ?')) return;
    setDeletingPubId(pub.id);
    const result = await deletePublication(pub.id, pub.photos || []);
    if (result.success) setPublications(prev => prev.filter(p => p.id !== pub.id));
    setDeletingPubId(null);
  };

  if (loadingData) {
    return <div className="route-loading"><div className="route-loading-spinner" /></div>;
  }

  const galerie = artisan?.galerie || [];

  return (
    <div className="espace-pro-page">
      {/* Hero */}
      <div className="ep-hero">
        <div className="container">
          <div className="ep-hero-inner">
            {/* Photo profil */}
            <div className="ep-photo-wrap">
              <div className="ep-photo-container">
                {artisan?.photoUrl ? (
                  <img src={artisan.photoUrl} alt={artisan.nom} className="ep-photo" />
                ) : (
                  <div className="ep-photo-placeholder">{nom?.charAt(0)?.toUpperCase() || '?'}</div>
                )}
                <button className="ep-photo-btn" onClick={() => photoInputRef.current?.click()} disabled={savingProfile} title="Changer la photo">
                  {savingProfile && progress > 0 && progress < 100
                    ? <span className="photo-progress">{progress}%</span>
                    : <FiCamera />}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden-input" onChange={handlePhotoChange} />
              </div>
              {saved === 'photo' && <p className="ep-saved-hint">Photo mise a jour</p>}
            </div>

            {/* Resume */}
            <div className="ep-hero-info">
              <h1>{nom || 'Mon profil'}</h1>
              <p className="ep-metier">{metier || 'Artisan'}</p>
              <div className="ep-badges">
                {artisan?.isCertified && <span className="ep-badge ep-badge-certified"><FiAward /> Verifie</span>}
                {artisan?.boostActif && <span className="ep-badge ep-badge-boost"><FiZap /> Boost actif</span>}
                <span className={`ep-badge ep-badge-plan-${artisan?.plan}`}>
                  {artisan?.plan === 'premium' ? 'Premium' : artisan?.plan === 'pro' ? 'Pro' : 'Gratuit'}
                </span>
              </div>
              <Link to={`/artisans/${uid}`} className="ep-view-link" target="_blank"><FiEye /> Voir mon profil public</Link>
            </div>

            {/* Stats */}
            <div className="ep-stats">
              <div className="ep-stat">
                <span className="ep-stat-val">{artisan?.nombreVues || 0}</span>
                <span className="ep-stat-label"><FiEye /> Vues</span>
              </div>
              <div className="ep-stat">
                <span className="ep-stat-val">{artisan?.noteMoyenne ? artisan.noteMoyenne.toFixed(1) : '–'}</span>
                <span className="ep-stat-label"><FiStar /> Note</span>
              </div>
              <div className="ep-stat">
                <span className="ep-stat-val">{artisan?.nombreAvis || 0}</span>
                <span className="ep-stat-label">Avis</span>
              </div>
              <div className="ep-stat">
                <span className="ep-stat-val">{publications.length > 0 ? publications.length : '–'}</span>
                <span className="ep-stat-label"><FiFileText /> Offres</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corps */}
      <div className="container ep-body">
        {/* Onglets */}
        <div className="ep-tabs">
          <button className={`ep-tab ${activeTab === 'profil' ? 'active' : ''}`} onClick={() => setActiveTab('profil')}>
            <FiUser /> Mon profil
          </button>
          <button className={`ep-tab ${activeTab === 'publications' ? 'active' : ''}`} onClick={() => setActiveTab('publications')}>
            <FiFileText /> Mes publications
            {publications.length > 0 && activeTab !== 'publications' && (
              <span className="ep-tab-badge">{publications.length}</span>
            )}
          </button>
          <button className={`ep-tab ${activeTab === 'avis' ? 'active' : ''}`} onClick={() => setActiveTab('avis')}>
            <FiStar /> Avis recus
            {artisan?.nombreAvis > 0 && activeTab !== 'avis' && (
              <span className="ep-tab-badge">{artisan.nombreAvis}</span>
            )}
          </button>
          <button className={`ep-tab ${activeTab === 'croissance' ? 'active' : ''}`} onClick={() => setActiveTab('croissance')}>
            <FiTrendingUp /> Croissance
          </button>
          <button className={`ep-tab ${activeTab === 'outils' ? 'active' : ''}`} onClick={() => setActiveTab('outils')}>
            <FiTool /> Outils
          </button>
        </div>

        {/* Erreur globale profil */}
        {error && activeTab === 'profil' && (
          <div className="ep-alert ep-alert-error"><FiAlertCircle /> {error}<button onClick={() => setError(null)} className="ep-alert-close">x</button></div>
        )}

        {/* === ONGLET PROFIL === */}
        {activeTab === 'profil' && (
          <>
            {/* Section Infos */}
            <SectionCard
              icon={<FiUser />} title="Informations personnelles"
              saved={saved === 'info'} editing={editSection === 'info'}
              onEdit={() => setEditSection('info')} onCancel={() => setEditSection(null)}
              onSave={handleSaveInfo} saving={savingProfile}
            >
              {editSection === 'info' ? (
                <div className="ep-form">
                  <div className="ep-form-row">
                    <label>Nom complet</label>
                    <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom" />
                  </div>
                  <div className="ep-form-row">
                    <label>Ville</label>
                    <input type="text" value={ville} onChange={e => setVille(e.target.value)} placeholder="Ex: Cotonou" />
                  </div>
                  <div className="ep-form-row">
                    <label>Quartier</label>
                    <input type="text" value={quartier} onChange={e => setQuartier(e.target.value)} placeholder="Ex: Cadjehoun" />
                  </div>
                  <div className="ep-form-row">
                    <label>Numero d'appel</label>
                    <input type="tel" value={phoneCall} onChange={e => setPhoneCall(e.target.value)} placeholder="+229 XX XX XX XX" />
                  </div>
                  <div className="ep-form-row">
                    <label>Numero WhatsApp</label>
                    <input type="tel" value={phoneWhatsapp} onChange={e => setPhoneWhatsapp(e.target.value)} placeholder="+229 XX XX XX XX" />
                    <span className="ep-hint">Laisser vide si identique a l'appel</span>
                  </div>
                </div>
              ) : (
                <div className="ep-info-display">
                  <InfoRow icon={<FiUser />}   label="Nom"      value={nom || '—'} />
                  <InfoRow icon={<FiMapPin />} label="Ville"    value={[ville, quartier].filter(Boolean).join(', ') || '—'} />
                  <InfoRow icon={<FiPhone />}  label="Appel"    value={phoneCall || '—'} />
                  <InfoRow icon={<FiPhone />}  label="WhatsApp" value={phoneWhatsapp || '—'} />
                </div>
              )}
            </SectionCard>

            {/* Section Profil pro */}
            <SectionCard
              icon={<FiEdit3 />} title="Profil professionnel"
              saved={saved === 'pro'} editing={editSection === 'pro'}
              onEdit={() => setEditSection('pro')} onCancel={() => setEditSection(null)}
              onSave={handleSavePro} saving={savingProfile}
            >
              {editSection === 'pro' ? (
                <div className="ep-form">
                  <div className="ep-form-row">
                    <label>Metier principal</label>
                    <select value={metier} onChange={e => setMetier(e.target.value)}>
                      <option value="">— Choisir un metier —</option>
                      {METIERS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="ep-form-row">
                    <label>Annees d'experience</label>
                    <input type="number" min="0" max="50" value={anneesExp} onChange={e => setAnneesExp(e.target.value)} placeholder="Ex: 5" />
                  </div>
                  <div className="ep-form-row">
                    <label>Description / presentation</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Decrivez vos services, votre experience, ce qui vous differencie…" rows={5} maxLength={600} />
                    <span className="ep-hint">{description.length}/600 caracteres</span>
                  </div>
                </div>
              ) : (
                <div className="ep-info-display">
                  <InfoRow icon={<FiEdit3 />} label="Metier"      value={metier || '—'} />
                  <InfoRow icon={<FiClock />} label="Experience"  value={anneesExp ? `${anneesExp} an${anneesExp > 1 ? 's' : ''}` : '—'} />
                  <div className="ep-desc-preview">
                    {description
                      ? <p>{description}</p>
                      : <p className="ep-empty-hint">Aucune description. Ajoutez-en une pour attirer plus de clients !</p>}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Galerie */}
            <div className="ep-card">
              <div className="ep-card-header">
                <div className="ep-card-title"><FiImage /> Galerie ({galerie.length}/10)</div>
                {galerie.length < 10 && (
                  <button className="btn btn-primary ep-add-btn" onClick={() => galleryInputRef.current?.click()} disabled={savingProfile}>
                    {savingProfile && progress > 0 && progress < 100
                      ? <><FiLoader className="spinner" /> {progress}%</>
                      : <><FiPlus /> Ajouter une photo</>}
                  </button>
                )}
                <input ref={galleryInputRef} type="file" accept="image/*" className="hidden-input" onChange={handleGalleryAdd} />
              </div>
              {saved === 'gallery' && <div className="ep-saved-bar"><FiCheck /> Photo ajoutee a la galerie !</div>}
              {galerie.length === 0 ? (
                <div className="ep-gallery-empty">
                  <FiImage className="ep-gallery-empty-icon" />
                  <p>Votre galerie est vide.</p>
                  <p className="ep-hint">Ajoutez des photos de vos realisations pour convaincre vos clients.</p>
                </div>
              ) : (
                <div className="ep-gallery-grid">
                  {galerie.map((url, i) => (
                    <div key={url} className="ep-gallery-item">
                      <img src={url} alt={`Realisation ${i + 1}`} />
                      <button className="ep-gallery-delete" onClick={() => handleGalleryDelete(url)} title="Supprimer" disabled={savingProfile}>
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conseils */}
            <div className="ep-tips-card">
              <h3>Conseils pour attirer plus de clients</h3>
              <ul>
                <li className={nom && ville ? 'tip-done' : ''}>
                  {nom && ville ? <FiCheck /> : <span className="tip-num">1</span>}
                  Renseignez votre nom complet et votre ville
                </li>
                <li className={artisan?.photoUrl ? 'tip-done' : ''}>
                  {artisan?.photoUrl ? <FiCheck /> : <span className="tip-num">2</span>}
                  Ajoutez une photo de profil professionnelle
                </li>
                <li className={description.length >= 50 ? 'tip-done' : ''}>
                  {description.length >= 50 ? <FiCheck /> : <span className="tip-num">3</span>}
                  Redigez une description detaillee (min. 50 caracteres)
                </li>
                <li className={galerie.length >= 3 ? 'tip-done' : ''}>
                  {galerie.length >= 3 ? <FiCheck /> : <span className="tip-num">4</span>}
                  Ajoutez au moins 3 photos de vos realisations
                </li>
              </ul>
            </div>
          </>
        )}

        {/* === ONGLET PUBLICATIONS === */}
        {activeTab === 'publications' && (
          <div className="ep-card">
            <div className="mespub-header">
              <div className="mespub-header-left">
                <h3><FiFileText /> Mes publications ({publications.length})</h3>
                {(() => {
                  const limit = getPubLimit();
                  if (limit === Infinity) return <span className="pub-quota-badge unlimited">Publications illimitées ✓</span>;
                  const pct = Math.min(100, (publications.length / limit) * 100);
                  const full = publications.length >= limit;
                  return (
                    <div className="pub-quota-wrap">
                      <div className="pub-quota-bar">
                        <div className="pub-quota-fill" style={{ width: `${pct}%`, background: full ? '#EF4444' : '#FF6B35' }} />
                      </div>
                      <span className={`pub-quota-label ${full ? 'full' : ''}`}>
                        {publications.length}/{limit} {full ? '— Quota atteint' : ''}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <button
                className={`btn btn-primary ep-add-btn ${publications.length >= getPubLimit() ? 'disabled' : ''}`}
                onClick={openCreateForm}
              >
                <FiPlus /> Nouvelle offre
              </button>
            </div>

            {pubError && (
              <div className="ep-alert ep-alert-error" style={{ marginBottom: 16 }}>
                <FiAlertCircle /> {pubError}
                <button onClick={() => setPubError(null)} className="ep-alert-close">x</button>
              </div>
            )}

            {loadingPubs ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                <FiLoader className="spinner" /> Chargement…
              </div>
            ) : publications.length === 0 ? (
              <div className="mespub-empty">
                <p>Vous n'avez pas encore de publication.</p>
                <p>Creez votre premiere offre de service pour attirer des clients !</p>
                <button className="btn btn-primary" onClick={openCreateForm}>
                  <FiPlus /> Creer une offre
                </button>
              </div>
            ) : (
              <div className="mespub-list">
                {publications.map(pub => {
                  const prix = formatPrix(pub.prix);
                  const isDeleting = deletingPubId === pub.id;
                  return (
                    <div key={pub.id} className="mespub-item" style={{ opacity: isDeleting ? 0.5 : 1 }}>
                      {/* Miniature */}
                      <div className="mespub-img">
                        {pub.photos?.[0]
                          ? <img src={pub.photos[0]} alt={pub.titre} />
                          : <div className="mespub-img-placeholder">{pub.categorie?.charAt(0) || '🛠'}</div>}
                      </div>

                      {/* Info */}
                      <div className="mespub-info">
                        <div className="mespub-title">{pub.titre}</div>
                        <div className="mespub-meta">
                          {pub.categorie && <span>{pub.categorie}</span>}
                          {pub.ville && <span><FiMapPin /> {pub.ville}</span>}
                          {pub.nombreVues > 0 && <span><FiEye /> {pub.nombreVues} vues</span>}
                        </div>
                        {prix && <div className="mespub-prix">{prix}</div>}
                        <span className={`mespub-statut ${pub.statut}`}>
                          {pub.statut === 'actif' ? <><FiCheck /> Active</> : 'Inactive'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="mespub-actions">
                        <button className="mespub-btn edit" onClick={() => openEditForm(pub)} disabled={savingPub || isDeleting}>
                          <FiEdit3 /> Modifier
                        </button>
                        <button
                          className={`mespub-btn ${pub.statut === 'actif' ? 'toggle-on' : 'toggle-off'}`}
                          onClick={() => handleTogglePub(pub)}
                          disabled={savingPub || isDeleting}
                        >
                          {pub.statut === 'actif' ? <><FiToggleRight /> Desactiver</> : <><FiToggleLeft /> Activer</>}
                        </button>
                        <Link to={`/publications/${pub.id}`} className="mespub-btn edit" target="_blank">
                          <FiEye /> Voir
                        </Link>
                        <button className="mespub-btn delete" onClick={() => handleDeletePub(pub)} disabled={savingPub || isDeleting}>
                          {isDeleting ? <FiLoader className="spinner" /> : <FiTrash2 />} Supprimer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* === ONGLET AVIS RECUS === */}
        {activeTab === 'avis' && (
          <div className="ep-card">
            <div className="mespub-header">
              <h3><FiStar /> Avis recus</h3>
            </div>

            {/* Statistiques */}
            {(artisan?.nombreAvis > 0 || artisan?.noteMoyenne > 0) && (
              <div className="ep-avis-stats">
                <div className="ep-avis-stat">
                  <span className="ep-avis-stat-val">{artisan?.noteMoyenne?.toFixed(1) || '–'}</span>
                  <div className="ep-avis-star-avg">
                    {artisan?.noteMoyenne > 0 && Array.from({ length: 5 }).map((_, i) => (
                      <FiStar key={i} style={{ fontSize: '0.8rem', color: i < Math.round(artisan.noteMoyenne) ? 'var(--gold)' : '#e0e0e0' }} />
                    ))}
                  </div>
                  <span className="ep-avis-stat-label">Note moyenne</span>
                </div>
                <div className="ep-avis-stat">
                  <span className="ep-avis-stat-val">{artisan?.nombreAvis || 0}</span>
                  <span className="ep-avis-stat-label">Avis au total</span>
                </div>
                <div className="ep-avis-stat">
                  <span className="ep-avis-stat-val">
                    {artisan?.nombreAvis > 0
                      ? Math.round((artisan.nombreAvis / Math.max(artisan.nombreVues || 1, 1)) * 100) + '%'
                      : '–'}
                  </span>
                  <span className="ep-avis-stat-label">Taux d'avis</span>
                </div>
              </div>
            )}

            {loadingAvis ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                <FiLoader className="spinner" /> Chargement…
              </div>
            ) : avis.length === 0 ? (
              <div className="ep-avis-empty">
                <FiStar />
                <p>Vous n'avez pas encore d'avis.</p>
                <p>Les clients qui font appel a vos services pourront noter leur experience.</p>
              </div>
            ) : (
              <div className="avis-list">
                {avis.map(av => {
                  const d = av.dateCreation?.toDate?.() ?? null;
                  return (
                    <div key={av.id} className="avis-card">
                      <div className="avis-header">
                        <div className="avis-author">
                          {av.clientPhotoUrl ? (
                            <img src={av.clientPhotoUrl} alt={av.clientNom} className="avis-avatar-img" />
                          ) : (
                            <div className="avis-avatar">{av.clientNom?.charAt(0)?.toUpperCase() || '?'}</div>
                          )}
                          <div>
                            <strong>{av.clientNom || 'Client'}</strong>
                            {d && <span className="avis-date">{d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                          </div>
                        </div>
                        <div className="stars-row">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <FiStar key={i} className={i < Math.round(av.note || 0) ? 'star filled' : 'star'} />
                          ))}
                        </div>
                      </div>
                      {av.commentaire && <p className="avis-comment">{av.commentaire}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* === ONGLET CROISSANCE === */}
        {activeTab === 'croissance' && (
          <div className="ep-croissance">

            {/* Statut plan actuel */}
            <div className={`ep-plan-status ep-plan-status--${artisan?.plan || 'gratuit'}`}>
              <div className="ep-plan-status-icon">
                {artisan?.plan === 'premium' ? <FiAward size={22} /> :
                 artisan?.plan === 'pro'     ? <FiStar  size={22} /> :
                                              <FiZap   size={22} />}
              </div>
              <div className="ep-plan-status-text">
                <p className="ep-plan-status-name">
                  Plan {artisan?.plan === 'premium' ? 'Premium' : artisan?.plan === 'pro' ? 'Pro' : 'Gratuit'}
                </p>
                <p className="ep-plan-status-sub">
                  {artisan?.plan === 'gratuit'
                    ? 'Passez au plan Pro pour booster votre visibilite'
                    : artisan?.finAbonnement?.toDate
                      ? `Valide jusqu'au ${artisan.finAbonnement.toDate().toLocaleDateString('fr-FR')}`
                      : 'Abonnement actif'}
                </p>
              </div>
            </div>

            {/* Cards croissance */}
            <div className="ep-crois-grid">

              {/* Abonnements */}
              <button className="ep-crois-card" onClick={() => navigate('/abonnements')}>
                <div className="ep-crois-card-icon ep-crois-card-icon--orange">
                  <FiAward size={26} />
                </div>
                <div className="ep-crois-card-body">
                  <h3 className="ep-crois-card-title">Plans &amp; Abonnements</h3>
                  <p className="ep-crois-card-desc">
                    {artisan?.plan === 'gratuit'
                      ? 'Passez Pro ou Premium pour plus de publications et de visibilite'
                      : 'Gerer votre abonnement ou le renouveler'}
                  </p>
                  <span className="ep-crois-card-cta">
                    {artisan?.plan === 'gratuit' ? 'Passer au Pro' : 'Voir les plans'} <FiArrowRight size={14} />
                  </span>
                </div>
              </button>

              {/* Boost */}
              <button className="ep-crois-card" onClick={() => navigate('/boost')}>
                <div className="ep-crois-card-icon ep-crois-card-icon--gold">
                  <FiZap size={26} />
                </div>
                <div className="ep-crois-card-body">
                  <h3 className="ep-crois-card-title">Booster mon profil</h3>
                  <p className="ep-crois-card-desc">
                    {artisan?.boostActif
                      ? 'Votre profil est en ce moment booste en tete des resultats'
                      : 'Apparaissez en premier dans les recherches — des 500 FCFA'}
                  </p>
                  <span className="ep-crois-card-cta">
                    {artisan?.boostActif ? 'Boost actif ✓' : 'Activer le boost'} <FiArrowRight size={14} />
                  </span>
                </div>
              </button>

              {/* Parrainage */}
              <button className="ep-crois-card" onClick={() => navigate('/parrainage')}>
                <div className="ep-crois-card-icon ep-crois-card-icon--green">
                  <FiGift size={26} />
                </div>
                <div className="ep-crois-card-body">
                  <h3 className="ep-crois-card-title">Parrainage</h3>
                  <p className="ep-crois-card-desc">
                    Invitez vos collegues et gagnez des credits boost gratuits
                  </p>
                  <span className="ep-crois-card-cta">
                    Voir mon code <FiArrowRight size={14} />
                  </span>
                </div>
              </button>

              {/* Statistiques */}
              <div className="ep-crois-card ep-crois-card--stats">
                <div className="ep-crois-card-icon ep-crois-card-icon--blue">
                  <FiTrendingUp size={26} />
                </div>
                <div className="ep-crois-card-body">
                  <h3 className="ep-crois-card-title">Statistiques</h3>
                  <div className="ep-crois-stats-grid">
                    <div className="ep-crois-stat">
                      <span className="ep-crois-stat-val">{artisan?.nombreVues || 0}</span>
                      <span className="ep-crois-stat-label">Vues du profil</span>
                    </div>
                    <div className="ep-crois-stat">
                      <span className="ep-crois-stat-val">{artisan?.nombreAvis || 0}</span>
                      <span className="ep-crois-stat-label">Avis recus</span>
                    </div>
                    <div className="ep-crois-stat">
                      <span className="ep-crois-stat-val">{publications.length}</span>
                      <span className="ep-crois-stat-label">Publications</span>
                    </div>
                    <div className="ep-crois-stat">
                      <span className="ep-crois-stat-val">{artisan?.referralCount || 0}</span>
                      <span className="ep-crois-stat-label">Filleuls</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* === ONGLET OUTILS === */}
        {activeTab === 'outils' && (
          <OutilsTab uid={uid} nom={nom} artisan={artisan} />
        )}

      </div>{/* /ep-body */}

      {/* ── Modal formulaire publication ──────────────────────────────────── */}
      {showPubForm && (
        <div className="pub-form-overlay" onClick={e => { if (e.target === e.currentTarget) closePubForm(); }}>
          <div className="pub-form-modal">
            <div className="pub-form-modal-head">
              <h3>{editingPub ? "Modifier l'offre" : 'Nouvelle offre de service'}</h3>
              <button className="pub-form-modal-close" onClick={closePubForm}><FiX /></button>
            </div>

            <div className="pub-form-body">
              {/* Titre */}
              <div className="pub-form-field">
                <label>Titre de l'offre *</label>
                <input
                  type="text" value={pubTitre}
                  onChange={e => setPubTitre(e.target.value)}
                  placeholder="Ex: Couture de boubou sur mesure" maxLength={100}
                />
              </div>

              {/* Categorie + Ville */}
              <div className="pub-form-row">
                <div className="pub-form-field">
                  <label>Categorie</label>
                  <select value={pubCategorie} onChange={e => setPubCategorie(e.target.value)}>
                    <option value="">— Choisir —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="pub-form-field">
                  <label>Ville</label>
                  <input
                    type="text" value={pubVille}
                    onChange={e => setPubVille(e.target.value)}
                    placeholder="Ex: Cotonou"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="pub-form-field">
                <label>Description</label>
                <textarea
                  value={pubDescription}
                  onChange={e => setPubDescription(e.target.value)}
                  placeholder="Decrivez votre offre de service..."
                  rows={4} maxLength={500}
                />
              </div>

              {/* Prix */}
              <div className="pub-form-field pub-form-field--half">
                <label>Prix (FCFA)</label>
                <input
                  type="number" value={pubPrix}
                  onChange={e => setPubPrix(e.target.value)}
                  placeholder="Ex: 5000" min={0}
                />
              </div>

              {/* Photos */}
              <div className="pub-form-field">
                <label>Photos ({pubPhotos.length}/4)</label>
                <div className="pub-form-photos">
                  {pubPhotos.map(url => (
                    <div key={url} className="pub-form-photo">
                      <img src={url} alt="pub" />
                      <button className="pub-form-photo-del" onClick={() => handleRemovePubPhoto(url)}>
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                  {pubPhotos.length < 4 && (
                    <label className="pub-form-photo-add">
                      {uploadingPubPhoto
                        ? <FiLoader className="spinner" />
                        : <><FiCamera size={18} /><span>Ajouter</span></>}
                      <input
                        ref={pubPhotoRef}
                        type="file" accept="image/*"
                        className="hidden-input"
                        onChange={handleAddPubPhoto}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Erreur publication */}
              {pubError && (
                <div className="pub-form-error">
                  <FiAlertCircle /> {pubError}
                </div>
              )}
            </div>{/* /pub-form-body */}

            {/* Actions */}
            <div className="pub-form-footer">
              <button className="btn btn-ghost" onClick={closePubForm}>Annuler</button>
              <button
                className="btn btn-primary"
                onClick={handleSavePub}
                disabled={savingPub}
              >
                {savingPub
                  ? <><FiLoader className="spinner" /> Enregistrement…</>
                  : editingPub ? <><FiSave /> Mettre a jour</> : <><FiPlus /> Publier l'offre</>}
              </button>
            </div>
          </div>{/* /pub-form-modal */}
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant OutilsTab
// ─────────────────────────────────────────────────────────────────────────────
function OutilsTab({ uid, nom, artisan }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);

  const profileUrl = `${window.location.origin}/artisans/${uid}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(profileUrl); } catch { /* fallback */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyQr = async () => {
    try { await navigator.clipboard.writeText(profileUrl); } catch { /* fallback */ }
    setCopiedQr(true);
    setTimeout(() => setCopiedQr(false), 2500);
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-azotche-${uid}.png`;
    link.click();
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Découvrez le profil de ${nom || 'cet artisan'} sur Azotché : ${profileUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`, '_blank');
  };

  // Statut vérification
  const isCertified       = artisan?.isCertified === true;
  const verificationEnCours = artisan?.verificationEnCours === true;
  const motifRejet        = artisan?.motifRejet || null;

  const verifStatus = isCertified
    ? 'certified'
    : verificationEnCours
      ? 'pending'
      : motifRejet
        ? 'rejected'
        : 'none';

  return (
    <div className="ep-outils">

      {/* ── QR Code ──────────────────────────────────────────────────────────── */}
      <div className="ep-card ep-outils-card">
        <div className="ep-card-header">
          <div className="ep-card-title"><FiLink /> Mon QR Code</div>
        </div>
        <div className="ep-outils-qr-wrap">
          <div className="ep-outils-qr-img">
            <img src={qrUrl} alt="QR Code profil" />
          </div>
          <div className="ep-outils-qr-info">
            <p className="ep-outils-qr-desc">
              Partagez ce QR Code sur vos supports (cartes de visite, affiches, flyers…) pour que vos clients accèdent directement à votre profil Azotché.
            </p>
            <div className="ep-outils-qr-actions">
              <button className="btn btn-primary" onClick={handleDownloadQr}>
                <FiDownload /> Télécharger
              </button>
              <button className="btn btn-outline" onClick={handleCopyQr}>
                {copiedQr ? <><FiCheck /> Lien copié !</> : <><FiCopy /> Copier le lien</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Partage du profil ────────────────────────────────────────────────── */}
      <div className="ep-card ep-outils-card">
        <div className="ep-card-header">
          <div className="ep-card-title"><FiShare2 /> Partager mon profil</div>
        </div>
        <div className="ep-outils-share-url">
          <span className="ep-outils-url-text">{profileUrl}</span>
          <button className="ep-outils-copy-btn" onClick={handleCopy}>
            {copied ? <FiCheck /> : <FiCopy />}
          </button>
        </div>
        <div className="ep-outils-share-btns">
          <button className="ep-outils-share-btn ep-outils-share-btn--whatsapp" onClick={shareWhatsApp}>
            <FaWhatsapp size={20} /> Partager sur WhatsApp
          </button>
          <button className="ep-outils-share-btn ep-outils-share-btn--facebook" onClick={shareFacebook}>
            <FaFacebook size={20} /> Partager sur Facebook
          </button>
        </div>
      </div>

      {/* ── Parrainage / Invitation ───────────────────────────────────────────── */}
      <div className="ep-card ep-outils-card ep-outils-referral">
        <div className="ep-card-header">
          <div className="ep-card-title"><FiGift /> Parrainer un artisan</div>
        </div>
        <p className="ep-outils-ref-desc">
          Invitez d'autres artisans à rejoindre Azotché avec votre lien de parrainage et gagnez des avantages pour chaque inscription validée.
        </p>
        <button className="btn btn-primary ep-outils-ref-btn" onClick={() => navigate('/parrainage')}>
          <FiGift /> Voir mes parrainages <FiArrowRight />
        </button>
      </div>

      {/* ── Vérification d'identité ───────────────────────────────────────────── */}
      <div className="ep-card ep-outils-card ep-outils-verif">
        <div className="ep-card-header">
          <div className="ep-card-title"><FiShield /> Vérification d'identité</div>
          {isCertified && (
            <span className="ep-badge ep-badge-certified"><FiAward /> Certifié</span>
          )}
        </div>

        {verifStatus === 'certified' && (
          <div className="ep-outils-verif-status ep-outils-verif-status--ok">
            <FiCheck size={22} />
            <div>
              <strong>Identité vérifiée</strong>
              <p>Votre badge de vérification est affiché sur votre profil. Les clients vous font davantage confiance.</p>
            </div>
          </div>
        )}

        {verifStatus === 'pending' && (
          <div className="ep-outils-verif-status ep-outils-verif-status--pending">
            <FiClock size={22} />
            <div>
              <strong>Demande en cours d'examen</strong>
              <p>Votre dossier est en cours de traitement. Vous serez notifié dès qu'une décision sera prise.</p>
            </div>
          </div>
        )}

        {verifStatus === 'rejected' && (
          <div className="ep-outils-verif-status ep-outils-verif-status--rejected">
            <FiAlertCircle size={22} />
            <div>
              <strong>Dossier rejeté</strong>
              {motifRejet && <p className="ep-outils-verif-motif">Motif : {motifRejet}</p>}
              <p>Vous pouvez soumettre un nouveau dossier corrigé.</p>
            </div>
          </div>
        )}

        {verifStatus === 'none' && (
          <div className="ep-outils-verif-intro">
            <FiShield size={32} className="ep-outils-verif-icon" />
            <div>
              <strong>Faites certifier votre identité</strong>
              <p>La vérification renforce votre crédibilité. Les artisans vérifiés apparaissent en priorité dans les recherches.</p>
            </div>
          </div>
        )}

        {(verifStatus === 'none' || verifStatus === 'rejected') && (
          <button
            className="btn btn-primary ep-outils-verif-btn"
            onClick={() => navigate('/certification')}
          >
            <FiShield />
            {verifStatus === 'rejected' ? 'Corriger mon dossier' : 'Commencer la vérification'}
            <FiArrowRight />
          </button>
        )}

        {verifStatus === 'certified' && (
          <div className="ep-outils-verif-badge-info">
            <FiFlag size={14} /> Badge affiché sur votre profil public
          </div>
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants internes
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children, saved, editing, onEdit, onCancel, onSave, saving }) {
  return (
    <div className="ep-card">
      <div className="ep-card-header">
        <div className="ep-card-title">{icon} {title}</div>
        <div className="ep-card-actions">
          {editing ? (
            <>
              <button className="btn btn-ghost ep-btn-cancel" onClick={onCancel} disabled={saving}>Annuler</button>
              <button className="btn btn-primary ep-btn-save" onClick={onSave} disabled={saving}>
                {saving ? <FiLoader className="spinner" /> : <FiSave />}
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          ) : (
            <button className="btn btn-ghost ep-btn-edit" onClick={onEdit}><FiEdit3 /> Modifier</button>
          )}
        </div>
      </div>
      {saved && <div className="ep-saved-bar"><FiCheck /> Modifications enregistrees !</div>}
      <div className="ep-card-body">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="ep-info-row">
      <span className="ep-info-icon">{icon}</span>
      <span className="ep-info-label">{label}</span>
      <span className="ep-info-value">{value}</span>
    </div>
  );
}
