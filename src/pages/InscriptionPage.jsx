import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiCamera, FiUser, FiMapPin, FiGlobe, FiFileText,
  FiCheck, FiLoader, FiX, FiPlus, FiChevronDown, FiCreditCard,
} from 'react-icons/fi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';
import usePageMeta from '../hooks/usePageMeta';
import { CATEGORIES, METIERS_PAR_CATEGORIE, VILLES } from '../config/metiers';

export default function InscriptionPage() {
  usePageMeta({ title: 'Inscription artisan — AZÔTCHÉ' });

  const { user, profile, registerArtisan, signOut } = useAuth();
  const { createAndPay, loading: payLoading, error: payError } = usePayment();
  const navigate = useNavigate();

  // ── Paramètres admin : frais d'activation ──
  const [activationConfig, setActivationConfig] = useState({
    activationPayante: false,
    montantActivation: 0,
  });
  useEffect(() => {
    getDoc(doc(db, 'parametres', 'config')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setActivationConfig({
          activationPayante: d.activationPayante ?? false,
          montantActivation: d.montantActivation ?? 0,
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) navigate('/connexion', { replace: true });
    if (profile?.role === 'pro') navigate('/espace-pro', { replace: true });
  }, [user, profile, navigate]);

  const photoRef = useRef(null);

  const [form, setForm] = useState({
    photoFile:          null,
    photoPreview:       null,
    nom:                '',
    referredBy:         '',
    categorie:          '',
    metierPrincipal:    '',
    metiersSecondaires: [],
    siteWeb:            '',
    ville:              '',
    adresse:            '',
    description:        '',
    isDiplome:          false,
    anneeDiplome:       '',
    consentement:       false,
  });

  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [metierSearch, setMetierSearch] = useState('');
  const [showMetierList, setShowMetierList] = useState(false);

  /* ── Métiers filtrés par catégorie ── */
  const metiersDispos = form.categorie
    ? (METIERS_PAR_CATEGORIE[form.categorie] || [])
    : Object.values(METIERS_PAR_CATEGORIE).flat();

  const metiersFiltres = metiersDispos.filter(m =>
    m.toLowerCase().includes(metierSearch.toLowerCase())
  ).slice(0, 20);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  /* ── Photo ── */
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set('photoFile', file);
    const reader = new FileReader();
    reader.onload = (ev) => set('photoPreview', ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── Catégorie : reset métier si changement ── */
  const handleCategorie = (cat) => {
    set('categorie', cat);
    set('metierPrincipal', '');
    set('metiersSecondaires', []);
    setMetierSearch('');
  };

  /* ── Métiers secondaires ── */
  const toggleMetierSec = (m) => {
    if (form.metiersSecondaires.includes(m)) {
      set('metiersSecondaires', form.metiersSecondaires.filter(x => x !== m));
    } else if (form.metiersSecondaires.length < 5) {
      set('metiersSecondaires', [...form.metiersSecondaires, m]);
    }
  };

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!form.nom.trim() || form.nom.trim().length < 3)
      e.nom = 'Le nom doit contenir au moins 3 caractères.';
    if (!form.categorie)
      e.categorie = 'Veuillez choisir une catégorie.';
    if (!form.metierPrincipal)
      e.metierPrincipal = 'Veuillez choisir votre métier principal.';
    if (!form.ville)
      e.ville = 'Veuillez choisir votre ville.';
    if (form.isDiplome && (!form.anneeDiplome || isNaN(Number(form.anneeDiplome))))
      e.anneeDiplome = 'Entrez une année valide (ex: 2010).';
    if (form.isDiplome && form.anneeDiplome) {
      const yr = Number(form.anneeDiplome);
      if (yr < 1950 || yr > new Date().getFullYear())
        e.anneeDiplome = 'Année invalide.';
    }
    if (!form.consentement)
      e.consentement = 'Vous devez accepter les conditions.';
    return e;
  };

  /* ── Soumission ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    // 1. Créer le profil artisan
    const res = await registerArtisan(form, form.photoFile);
    setLoading(false);

    if (!res.success) {
      setErrors({ global: res.error || 'Erreur lors de l\'inscription.' });
      return;
    }

    // 2. Si les frais d'activation sont activés → paiement obligatoire
    const { activationPayante, montantActivation } = activationConfig;
    if (activationPayante && montantActivation > 0 && user) {
      const nameParts = (profile?.nom || form.nom || '').split(' ');
      await createAndPay({
        uid:               user.uid,
        type:              'activation',
        montant:           montantActivation,
        description:       `Frais d'activation artisan — ${form.nom}`,
        customerFirstName: nameParts[0] || 'Artisan',
        customerLastName:  nameParts.slice(1).join(' ') || 'Azotche',
        customerPhone:     user.phoneNumber || '',
        onSuccess: () => navigate('/espace-pro', { replace: true }),
        onFailure: () => setErrors({
          global: `Paiement requis (${montantActivation.toLocaleString('fr-FR')} FCFA) pour activer votre compte. Vous pouvez réessayer depuis votre espace.`
        }),
      });
      return;
    }

    // 3. Pas de frais → redirection directe
    navigate('/espace-pro', { replace: true });
  };

  const anneesExp = form.isDiplome && form.anneeDiplome
    ? new Date().getFullYear() - Number(form.anneeDiplome)
    : null;

  return (
    <div className="inscription-page">
      <div className="inscription-header-bar">
        <Link to="/" className="connexion-logo small">
          <img src="/logo.png" alt="AZÔTCHÉ" />
          <span>AZO<span>TCHE</span></span>
        </Link>
        <h1>Créer mon profil artisan</h1>
        <p>Parce que votre travail mérite d'être vu !</p>
      </div>

      <form className="inscription-form-wrap" onSubmit={handleSubmit} noValidate>

        {/* Bandeau frais d'activation si actif */}
        {activationConfig.activationPayante && activationConfig.montantActivation > 0 && (
          <div className="inscription-activation-notice">
            <FiCreditCard size={18} />
            <div>
              <strong>Frais d'activation requis : {activationConfig.montantActivation.toLocaleString('fr-FR')} FCFA</strong>
              <span>Un paiement Mobile Money sera demandé après la soumission de votre profil.</span>
            </div>
          </div>
        )}
        {errors.global && <div className="inscription-error">{errors.global}</div>}
        {payError && <div className="inscription-error">{payError}</div>}

        {/* ── PHOTO ── */}
        <div className="insc-section">
          <div className="insc-photo-center">
            <button type="button" className="insc-photo-btn" onClick={() => photoRef.current?.click()}>
              {form.photoPreview
                ? <img src={form.photoPreview} alt="Photo" className="insc-photo-preview" />
                : <div className="insc-photo-placeholder"><FiCamera /><span>Ajouter une photo</span></div>
              }
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <span className="insc-photo-hint">Photo de profil (optionnel)</span>
          </div>
        </div>

        {/* ── INFORMATIONS PERSONNELLES ── */}
        <div className="insc-section">
          <h2 className="insc-section-title"><FiUser /> Informations personnelles</h2>

          <div className="form-group">
            <label>Nom complet <span className="req">*</span></label>
            <input
              type="text"
              className={`form-input ${errors.nom ? 'error' : ''}`}
              placeholder="Ex: Jean Koffi"
              value={form.nom}
              onChange={e => set('nom', e.target.value)}
              autoCapitalize="words"
            />
            {errors.nom && <span className="form-error">{errors.nom}</span>}
          </div>

          <div className="form-group">
            <label>Code de parrainage (optionnel)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: AZO-ABC-123456"
              value={form.referredBy}
              onChange={e => set('referredBy', e.target.value.toUpperCase())}
            />
            <span className="form-hint">Si quelqu'un vous a recommandé Azôtché</span>
          </div>
        </div>

        {/* ── METIER ── */}
        <div className="insc-section">
          <h2 className="insc-section-title"><FiFileText /> Votre métier</h2>

          {/* Catégorie */}
          <div className="form-group">
            <label>Catégorie <span className="req">*</span></label>
            <div className="insc-cat-chips">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`insc-cat-chip ${form.categorie === cat ? 'active' : ''}`}
                  onClick={() => handleCategorie(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            {errors.categorie && <span className="form-error">{errors.categorie}</span>}
          </div>

          {/* Métier principal */}
          <div className="form-group">
            <label>Métier principal <span className="req">*</span></label>
            <div className="insc-metier-wrap">
              <input
                type="text"
                className={`form-input ${errors.metierPrincipal ? 'error' : ''}`}
                placeholder={form.categorie ? `Rechercher dans ${form.categorie}…` : 'Choisissez d\'abord une catégorie'}
                value={form.metierPrincipal || metierSearch}
                onFocus={() => { setShowMetierList(true); if (form.metierPrincipal) setMetierSearch(''); }}
                onChange={e => { setMetierSearch(e.target.value); set('metierPrincipal', ''); setShowMetierList(true); }}
                disabled={!form.categorie}
              />
              {showMetierList && metiersFiltres.length > 0 && (
                <div className="insc-metier-list">
                  {metiersFiltres.map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`insc-metier-item ${form.metierPrincipal === m ? 'selected' : ''}`}
                      onMouseDown={() => { set('metierPrincipal', m); setMetierSearch(''); setShowMetierList(false); }}
                    >
                      {m}
                      {form.metierPrincipal === m && <FiCheck />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.metierPrincipal && <span className="form-error">{errors.metierPrincipal}</span>}
          </div>

          {/* Métiers secondaires */}
          {form.metierPrincipal && (
            <div className="form-group">
              <label>Autres compétences <span className="form-hint-inline">(optionnel, max 5)</span></label>
              <div className="insc-sec-chips">
                {(METIERS_PAR_CATEGORIE[form.categorie] || [])
                  .filter(m => m !== form.metierPrincipal)
                  .map(m => {
                    const sel = form.metiersSecondaires.includes(m);
                    const maxed = !sel && form.metiersSecondaires.length >= 5;
                    return (
                      <button
                        key={m}
                        type="button"
                        className={`insc-sec-chip ${sel ? 'active' : ''} ${maxed ? 'disabled' : ''}`}
                        onClick={() => !maxed && toggleMetierSec(m)}
                        disabled={maxed}
                      >
                        {sel && <FiCheck />} {m}
                      </button>
                    );
                  })
                }
              </div>
            </div>
          )}
        </div>

        {/* ── LOCALISATION ── */}
        <div className="insc-section">
          <h2 className="insc-section-title"><FiMapPin /> Localisation</h2>

          <div className="form-group">
            <label>Ville <span className="req">*</span></label>
            <div className="select-wrap">
              <select
                className={`form-input ${errors.ville ? 'error' : ''}`}
                value={form.ville}
                onChange={e => set('ville', e.target.value)}
              >
                <option value="">Choisir votre ville</option>
                {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <FiChevronDown className="select-arrow" />
            </div>
            {errors.ville && <span className="form-error">{errors.ville}</span>}
          </div>

          <div className="form-group">
            <label>Quartier / Adresse <span className="form-hint-inline">(optionnel)</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Quartier Zogbo, rue 12"
              value={form.adresse}
              onChange={e => set('adresse', e.target.value)}
            />
          </div>
        </div>

        {/* ── PRESENTATION ── */}
        <div className="insc-section">
          <h2 className="insc-section-title"><FiFileText /> Présentation</h2>

          <div className="form-group">
            <label>Site internet <span className="form-hint-inline">(optionnel)</span></label>
            <div className="insc-url-wrap">
              <FiGlobe className="insc-url-icon" />
              <input
                type="url"
                className="form-input insc-url-input"
                placeholder="https://monsite.com"
                value={form.siteWeb}
                onChange={e => set('siteWeb', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              Description <span className="form-hint-inline">(optionnel)</span>
              <span className="form-counter">{form.description.length}/200</span>
            </label>
            <textarea
              className="form-input form-textarea"
              rows={4}
              maxLength={200}
              placeholder="Décrivez votre activité, votre expérience, ce qui vous différencie…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
        </div>

        {/* ── EXPERIENCE ── */}
        <div className="insc-section">
          <h2 className="insc-section-title">Expérience professionnelle</h2>

          <div className="form-group">
            <div className="insc-switch-row">
              <div>
                <span className="insc-switch-label">J'ai un diplôme professionnel</span>
                <p className="form-hint">Votre année d'obtention sera visible sur votre profil</p>
              </div>
              <label className="insc-toggle">
                <input
                  type="checkbox"
                  checked={form.isDiplome}
                  onChange={e => { set('isDiplome', e.target.checked); if (!e.target.checked) set('anneeDiplome', ''); }}
                />
                <span className="insc-toggle-track" />
              </label>
            </div>{/* /insc-switch-row */}

            {form.isDiplome && (
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>Année d'obtention du diplôme</label>
                <input
                  type="number"
                  className={`form-input ${errors.anneeDiplome ? 'error' : ''}`}
                  placeholder="Ex: 2015"
                  min={1950}
                  max={new Date().getFullYear()}
                  value={form.anneeDiplome}
                  onChange={e => set('anneeDiplome', e.target.value)}
                />
                {errors.anneeDiplome && <span className="form-error">{errors.anneeDiplome}</span>}
                {anneesExp !== null && anneesExp >= 0 && (
                  <p className="form-hint">{anneesExp} ans d'expérience</p>
                )}
              </div>
            )}
          </div>{/* /form-group */}
        </div>{/* /insc-section experience */}

        {/* ── CODE DE PARRAINAGE ── */}
        <div className="insc-section">
          <div className="form-group">
            <label>Code de parrainage <span className="form-hint-inline">(optionnel)</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="Entrez le code d'un artisan parrainant"
              value={form.referredBy}
              onChange={e => set('referredBy', e.target.value.toUpperCase())}
            />
          </div>
        </div>

        {/* ── CONSENTEMENT ── */}
        <div className="insc-section">
          <label className={`insc-consent ${errors.consentement ? 'error' : ''}`}>
            <input
              type="checkbox"
              checked={form.consentement}
              onChange={e => set('consentement', e.target.checked)}
            />
            <span>
              J'accepte les{' '}
              <Link to="/cgu" target="_blank">conditions générales d'utilisation</Link>
              {' '}et la{' '}
              <Link to="/confidentialite" target="_blank">politique de confidentialité</Link>.
            </span>
          </label>
          {errors.consentement && <span className="form-error">{errors.consentement}</span>}
        </div>

        {/* ── BOUTON SUBMIT ── */}
        <div className="insc-section insc-submit-wrap">
          <button
            type="submit"
            className="btn btn-primary btn-lg insc-submit-btn"
            disabled={loading || payLoading}
          >
            {loading ? (
              <><FiLoader className="spin" /> Création du profil…</>
            ) : payLoading ? (
              <><FiLoader className="spin" /> Paiement en cours…</>
            ) : activationConfig.activationPayante && activationConfig.montantActivation > 0 ? (
              <><FiCreditCard /> Créer & Payer {activationConfig.montantActivation.toLocaleString('fr-FR')} FCFA</>
            ) : (
              <><FiCheck /> Créer mon profil artisan</>
            )}
          </button>
          <p className="insc-submit-note">
            Votre profil sera visible dès la validation.
          </p>
        </div>
      </form>
    </div>
  );
}
