/**
 * ParrainagePage — Système de parrainage Azôtché
 * Conforme à Flutter ReferralScreen
 * Code unique, compteur filleuls, crédits boost
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCopy, FiShare2, FiGift, FiCheck, FiUsers, FiZap } from 'react-icons/fi';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const MILESTONE_EVERY = 5; // Palier tous les 5 parrainages

export default function ParrainagePage() {
  const navigate         = useNavigate();
  const { user, profile } = useAuth();

  const [filleulsCount, setFilleulsCount] = useState(0);
  const [credits,       setCredits]       = useState(0);
  const [joursParCredit, setJoursParCredit] = useState(2);
  const [loading,       setLoading]       = useState(true);
  const [copied,        setCopied]        = useState(false);

  const referralCode = profile?.codeParrainage || profile?.referralCode || '—';

  // ── Charger les données ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    Promise.all([
      // Nombre de filleuls — referredBy contient l'UID du parrain (jamais
      // un champ "parrainUid", qu'aucun code, mobile ou web, n'écrit).
      getDocs(query(collection(db, 'users'), where('referredBy', '==', uid)))
        .then(snap => snap.size),

      // Crédits depuis le profil utilisateur
      getDoc(doc(db, 'users', uid))
        .then(snap => snap.data()?.creditParrainage || 0),

      // Taux de conversion — même emplacement que le mobile :
      // config/app → credit_boost_jours_par_credit (et non parametres/config).
      getDoc(doc(db, 'config', 'app'))
        .then(snap => snap.data()?.credit_boost_jours_par_credit ?? 2),
    ]).then(([count, cred, taux]) => {
      setFilleulsCount(count);
      setCredits(cred);
      setJoursParCredit(taux);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // ── Copier le code ───────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Partager ─────────────────────────────────────────────────────────────
  const handleShare = () => {
    const text =
      `Rejoignez Azôtché, la plateforme des artisans du Bénin ! 🇧🇯\n` +
      `Utilisez mon code de parrainage : ${referralCode}\n` +
      `Téléchargez l'application : https://azotche.bj`;

    if (navigator.share) {
      navigator.share({ title: 'Azôtché — Parrainage', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Progress bar milestone ───────────────────────────────────────────────
  const progressInMilestone = filleulsCount % MILESTONE_EVERY;
  const nextMilestone       = (Math.floor(filleulsCount / MILESTONE_EVERY) + 1) * MILESTONE_EVERY;
  const progressPct         = (progressInMilestone / MILESTONE_EVERY) * 100;
  const milestonesReached   = Math.floor(filleulsCount / MILESTONE_EVERY);

  return (
    <div className="parr-page">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="parr-header">
        <button className="parr-back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft size={20} />
        </button>
        <h1 className="parr-title">Parrainage</h1>
      </div>

      <div className="parr-body">

        {/* ── Héros ─────────────────────────────────────────────────────── */}
        <div className="parr-hero">
          <div className="parr-hero-icon">
            <FiGift size={44} />
          </div>
          <h2 className="parr-hero-title">Invitez vos collègues !</h2>
          <p className="parr-hero-sub">
            Partagez votre code, gagnez des crédits<br />
            pour booster votre profil.
          </p>
        </div>

        {/* ── Code de parrainage ────────────────────────────────────────── */}
        <div className="parr-code-card">
          <p className="parr-code-label">VOTRE CODE UNIQUE</p>
          <div className="parr-code-row">
            <span className="parr-code-value">{referralCode}</span>
            <button
              className={`parr-copy-btn ${copied ? 'parr-copy-btn--done' : ''}`}
              onClick={handleCopy}
              title="Copier"
            >
              {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
            </button>
          </div>
        </div>

        {/* ── Bouton partager ───────────────────────────────────────────── */}
        <button className="parr-share-btn" onClick={handleShare}>
          <FiShare2 size={18} />
          Partager mon code
        </button>

        {/* ── Statistiques ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="parr-stats-skeleton">
            {[0, 1, 2].map(i => <div key={i} className="parr-stat-skel" />)}
          </div>
        ) : (
          <div className="parr-stats">
            <div className="parr-stat-card">
              <div className="parr-stat-icon parr-stat-icon--users">
                <FiUsers size={20} />
              </div>
              <p className="parr-stat-value">{filleulsCount}</p>
              <p className="parr-stat-label">Filleuls</p>
            </div>
            <div className="parr-stat-card">
              <div className="parr-stat-icon parr-stat-icon--gift">
                <FiGift size={20} />
              </div>
              <p className="parr-stat-value">{credits}</p>
              <p className="parr-stat-label">Crédits</p>
            </div>
            <div className="parr-stat-card">
              <div className="parr-stat-icon parr-stat-icon--boost">
                <FiZap size={20} />
              </div>
              <p className="parr-stat-value">{milestonesReached}</p>
              <p className="parr-stat-label">Paliers atteints</p>
            </div>
          </div>
        )}

        {/* ── Progression vers le prochain palier ──────────────────────── */}
        <div className="parr-progress-card">
          <div className="parr-progress-header">
            <span className="parr-progress-label">Prochain palier</span>
            <span className="parr-progress-count">
              {progressInMilestone} / {MILESTONE_EVERY}
            </span>
          </div>
          <div className="parr-progress-bar">
            <div
              className="parr-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="parr-progress-sub">
            {progressInMilestone === 0 && filleulsCount === 0
              ? 'Parrainez 5 personnes pour débloquer votre premier boost !'
              : `Plus que ${MILESTONE_EVERY - progressInMilestone} parrainage(s) pour atteindre ${nextMilestone} filleuls`
            }
          </p>
        </div>

        {/* ── Comment ça marche ─────────────────────────────────────────── */}
        <div className="parr-how">
          <h2 className="parr-section-title">Comment ça marche ?</h2>
          <div className="parr-steps">
            {[
              {
                num: '1',
                title: 'Partagez votre code',
                desc: 'Envoyez votre code unique à vos collègues artisans',
              },
              {
                num: '2',
                title: 'Ils s\'inscrivent',
                desc: 'Ils utilisent votre code lors de leur inscription sur Azôtché',
              },
              {
                num: '3',
                title: 'Vous gagnez',
                desc: `Pour chaque palier de ${MILESTONE_EVERY} filleuls, vous gagnez ${joursParCredit} jours de boost`,
              },
            ].map(step => (
              <div key={step.num} className="parr-step">
                <div className="parr-step-num">{step.num}</div>
                <div className="parr-step-content">
                  <h3 className="parr-step-title">{step.title}</h3>
                  <p className="parr-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Crédits disponibles ───────────────────────────────────────── */}
        {credits > 0 && (
          <div className="parr-credits-card">
            <div className="parr-credits-icon">
              <FiZap size={22} />
            </div>
            <div className="parr-credits-text">
              <p className="parr-credits-title">
                Vous avez <strong>{credits} crédit{credits > 1 ? 's' : ''}</strong>
              </p>
              <p className="parr-credits-sub">
                = {credits * joursParCredit} jour{credits * joursParCredit > 1 ? 's' : ''} de boost disponibles
              </p>
            </div>
            <button
              className="parr-credits-use-btn"
              onClick={() => navigate('/boost')}
            >
              Utiliser
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
