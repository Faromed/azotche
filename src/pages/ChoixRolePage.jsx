import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiTool, FiSearch, FiArrowRight, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import usePageMeta from '../hooks/usePageMeta';

export default function ChoixRolePage() {
  usePageMeta({ title: 'Choisir mon rôle — AZÔTCHÉ' });

  const { signOut } = useAuth();
  const navigate    = useNavigate();
  const [role, setRole] = useState(null); // 'pro' | 'client'

  const handleContinue = () => {
    if (role === 'pro')    navigate('/inscription');
    if (role === 'client') navigate('/inscription-client');
  };

  const handleCancel = async () => {
    await signOut();
    navigate('/connexion', { replace: true });
  };

  return (
    <div className="choix-role-page">
      <div className="choix-role-card">

        {/* Logo */}
        <Link to="/" className="connexion-logo">
          <img src="/logo.png" alt="AZÔTCHÉ" />
          <span>AZO<span>TCHE</span></span>
        </Link>

        <h1 className="choix-role-title">Bienvenue !</h1>
        <p className="choix-role-sub">
          Comment souhaitez-vous utiliser Azôtché ?
        </p>

        <div className="choix-role-cards">
          {/* Carte artisan */}
          <button
            className={`role-card role-card--pro ${role === 'pro' ? 'selected' : ''}`}
            onClick={() => setRole('pro')}
          >
            <div className="role-card-icon">
              <FiTool />
            </div>
            <div className="role-card-body">
              <span className="role-card-badge role-card-badge--pro">PRO</span>
              <h3>Je suis artisan / commerçant</h3>
              <p>Créez votre profil et trouvez des clients près de chez vous</p>
            </div>
            <div className={`role-card-check ${role === 'pro' ? 'visible' : ''}`}>✓</div>
          </button>

          {/* Carte client */}
          <button
            className={`role-card role-card--client ${role === 'client' ? 'selected' : ''}`}
            onClick={() => setRole('client')}
          >
            <div className="role-card-icon role-card-icon--green">
              <FiSearch />
            </div>
            <div className="role-card-body">
              <span className="role-card-badge role-card-badge--client">CLIENT</span>
              <h3>Je cherche un artisan</h3>
              <p>Trouvez des professionnels de confiance au Bénin</p>
            </div>
            <div className={`role-card-check ${role === 'client' ? 'visible' : ''}`}>✓</div>
          </button>
        </div>

        <button
          className="btn btn-primary btn-full choix-role-btn"
          onClick={handleContinue}
          disabled={!role}
        >
          Continuer <FiArrowRight />
        </button>

        <button className="choix-role-cancel" onClick={handleCancel}>
          <FiX /> Annuler l'inscription
        </button>
      </div>
    </div>
  );
}
