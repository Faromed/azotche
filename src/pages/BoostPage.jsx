/**
 * BoostPage — Booster mon profil
 * Conforme à Flutter BoostScreen
 * Options de boost chargées depuis Firestore parametres/config.optionsPub
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiZap, FiArrowUp, FiEye, FiTrendingUp, FiLock,
} from 'react-icons/fi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';

const DEFAULT_OPTIONS = [
  { nom: 'Boost 3 jours',  dureeJours: 3,  montant: 500  },
  { nom: 'Boost 7 jours',  dureeJours: 7,  montant: 1000 },
  { nom: 'Boost 30 jours', dureeJours: 30, montant: 3000 },
];

const AVANTAGES = [
  { icon: <FiArrowUp   size={18} />, text: 'Profil affiché en tête de liste'        },
  { icon: <FiEye       size={18} />, text: 'Plus de visibilité auprès des clients'  },
  { icon: <FiZap       size={18} />, text: 'Badge "Boosté" sur votre profil'        },
  { icon: <FiTrendingUp size={18}/>, text: 'Augmentation des contacts et des demandes' },
];

const fmt = (n) => Number(n).toLocaleString('fr-FR');

export default function BoostPage() {
  const navigate  = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { loading: paying, error: payError, success: payOk, createAndPay, setError } = usePayment();

  const [options,      setOptions]      = useState([]);
  const [loadingOpts,  setLoadingOpts]  = useState(true);
  const [selectedIdx,  setSelectedIdx]  = useState(-1);

  // ── Charger les options depuis Firestore ─────────────────────────────────
  useEffect(() => {
    getDoc(doc(db, 'parametres', 'config'))
      .then(snap => {
        const opts = snap.data()?.optionsPub;
        setOptions(Array.isArray(opts) && opts.length ? opts : DEFAULT_OPTIONS);
      })
      .catch(() => setOptions(DEFAULT_OPTIONS))
      .finally(() => setLoadingOpts(false));
  }, []);

  // ── Paiement ─────────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!user) { navigate('/connexion'); return; }
    const option = options[selectedIdx];
    if (!option) return;

    setError(null);
    const nameParts = (profile?.nom || 'Artisan').split(' ');

    await createAndPay({
      uid:              user.uid,
      type:             'boost',
      montant:          option.montant,
      description:      `${option.nom} — AZÔTCHÉ Bénin`,
      customerFirstName: nameParts[0],
      customerLastName:  nameParts.slice(1).join(' ') || 'Client',
      customerPhone:    profile?.phoneNumber || user?.phoneNumber || '',
      dureeJours:       option.dureeJours,
      onSuccess: async () => {
        await refreshProfile();
        setSelectedIdx(-1);
      },
    });
  };

  const proActif = profile?.plan === 'pro' || profile?.plan === 'premium';

  return (
    <div className="boost-page">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="boost-header">
        <button className="boost-back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft size={20} />
        </button>
        <h1 className="boost-page-title">Booster mon profil</h1>
      </div>

      <div className="boost-body">

        {/* ── Banner doré ───────────────────────────────────────────────── */}
        <div className="boost-banner">
          <div className="boost-banner-icon">
            <FiZap size={28} />
          </div>
          <div className="boost-banner-text">
            <h2 className="boost-banner-title">Boostez votre visibilité !</h2>
            <p className="boost-banner-sub">Apparaissez en premier dans les recherches</p>
          </div>
        </div>

        {/* ── Statut boost actif ────────────────────────────────────────── */}
        {proActif && profile?.boostActif && (
          <div className="boost-active-badge">
            <FiZap size={16} />
            <span>Boost actif — inclus dans votre abonnement</span>
          </div>
        )}

        {/* ── Avantages ─────────────────────────────────────────────────── */}
        <div className="boost-section">
          <h2 className="boost-section-title">Avantages du Boost</h2>
          <div className="boost-avantages">
            {AVANTAGES.map(({ icon, text }) => (
              <div key={text} className="boost-avantage">
                <div className="boost-avantage-icon">{icon}</div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Options ───────────────────────────────────────────────────── */}
        <div className="boost-section">
          <h2 className="boost-section-title">Choisissez votre formule</h2>

          {loadingOpts ? (
            <div className="boost-skeleton-list">
              {[0, 1, 2].map(i => <div key={i} className="boost-skeleton-item" />)}
            </div>
          ) : (
            <div className="boost-options">
              {options.map((opt, idx) => {
                const isSelected = selectedIdx === idx;
                const isPopular  = idx === 1; // Le milieu est "Populaire"
                return (
                  <button
                    key={idx}
                    className={`boost-option ${isSelected ? 'boost-option--selected' : ''}`}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    {/* Radio */}
                    <span className={`boost-radio ${isSelected ? 'boost-radio--on' : ''}`}>
                      {isSelected && <span className="boost-radio-dot" />}
                    </span>

                    {/* Info */}
                    <span className="boost-option-info">
                      <span className="boost-option-name">
                        {opt.nom}
                        {isPopular && (
                          <span className="boost-popular-tag">Populaire</span>
                        )}
                      </span>
                      <span className="boost-option-sub">{opt.dureeJours} jours de visibilité</span>
                    </span>

                    {/* Prix */}
                    <span className={`boost-option-price ${isSelected ? 'boost-option-price--on' : ''}`}>
                      {fmt(opt.montant)} F
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Messages feedback ─────────────────────────────────────────── */}
        {payOk && (
          <div className="boost-alert boost-alert--success">
            <FiZap /> Boost activé ! Votre profil est maintenant mis en avant.
          </div>
        )}
        {payError && (
          <div className="boost-alert boost-alert--error">
            {payError}
          </div>
        )}

        {/* ── Bouton payer ──────────────────────────────────────────────── */}
        <button
          className="boost-pay-btn"
          disabled={selectedIdx < 0 || paying}
          onClick={handlePay}
        >
          {paying ? (
            <><span className="boost-spinner" /> Préparation du paiement...</>
          ) : selectedIdx >= 0 ? (
            <>
              <FiZap size={18} />
              Payer {fmt(options[selectedIdx]?.montant || 0)} FCFA
            </>
          ) : (
            'Choisir une formule'
          )}
        </button>

        {/* ── Sécurité ──────────────────────────────────────────────────── */}
        <p className="boost-secure-note">
          <FiLock size={13} /> Paiement sécurisé via Mobile Money (MTN · Moov · Celtis)
        </p>

      </div>
    </div>
  );
}
