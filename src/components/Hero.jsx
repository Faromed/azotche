import { FiDownload, FiArrowRight } from 'react-icons/fi';
import PhoneMockup from './PhoneMockup';
import config from '../config';

export default function Hero() {
  return (
    <section className="hero" id="accueil">
      <div className="container">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot" />
              Disponible au Bénin 🇧🇯
            </div>
            <h1 className="hero-title">
              Trouvez les meilleurs{' '}
              <span className="gradient-text">artisans</span> près de chez vous
            </h1>
            <p className="hero-subtitle">
              AZÔTCHÉ connecte clients et artisans de confiance au Bénin.
              Tailleurs, coiffeurs, plombiers, soudeurs — trouvez le bon pro
              en quelques secondes et contactez-le directement.
            </p>
            <div className="hero-buttons">
              <a href={config.apkDownloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-large download-btn-apk">
                <FiDownload /> Télécharger l'app
              </a>
              <a href="#fonctionnalites" className="btn btn-outline btn-large">
                Découvrir <FiArrowRight />
              </a>
            </div>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-value">100+</div>
                <div className="hero-stat-label">Artisans inscrits</div>
              </div>
              <div>
                <div className="hero-stat-value">10+</div>
                <div className="hero-stat-label">Catégories</div>
              </div>
              <div>
                <div className="hero-stat-value" style={{color:'var(--green)'}}>100%</div>
                <div className="hero-stat-label">Gratuit à consulter</div>
              </div>
            </div>
          </div>
          <div className="hero-phone">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}