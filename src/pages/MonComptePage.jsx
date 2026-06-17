import { Link } from 'react-router-dom';
import {
  FiUser, FiMail, FiLogOut, FiSearch,
  FiExternalLink, FiShield,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function MonComptePage() {
  const { user, profile, signOut } = useAuth();

  const name    = profile?.nom || user?.displayName || '';
  const email   = user?.email || '';
  const photoUrl = profile?.photoUrl || user?.photoURL || '';
  const initial  = name?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="compte-page">
      <div className="container">

        {/* ── En-tête profil ── */}
        <div className="compte-hero">
          <div className="compte-avatar-wrap">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="compte-avatar" />
            ) : (
              <div className="compte-avatar-placeholder">{initial}</div>
            )}
          </div>
          <div className="compte-info">
            <h1>{name || 'Mon compte'}</h1>
            {email && (
              <p className="compte-email">
                <FiMail /> {email}
              </p>
            )}
            <span className="compte-role-chip">Client</span>
          </div>
        </div>

        {/* ── Actions rapides ── */}
        <div className="compte-grid">
          <Link to="/artisans" className="compte-action-card">
            <div className="cac-icon orange"><FiSearch /></div>
            <div>
              <h3>Trouver un artisan</h3>
              <p>Parcourez l'annuaire des professionnels</p>
            </div>
          </Link>

          <div className="compte-action-card compte-action-card--muted">
            <div className="cac-icon grey"><FiUser /></div>
            <div>
              <h3>Mes demandes</h3>
              <p>Disponible prochainement</p>
            </div>
          </div>
        </div>

        {/* ── Informations compte ── */}
        <div className="compte-card">
          <h2><FiShield /> Informations du compte</h2>
          <div className="compte-detail-list">
            <div className="compte-detail-item">
              <span className="cdi-label">Nom</span>
              <span className="cdi-value">{name || '—'}</span>
            </div>
            <div className="compte-detail-item">
              <span className="cdi-label">Email</span>
              <span className="cdi-value">{email || '—'}</span>
            </div>
            <div className="compte-detail-item">
              <span className="cdi-label">Connexion via</span>
              <span className="cdi-value">
                {profile?.authProvider === 'google' ? 'Google' : 'Téléphone'}
              </span>
            </div>
            <div className="compte-detail-item">
              <span className="cdi-label">Rôle</span>
              <span className="cdi-value">Client</span>
            </div>
          </div>
        </div>

        {/* ── Vous êtes artisan ? ── */}
        <div className="compte-pro-banner">
          <div className="compte-pro-banner-text">
            <h3>Vous êtes artisan ?</h3>
            <p>Téléchargez l'application Android pour créer votre profil professionnel et être visible par des milliers de clients.</p>
          </div>
          <a
            href="https://azotche.com/#telecharger"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <FiExternalLink /> Télécharger l'app
          </a>
        </div>

        {/* ── Déconnexion ── */}
        <div className="compte-footer">
          <button className="btn-signout" onClick={signOut}>
            <FiLogOut /> Se déconnecter
          </button>
        </div>

      </div>
    </div>
  );
}
