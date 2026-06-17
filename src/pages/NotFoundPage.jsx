import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiHome, FiSearch, FiFileText, FiTool } from 'react-icons/fi';
import usePageMeta from '../hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta({ title: 'Page introuvable', noIndex: true });
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <div className="notfound-inner">
        <div className="notfound-code">404</div>
        <div className="notfound-illustration">
          <FiTool className="notfound-icon" />
        </div>
        <h1>Page introuvable</h1>
        <p>
          Cette page n'existe pas ou a ete deplacee.<br />
          Pas de panique, les artisans d'Azotche sont toujours disponibles !
        </p>

        <div className="notfound-actions">
          <Link to="/" className="btn btn-primary">
            <FiHome /> Retour a l'accueil
          </Link>
          <Link to="/artisans" className="btn btn-outline">
            <FiSearch /> Trouver un artisan
          </Link>
          <Link to="/publications" className="btn btn-outline">
            <FiFileText /> Voir les offres
          </Link>
        </div>

        <button className="notfound-back" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Page precedente
        </button>
      </div>
    </div>
  );
}
