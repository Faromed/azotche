import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiShield, FiCamera, FiX, FiCheck, FiLoader, FiArrowRight,
  FiArrowLeft, FiUser, FiHome, FiPhone, FiBriefcase, FiCalendar,
  FiAlertTriangle, FiInfo, FiCreditCard,
} from 'react-icons/fi';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';
import usePageMeta from '../hooks/usePageMeta';

// ═══════════════════════════════════════════════════════════════
//  Page de vérification d'identité artisan
//  Port fidèle de verification_request_screen.dart (Flutter)
//  Étape 0 : Modal conditions → Étape 1 : Documents →
//  Étape 2 : Coordonnées → Étape 3 : Récap + paiement
// ═══════════════════════════════════════════════════════════════

export default function VerificationIdentitePage() {
  usePageMeta({ title: 'Certification de profil — AZÔTCHÉ' });
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createAndPay, loading: payLoading, error: payError } = usePayment();

  // ── Config admin ──
  const [montantVerif, setMontantVerif] = useState(2000);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // ── Profil artisan ──
  const [artisan, setArtisan] = useState(null);
  // Nombre de tentatives — vit dans users/{uid}/private/identite (jamais sur
  // le document public users/{uid}), donc chargé séparément ci-dessous.
  const [verifAttempts, setVerifAttempts] = useState(0);

  // ── Flux multi-étape ──
  // step -1 = modal conditions | 0..2 = formulaire
  const [step, setStep] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // ── Étape 1 : Documents ──
  const [cniRecto,   setCniRecto]   = useState(null); // { file, preview }
  const [cniVerso,   setCniVerso]   = useState(null); // facultatif
  const [selfie,     setSelfie]     = useState(null);
  const [diplome,    setDiplome]    = useState(null); // si isDiplome

  // ── Étape 2 : Coordonnées ──
  const [npi,           setNpi]          = useState('');
  const [dateExpiry,    setDateExpiry]   = useState('');
  const [metierDeclare, setMetierDeclare]= useState('');
  const [adresse,       setAdresse]      = useState('');
  const [contactSecours,setContactSecours]=useState('');

  const [errors, setErrors] = useState({});

  const fileRef = useRef(null);
  const [pendingSlot, setPendingSlot] = useState(null); // 'recto'|'verso'|'selfie'|'diplome'

  // ── Charger config + profil + données privées de vérification ──
  // SÉCURITÉ : cniUrl, npi, adresse complète, contact d'urgence, etc. ne vivent
  // JAMAIS sur le document public users/{uid} — elles sont lues depuis la
  // sous-collection privée users/{uid}/private/identite (lecture restreinte
  // au propriétaire + admin), utile pour préremplir le formulaire en cas de
  // correction après un rejet.
  useEffect(() => {
    if (!user) { navigate('/connexion', { replace: true }); return; }
    Promise.all([
      getDoc(doc(db, 'parametres', 'config')),
      getDoc(doc(db, 'users', user.uid)),
      getDoc(doc(db, 'users', user.uid, 'private', 'identite')),
    ]).then(([configSnap, userSnap, identiteSnap]) => {
      if (configSnap.exists()) setMontantVerif(configSnap.data().montantVerification ?? 2000);

      const userData = userSnap.exists() ? userSnap.data() : {};
      const identite  = identiteSnap.exists() ? identiteSnap.data() : {};

      if (userSnap.exists()) setArtisan(userData);
      setVerifAttempts(identite.verificationAttempts ?? 0);

      setMetierDeclare(identite.metierDeclare || userData.metierPrincipal || '');
      setAdresse(identite.adresseComplete || userData.adresse || '');
      setContactSecours(identite.contactSecours || '');
      setNpi(identite.npi || '');
      if (identite.dateExpirationCarte) {
        const de = identite.dateExpirationCarte.toDate
          ? identite.dateExpirationCarte.toDate()
          : new Date(identite.dateExpirationCarte);
        if (!isNaN(de.getTime())) setDateExpiry(de.toISOString().split('T')[0]);
      }
    }).catch(console.error)
      .finally(() => setLoadingConfig(false));
  }, [user, navigate]);

  const isDiplome = artisan?.isDiplome ?? false;
  const isCorrection = artisan?.verificationEnCours === false && verifAttempts > 0;
  const attempts = verifAttempts;
  const isPaid = montantVerif > 0 && !isCorrection;

  // ── Sélection fichier image ──
  const pickFile = (slot) => {
    setPendingSlot(slot);
    fileRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const obj = { file, preview };
    if (pendingSlot === 'recto')   setCniRecto(obj);
    if (pendingSlot === 'verso')   setCniVerso(obj);
    if (pendingSlot === 'selfie')  setSelfie(obj);
    if (pendingSlot === 'diplome') setDiplome(obj);
    e.target.value = '';
  };

  // ── Validation par étape ──
  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!cniRecto)  e.recto   = 'La photo recto de votre pièce est obligatoire.';
      if (!selfie)    e.selfie  = 'Le selfie avec votre pièce est obligatoire.';
      if (isDiplome && !diplome) e.diplome = 'La photo du diplôme est obligatoire.';
    }
    if (s === 1) {
      if (!npi.trim() || npi.trim().length < 5)  e.npi = 'NPI invalide (min. 5 chiffres).';
      if (npi.trim().length > 14)                e.npi = 'NPI trop long (max. 14 chiffres).';
      if (!dateExpiry)                           e.dateExpiry = 'Date d\'expiration requise.';
      if (!metierDeclare.trim())                 e.metier = 'Métier requis.';
      if (!adresse.trim() || adresse.trim().length < 10) e.adresse = 'Adresse trop courte.';
      if (!contactSecours.trim() || contactSecours.trim().length < 8) e.contact = 'Numéro invalide.';
    }
    return e;
  };

  const nextStep = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    if (step < 2) { setStep(s => s + 1); }
    else { handleSubmit(); }
  };

  // ── Upload un fichier vers Firebase Storage ──
  const uploadDoc = async (obj, suffix) => {
    if (!obj?.file) return null;
    const ext = obj.file.name.split('.').pop() || 'jpg';
    const path = `verifications/${user.uid}/${suffix}_${Date.now()}.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, obj.file);
    return await getDownloadURL(storageRef);
  };

  // ── Soumission ──
  const handleSubmit = async () => {
    setSubmitting(true);
    setGlobalError('');

    const doUploadAndSave = async () => {
      setSubmitting(true);
      try {
        const [rectoUrl, versoUrl, selfieUrl, diplomeUrl] = await Promise.all([
          uploadDoc(cniRecto,   'recto'),
          uploadDoc(cniVerso,   'verso'),
          uploadDoc(selfie,     'selfie'),
          uploadDoc(diplome,    'diplome'),
        ]);

        // Données sensibles (pièce d'identité, NPI, adresse, contact d'urgence…)
        // → sous-collection privée users/{uid}/private/identite, JAMAIS sur le
        // document public users/{uid} (règle Firestore : lecture restreinte au
        // propriétaire + admin — voir firestore.rules).
        const identitePayload = {
          cniUrl:                 rectoUrl,
          cniRectoUrl:            rectoUrl,
          ...(versoUrl  && { cniVersoUrl:  versoUrl  }),
          selfieUrl,
          ...(diplomeUrl && { diplomeUrl }),
          adresseComplete:        adresse.trim(),
          contactSecours:         contactSecours.trim(),
          metierDeclare:          metierDeclare.trim(),
          npi:                    npi.trim(),
          dateExpirationCarte:    Timestamp.fromDate(new Date(dateExpiry)),
          dateDemandeVerification:serverTimestamp(),
          verificationAttempts:   attempts + 1,
        };
        await setDoc(
          doc(db, 'users', user.uid, 'private', 'identite'),
          identitePayload,
          { merge: true }
        );

        // Document public : uniquement le drapeau non sensible "en cours".
        await updateDoc(doc(db, 'users', user.uid), {
          verificationEnCours: true,
        });

        setDone(true);
      } catch (err) {
        console.error('verif submit:', err);
        setGlobalError('Erreur lors de l\'envoi. Vérifiez votre connexion et réessayez.');
      } finally {
        setSubmitting(false);
      }
    };

    if (isPaid) {
      const nameParts = (artisan?.nom || '').split(' ');
      await createAndPay({
        uid:               user.uid,
        type:              'verification',
        montant:           montantVerif,
        description:       `Frais de certification — ${artisan?.nom || user.uid}`,
        customerFirstName: nameParts[0] || 'Artisan',
        customerLastName:  nameParts.slice(1).join(' ') || 'Azotche',
        customerPhone:     user.phoneNumber || '',
        onSuccess: async () => { await doUploadAndSave(); },
        onFailure: () => {
          setSubmitting(false);
          setGlobalError('Paiement non confirmé. Réessayez ou contactez le support.');
        },
      });
    } else {
      await doUploadAndSave();
    }
  };

  // ── Écran de succès ──
  if (done) return (
    <div className="verif-page">
      <div className="verif-done-wrap">
        <div className="verif-done-icon"><FiShield size={40} /></div>
        <h2>Demande envoyée !</h2>
        <p>Votre dossier de certification a été soumis. Vous serez notifié sous 24–48 h ouvrées.</p>
        <button className="btn btn-primary" onClick={() => navigate('/espace-pro')}>
          Retour à mon espace <FiArrowRight />
        </button>
      </div>
    </div>
  );

  if (loadingConfig) return (
    <div className="verif-page verif-center">
      <FiLoader className="spin" size={32} /><p>Chargement…</p>
    </div>
  );

  // ── Modal conditions ──
  if (step === -1) return (
    <div className="verif-page">
      <div className="verif-modal-overlay">
        <div className="verif-modal-box">
          <div className="verif-modal-icon"><FiShield size={26} /></div>
          <h2 className="verif-modal-title">Conditions de soumission</h2>

          <div className="verif-modal-conditions">
            <CondItem icon={<FiCamera />}
              text="Photo du recto de votre pièce d'identité : claire, nette, bien éclairée, sans reflet." />
            <CondItem icon={<FiCamera />}
              text="Photo du verso de votre pièce (facultatif — si votre pièce n'en a pas, vous pouvez ignorer)." />
            <CondItem icon={<FiUser />}
              text="Selfie clair de vous avec la pièce d'identité visible à côté de votre visage." />
            {isDiplome && (
              <CondItem icon={<FiBriefcase />}
                text="Photo de votre diplôme ou attestation (obligatoire car vous avez indiqué être diplômé(e))." />
            )}
            {isPaid ? (
              <div className="verif-modal-fee">
                <FiCreditCard size={16} />
                <div>
                  <strong>Frais de dossier : {montantVerif.toLocaleString('fr-FR')} FCFA</strong>
                  <span>En cas de documents non conformes, la demande sera rejetée sans remboursement.</span>
                </div>
              </div>
            ) : (
              <CondItem icon={<FiInfo />} text="La certification est actuellement gratuite." />
            )}
            <div className="verif-modal-warning">
              <FiAlertTriangle size={14} />
              <span>En cas de fausses informations ou tentative de fraude, la demande sera définitivement rejetée.</span>
            </div>
          </div>

          <div className="verif-modal-actions">
            <button className="btn btn-outline" onClick={() => navigate('/espace-pro')}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={() => setStep(0)}>
              J'ai compris, continuer <FiArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Formulaire 3 étapes ──
  const STEPS = ['Documents', 'Coordonnées', 'Récapitulatif'];

  return (
    <div className="verif-page">
      <div className="verif-container">
        {/* En-tête */}
        <div className="verif-header">
          <button className="verif-back-btn" onClick={() => navigate('/espace-pro')}>
            <FiArrowLeft /> Retour
          </button>
          <h1 className="verif-title">
            {isCorrection ? 'Corriger ma demande' : 'Certification de profil'}
          </h1>
        </div>

        {/* Stepper */}
        <div className="verif-stepper">
          {STEPS.map((label, i) => (
            <div key={i} className={`verif-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              <div className="verif-step-circle">
                {i < step ? <FiCheck size={14} /> : <span>{i + 1}</span>}
              </div>
              <span className="verif-step-label">{label}</span>
              {i < STEPS.length - 1 && <div className="verif-step-line" />}
            </div>
          ))}
        </div>

        {/* Barre progression */}
        <div className="verif-progress-bar">
          <div className="verif-progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* Erreurs globales */}
        {globalError && (
          <div className="ep-alert ep-alert-error" style={{ margin: '0 0 16px' }}>
            <FiAlertTriangle /> {globalError}
            <button onClick={() => setGlobalError('')} className="ep-alert-close">×</button>
          </div>
        )}
        {payError && (
          <div className="ep-alert ep-alert-error" style={{ margin: '0 0 16px' }}>
            <FiAlertTriangle /> {payError}
          </div>
        )}

        {/* Input caché pour sélection de fichiers */}
        <input
          type="file" accept="image/*" capture="environment"
          ref={fileRef} className="hidden-input"
          onChange={handleFileChange}
        />

        {/* ── ÉTAPE 1 : Documents ── */}
        {step === 0 && (
          <div className="verif-section">
            <InfoBox text="Vos documents sont stockés de façon sécurisée et ne seront pas partagés avec des tiers." />

            <DocSection title="1. Pièce d'identité (recto)" required>
              <DocPicker
                obj={cniRecto}
                placeholder="CIP / Carte biométrique / Passeport — Face avant"
                onPick={() => pickFile('recto')}
                onRemove={() => setCniRecto(null)}
              />
              {errors.recto && <span className="form-error">{errors.recto}</span>}
            </DocSection>

            <DocSection title="2. Pièce d'identité (verso)" badge="Facultatif">
              <p className="verif-hint">Si votre pièce n'a pas de verso ou si les informations ne s'y trouvent pas, vous pouvez ignorer.</p>
              <DocPicker
                obj={cniVerso}
                placeholder="Face arrière de la pièce"
                onPick={() => pickFile('verso')}
                onRemove={() => setCniVerso(null)}
              />
            </DocSection>

            <DocSection title="3. Selfie avec la pièce" required>
              <p className="verif-hint">Prenez vous en photo en tenant votre pièce à côté de votre visage.</p>
              <DocPicker
                obj={selfie}
                placeholder="Votre visage + pièce visible"
                onPick={() => pickFile('selfie')}
                onRemove={() => setSelfie(null)}
                square
              />
              {errors.selfie && <span className="form-error">{errors.selfie}</span>}
            </DocSection>

            {isDiplome && (
              <DocSection title="4. Photo de votre diplôme" required>
                <p className="verif-hint">Votre profil indique que vous êtes diplômé(e). Joignez une photo claire de votre diplôme.</p>
                <DocPicker
                  obj={diplome}
                  placeholder="Photo de votre diplôme / attestation"
                  onPick={() => pickFile('diplome')}
                  onRemove={() => setDiplome(null)}
                />
                {errors.diplome && <span className="form-error">{errors.diplome}</span>}
              </DocSection>
            )}
          </div>
        )}

        {/* ── ÉTAPE 2 : Coordonnées ── */}
        {step === 1 && (
          <div className="verif-section">
            <InfoBox text="Ces informations complètent votre dossier et permettent de contrôler la validité de votre pièce." />

            <div className="verif-field-group">
              <h4 className="verif-group-title">Pièce d'identité</h4>

              <div className="form-group">
                <label>NPI — Numéro Personnel d'Identification <span className="verif-required">*</span></label>
                <div className="verif-input-wrap">
                  <FiShield className="verif-input-icon" />
                  <input
                    type="number" className={`form-input verif-input ${errors.npi ? 'error' : ''}`}
                    placeholder="Ex: 12345678901234 (max 14 chiffres)"
                    value={npi} maxLength={14}
                    onChange={e => setNpi(e.target.value.replace(/\D/g,'').slice(0,14))}
                  />
                </div>
                {errors.npi && <span className="form-error">{errors.npi}</span>}
              </div>

              <div className="form-group">
                <label>Date d'expiration de la pièce <span className="verif-required">*</span></label>
                <div className="verif-input-wrap">
                  <FiCalendar className="verif-input-icon" />
                  <input
                    type="date" className={`form-input verif-input ${errors.dateExpiry ? 'error' : ''}`}
                    min={new Date().toISOString().split('T')[0]}
                    value={dateExpiry}
                    onChange={e => setDateExpiry(e.target.value)}
                  />
                </div>
                {errors.dateExpiry && <span className="form-error">{errors.dateExpiry}</span>}
                <p className="form-hint">La pièce doit être en cours de validité.</p>
              </div>
            </div>

            <div className="verif-field-group">
              <h4 className="verif-group-title">Coordonnées</h4>

              <div className="form-group">
                <label>Métier exercé <span className="verif-required">*</span></label>
                <div className="verif-input-wrap">
                  <FiBriefcase className="verif-input-icon" />
                  <input
                    type="text" className={`form-input verif-input ${errors.metier ? 'error' : ''}`}
                    placeholder="Ex: Tailleur, Électricien…"
                    value={metierDeclare}
                    onChange={e => setMetierDeclare(e.target.value)}
                  />
                </div>
                {errors.metier && <span className="form-error">{errors.metier}</span>}
              </div>

              <div className="form-group">
                <label>Adresse de résidence complète <span className="verif-required">*</span></label>
                <div className="verif-input-wrap verif-input-wrap--textarea">
                  <FiHome className="verif-input-icon" style={{ marginTop: 12 }} />
                  <textarea
                    className={`form-input verif-input form-textarea ${errors.adresse ? 'error' : ''}`}
                    rows={2}
                    placeholder="Ex: Cotonou, Quartier Zogbo, rue 45…"
                    value={adresse}
                    onChange={e => setAdresse(e.target.value)}
                  />
                </div>
                {errors.adresse && <span className="form-error">{errors.adresse}</span>}
              </div>

              <div className="form-group">
                <label>Autre numéro de contact <span className="verif-required">*</span></label>
                <div className="verif-input-wrap">
                  <FiPhone className="verif-input-icon" />
                  <input
                    type="tel" className={`form-input verif-input ${errors.contact ? 'error' : ''}`}
                    placeholder="01XXXXXXXX (10 chiffres)"
                    maxLength={10}
                    value={contactSecours}
                    onChange={e => setContactSecours(e.target.value.replace(/\D/g,'').slice(0,10))}
                  />
                </div>
                {errors.contact && <span className="form-error">{errors.contact}</span>}
                <p className="form-hint">Format béninois : commençant par 01.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Récapitulatif ── */}
        {step === 2 && (
          <div className="verif-section">
            <InfoBox text="Vérifiez bien vos informations avant de soumettre. La certification est traitée sous 24–48 h ouvrées." />

            <div className="verif-recap-block">
              <h4 className="verif-group-title">Documents fournis</h4>
              <div className="verif-thumbs">
                <Thumb obj={cniRecto}  label="Recto" />
                {cniVerso  && <Thumb obj={cniVerso}  label="Verso"   />}
                <Thumb obj={selfie}    label="Selfie" />
                {diplome   && <Thumb obj={diplome}   label="Diplôme" />}
              </div>
            </div>

            <div className="verif-recap-block">
              <h4 className="verif-group-title">Pièce d'identité</h4>
              <RecapRow icon={<FiShield />}   label="NPI"       value={npi || '—'} />
              <RecapRow icon={<FiCalendar />} label="Expire le" value={dateExpiry ? new Date(dateExpiry).toLocaleDateString('fr-FR') : '—'} />
            </div>

            <div className="verif-recap-block">
              <h4 className="verif-group-title">Coordonnées</h4>
              <RecapRow icon={<FiBriefcase />} label="Métier"  value={metierDeclare || '—'} />
              <RecapRow icon={<FiHome />}      label="Adresse" value={adresse || '—'} />
              <RecapRow icon={<FiPhone />}     label="Contact" value={contactSecours || '—'} />
            </div>

            {isPaid && (
              <div className="verif-cost-card">
                <FiShield size={28} />
                <div>
                  <span className="verif-cost-label">Frais de certification</span>
                  <strong className="verif-cost-amount">{montantVerif.toLocaleString('fr-FR')} FCFA</strong>
                  <span className="verif-cost-note">Paiement sécurisé via Mobile Money</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="verif-nav-btns">
          {step > 0 && (
            <button className="btn btn-outline" onClick={() => setStep(s => s - 1)} disabled={submitting || payLoading}>
              <FiArrowLeft /> Précédent
            </button>
          )}
          <button
            className="btn btn-primary verif-next-btn"
            onClick={nextStep}
            disabled={submitting || payLoading}
          >
            {submitting || payLoading ? (
              <><FiLoader className="spin" /> {submitting ? 'Envoi…' : 'Paiement…'}</>
            ) : step < 2 ? (
              <>Suivant <FiArrowRight /></>
            ) : isCorrection ? (
              <>Resoumettre <FiCheck /></>
            ) : isPaid ? (
              <>Payer {montantVerif.toLocaleString('fr-FR')} FCFA &amp; Soumettre <FiCheck /></>
            ) : (
              <>Soumettre gratuitement <FiCheck /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composants helpers ────────────────────────────────────────────────────────

function CondItem({ icon, text }) {
  return (
    <div className="verif-cond-item">
      <span className="verif-cond-icon">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function InfoBox({ text }) {
  return (
    <div className="verif-infobox">
      <FiInfo size={16} />
      <span>{text}</span>
    </div>
  );
}

function DocSection({ title, required, badge, children }) {
  return (
    <div className="verif-doc-section">
      <div className="verif-doc-title-row">
        <span className="verif-doc-title">{title}</span>
        {required && <span className="verif-badge-required">Obligatoire</span>}
        {badge    && <span className="verif-badge-optional">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function DocPicker({ obj, placeholder, onPick, onRemove, square }) {
  return (
    <div className={`verif-doc-picker ${obj ? 'has-file' : ''} ${square ? 'square' : ''}`} onClick={onPick}>
      {obj ? (
        <>
          <img src={obj.preview} alt="aperçu" className="verif-doc-preview" />
          <button
            className="verif-doc-remove"
            onClick={e => { e.stopPropagation(); onRemove(); }}
          >
            <FiX />
          </button>
          <span className="verif-doc-change">Appuyer pour changer</span>
        </>
      ) : (
        <div className="verif-doc-empty">
          <div className="verif-doc-empty-icon"><FiCamera size={24} /></div>
          <p className="verif-doc-placeholder">{placeholder}</p>
          <span className="verif-doc-cta">Appuyer pour ajouter</span>
        </div>
      )}
    </div>
  );
}

function Thumb({ obj, label }) {
  return (
    <div className="verif-thumb">
      {obj ? (
        <img src={obj.preview} alt={label} className="verif-thumb-img" />
      ) : (
        <div className="verif-thumb-empty"><FiX /></div>
      )}
      <span className="verif-thumb-label">{label}</span>
    </div>
  );
}

function RecapRow({ icon, label, value }) {
  return (
    <div className="verif-recap-row">
      <span className="verif-recap-icon">{icon}</span>
      <span className="verif-recap-label">{label} :</span>
      <span className="verif-recap-value">{value}</span>
    </div>
  );
}

