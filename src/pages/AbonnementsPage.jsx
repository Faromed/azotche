/**
 * AbonnementsPage — Plans & Abonnements Azôtché
 * Conforme à Flutter SubscriptionsScreen
 * Plans : Gratuit / Pro (2 000 F) / Premium (5 000 F)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheck, FiX, FiZap, FiStar, FiAward, FiArrowLeft,
  FiChevronDown, FiChevronUp, FiShield, FiTrendingUp,
} from 'react-icons/fi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';

// ── Données des plans (cohérentes avec Flutter) ──────────────────────────────
const PLAN_FEATURES = {
  gratuit: [
    { text: '3 publications gratuites',    ok: true  },
    { text: 'Profil visible dans l\'annuaire', ok: true  },
    { text: 'Accès aux avis clients',      ok: true  },
    { text: 'Boost prioritaire',           ok: false },
    { text: 'Publications illimitées',     ok: false },
    { text: 'Badge Pro',                   ok: false },
    { text: 'Statistiques avancées',       ok: false },
    { text: 'Génération de devis PDF',     ok: false },
  ],
  pro: [
    { text: '15 publications par mois',    ok: true  },
    { text: 'Profil visible dans l\'annuaire', ok: true  },
    { text: 'Accès aux avis clients',      ok: true  },
    { text: 'Boost prioritaire 7 jours',   ok: true  },
    { text: 'Badge Pro',                   ok: true  },
    { text: 'Statistiques de base',        ok: true  },
    { text: 'Publications illimitées',     ok: false },
    { text: 'Génération de devis PDF',     ok: false },
  ],
  premium: [
    { text: 'Publications illimitées',     ok: true  },
    { text: 'Profil visible dans l\'annuaire', ok: true  },
    { text: 'Accès aux avis clients',      ok: true  },
    { text: 'Boost permanent',             ok: true  },
    { text: 'Badge Premium',               ok: true  },
    { text: 'Statistiques avancées',       ok: true  },
    { text: 'Génération de devis PDF',     ok: true  },
    { text: 'Support prioritaire',         ok: true  },
  ],
};

const FAQ_ITEMS = [
  {
    q: 'Comment fonctionne le paiement ?',
    a: 'Le paiement s\'effectue via Mobile Money (MTN MoMo, Moov Money, Celtis) grâce à FedaPay, une solution de paiement sécurisée.',
  },
  {
    q: 'Puis-je résilier mon abonnement ?',
    a: 'Oui, votre abonnement est mensuel. À la fin du mois, votre compte repassera automatiquement au plan Gratuit si vous ne renouvelez pas.',
  },
  {
    q: 'Que se passe-t-il si je dépasse mes 3 publications gratuites ?',
    a: 'Vos publications existantes restent visibles, mais vous ne pourrez plus en créer de nouvelles. Passez au plan Pro pour continuer.',
  },
  {
    q: 'Le Boost est-il inclus dans le plan Pro ?',
    a: 'Oui, le plan Pro inclut 7 jours de boost dès l\'activation. Pour le Premium, le boost est permanent pendant toute la durée de l\'abonnement.',
  },
  {
    q: 'Comment obtenir de l\'aide ?',
    a: 'Contactez notre support via la page Support ou envoyez un message WhatsApp au +229 XX XX XX XX.',
  },
];

export default function AbonnementsPage() {
  const navigate  = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { loading: paying, error: payError, success: payOk, createAndPay, setError } = usePayment();

  const [prixPro,     setPrixPro]     = useState(2000);
  const [prixPremium, setPrixPremium] = useState(5000);
  const [loadingPrix, setLoadingPrix] = useState(true);
  const [openFaq,     setOpenFaq]     = useState(null);
  const [payingPlan,  setPayingPlan]  = useState(null); // 'pro' | 'premium'

  const planActuel = profile?.plan || 'gratuit';

  // ── Charger les prix depuis Firestore ────────────────────────────────────
  useEffect(() => {
    getDoc(doc(db, 'config', 'app')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.prix_abonnement_pro)     setPrixPro(d.prix_abonnement_pro);
        if (d.prix_abonnement_premium) setPrixPremium(d.prix_abonnement_premium);
      }
    }).catch(console.error).finally(() => setLoadingPrix(false));
  }, []);

  // ── Lancer le paiement ───────────────────────────────────────────────────
  const handlePay = async (plan) => {
    if (!user) { navigate('/connexion'); return; }
    setPayingPlan(plan);
    setError(null);

    const montant     = plan === 'pro' ? prixPro : prixPremium;
    const planLabel   = plan === 'pro' ? 'Pro' : 'Premium';
    const nameParts   = (profile?.nom || 'Artisan').split(' ');
    const firstName   = nameParts[0];
    const lastName    = nameParts.slice(1).join(' ') || 'Client';

    await createAndPay({
      uid:              user.uid,
      type:             plan === 'pro' ? 'abonnement' : 'premium',
      montant,
      description:      `Abonnement ${planLabel} — AZÔTCHÉ Bénin`,
      customerFirstName: firstName,
      customerLastName:  lastName,
      customerPhone:    profile?.phoneNumber || user?.phoneNumber || '',
      onSuccess: async () => {
        await refreshProfile();
        setPayingPlan(null);
      },
      onFailure: () => setPayingPlan(null),
    });
  };

  const fmt = (n) => Number(n).toLocaleString('fr-FR');

  return (
    <div className="abo-page">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="abo-header">
        <button className="abo-back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft size={20} />
        </button>
        <div className="abo-header-content">
          <h1 className="abo-title">Plans &amp; Abonnements</h1>
          <p className="abo-subtitle">Choisissez le plan adapté à votre activité</p>
        </div>
      </div>

      <div className="abo-body">

        {/* ── Statut plan actuel ─────────────────────────────────────────── */}
        {planActuel !== 'gratuit' && (
          <div className={`abo-current-plan abo-current-plan--${planActuel}`}>
            <div className="abo-current-plan-icon">
              {planActuel === 'premium' ? <FiAward size={20} /> : <FiStar size={20} />}
            </div>
            <div>
              <p className="abo-current-plan-label">Votre plan actuel</p>
              <p className="abo-current-plan-name">
                Plan {planActuel === 'premium' ? 'Premium' : 'Pro'}
              </p>
            </div>
          </div>
        )}

        {/* ── Cartes de plans ───────────────────────────────────────────── */}
        <div className="abo-plans">

          {/* ─ Gratuit ─ */}
          <div className={`abo-plan-card ${planActuel === 'gratuit' ? 'abo-plan-card--current' : ''}`}>
            <div className="abo-plan-header abo-plan-header--gratuit">
              <div className="abo-plan-icon">
                <FiZap size={24} />
              </div>
              <h2 className="abo-plan-name">Gratuit</h2>
              <p className="abo-plan-price">
                <span className="abo-plan-amount">0</span>
                <span className="abo-plan-currency"> FCFA/mois</span>
              </p>
            </div>
            <ul className="abo-features">
              {PLAN_FEATURES.gratuit.map((f, i) => (
                <li key={i} className={`abo-feature ${f.ok ? 'abo-feature--ok' : 'abo-feature--no'}`}>
                  {f.ok
                    ? <FiCheck size={14} className="abo-feature-icon" />
                    : <FiX    size={14} className="abo-feature-icon" />
                  }
                  {f.text}
                </li>
              ))}
            </ul>
            {planActuel === 'gratuit' && (
              <div className="abo-plan-badge-current">Plan actuel</div>
            )}
          </div>

          {/* ─ Pro (recommandé) ─ */}
          <div className={`abo-plan-card abo-plan-card--pro ${planActuel === 'pro' ? 'abo-plan-card--current' : ''}`}>
            <div className="abo-popular-badge">Recommandé</div>
            <div className="abo-plan-header abo-plan-header--pro">
              <div className="abo-plan-icon">
                <FiStar size={24} />
              </div>
              <h2 className="abo-plan-name">Pro</h2>
              {loadingPrix ? (
                <div className="abo-price-skeleton" />
              ) : (
                <p className="abo-plan-price">
                  <span className="abo-plan-amount">{fmt(prixPro)}</span>
                  <span className="abo-plan-currency"> FCFA/mois</span>
                </p>
              )}
            </div>
            <ul className="abo-features">
              {PLAN_FEATURES.pro.map((f, i) => (
                <li key={i} className={`abo-feature ${f.ok ? 'abo-feature--ok' : 'abo-feature--no'}`}>
                  {f.ok
                    ? <FiCheck size={14} className="abo-feature-icon" />
                    : <FiX    size={14} className="abo-feature-icon" />
                  }
                  {f.text}
                </li>
              ))}
            </ul>
            {planActuel === 'pro' ? (
              <div className="abo-plan-badge-current">Plan actuel</div>
            ) : (
              <button
                className="abo-pay-btn abo-pay-btn--pro"
                onClick={() => handlePay('pro')}
                disabled={paying && payingPlan === 'pro'}
              >
                {paying && payingPlan === 'pro' ? (
                  <><span className="abo-spinner" /> Préparation...</>
                ) : (
                  <>Passer au Pro — {fmt(prixPro)} F</>
                )}
              </button>
            )}
          </div>

          {/* ─ Premium ─ */}
          <div className={`abo-plan-card abo-plan-card--premium ${planActuel === 'premium' ? 'abo-plan-card--current' : ''}`}>
            <div className="abo-plan-header abo-plan-header--premium">
              <div className="abo-plan-icon">
                <FiAward size={24} />
              </div>
              <h2 className="abo-plan-name">Premium</h2>
              {loadingPrix ? (
                <div className="abo-price-skeleton" />
              ) : (
                <p className="abo-plan-price">
                  <span className="abo-plan-amount">{fmt(prixPremium)}</span>
                  <span className="abo-plan-currency"> FCFA/mois</span>
                </p>
              )}
            </div>
            <ul className="abo-features">
              {PLAN_FEATURES.premium.map((f, i) => (
                <li key={i} className={`abo-feature ${f.ok ? 'abo-feature--ok' : 'abo-feature--no'}`}>
                  {f.ok
                    ? <FiCheck size={14} className="abo-feature-icon" />
                    : <FiX    size={14} className="abo-feature-icon" />
                  }
                  {f.text}
                </li>
              ))}
            </ul>
            {planActuel === 'premium' ? (
              <div className="abo-plan-badge-current">Plan actuel</div>
            ) : (
              <button
                className="abo-pay-btn abo-pay-btn--premium"
                onClick={() => handlePay('premium')}
                disabled={paying && payingPlan === 'premium'}
              >
                {paying && payingPlan === 'premium' ? (
                  <><span className="abo-spinner" /> Préparation...</>
                ) : (
                  <>Passer au Premium — {fmt(prixPremium)} F</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Messages feedback ─────────────────────────────────────────── */}
        {payOk && (
          <div className="abo-alert abo-alert--success">
            <FiCheck size={18} />
            <span>Abonnement activé avec succès ! Votre profil est mis à jour.</span>
          </div>
        )}
        {payError && (
          <div className="abo-alert abo-alert--error">
            <FiX size={18} />
            <span>{payError}</span>
          </div>
        )}

        {/* ── Paiement sécurisé ─────────────────────────────────────────── */}
        <div className="abo-secure">
          <FiShield size={16} />
          <span>Paiement sécurisé — MTN MoMo · Moov Money · Celtis</span>
        </div>

        {/* ── Tableau comparatif ────────────────────────────────────────── */}
        <div className="abo-compare">
          <h2 className="abo-section-title">Comparaison des plans</h2>
          <div className="abo-compare-table-wrap">
            <table className="abo-compare-table">
              <thead>
                <tr>
                  <th>Fonctionnalité</th>
                  <th>Gratuit</th>
                  <th className="abo-th-pro">Pro</th>
                  <th className="abo-th-premium">Premium</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Publications',       '3 / mois',    '15 / mois',  'Illimitées'],
                  ['Boost prioritaire',  '—',           '7 jours',    'Permanent'],
                  ['Badge Pro',          '—',           '✓',          '✓'],
                  ['Badge Premium',      '—',           '—',          '✓'],
                  ['Devis PDF',          '—',           '—',          '✓'],
                  ['Support',            'Standard',    'Standard',   'Prioritaire'],
                ].map(([feat, g, p, pm]) => (
                  <tr key={feat}>
                    <td>{feat}</td>
                    <td>{g}</td>
                    <td className="abo-td-pro">{p}</td>
                    <td className="abo-td-premium">{pm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pourquoi passer Pro ? ─────────────────────────────────────── */}
        <div className="abo-why">
          <h2 className="abo-section-title">Pourquoi passer au Pro ?</h2>
          <div className="abo-why-grid">
            {[
              { icon: <FiTrendingUp size={22} />, title: 'Plus de visibilité', desc: 'Apparaissez en tête des recherches grâce au boost inclus' },
              { icon: <FiStar      size={22} />, title: 'Badge Pro',          desc: 'Montrez que vous êtes un professionnel sérieux' },
              { icon: <FiCheck     size={22} />, title: '15 publications',    desc: 'Partagez plus de travaux et attirez plus de clients' },
              { icon: <FiAward     size={22} />, title: 'Premium = tout',     desc: 'Publications illimitées, devis PDF et boost permanent' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="abo-why-card">
                <div className="abo-why-icon">{icon}</div>
                <h3 className="abo-why-title">{title}</h3>
                <p className="abo-why-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <div className="abo-faq">
          <h2 className="abo-section-title">Questions fréquentes</h2>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className={`abo-faq-item ${openFaq === i ? 'abo-faq-item--open' : ''}`}>
              <button
                className="abo-faq-question"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                {openFaq === i
                  ? <FiChevronUp   size={18} />
                  : <FiChevronDown size={18} />
                }
              </button>
              {openFaq === i && (
                <p className="abo-faq-answer">{item.a}</p>
              )}
            </div>
          ))}
        </div>

      </div>{/* /abo-body */}
    </div>
  );
}
