import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { FaFacebook, FaInstagram, FaWhatsapp, FaTiktok, FaApple } from 'react-icons/fa';
import { SiGoogleplay } from 'react-icons/si';
import config from '../config';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">

          {/* Colonne marque */}
          <div className="footer-brand-col">
            <Link to="/" className="navbar-logo footer-logo">
              <img src="/logo.png" alt="AZOTCHE" className="logo-img" />
              <span>AZO<span className="logo-accent">TCHE</span></span>
            </Link>
            <p className="footer-brand-desc">
              La plateforme qui connecte clients et artisans de confiance au Benin.
              Trouvez les meilleurs talents pres de chez vous.
            </p>
            <div className="footer-socials">
              <a href={config.social.facebook} className="footer-social" aria-label="Facebook" target="_blank" rel="noopener noreferrer"><FaFacebook /></a>
              <a href={config.social.instagram} className="footer-social" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
              <a href={config.social.tiktok} className="footer-social" aria-label="TikTok" target="_blank" rel="noopener noreferrer"><FaTiktok /></a>
              <a href={config.social.whatsapp} className="footer-social" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer"><FaWhatsapp /></a>
            </div>

            {/* Telechargement app */}
            <div className="footer-apps">
              <a href={config.playStoreUrl} className="store-badge store-badge-android" target="_blank" rel="noopener noreferrer">
                <div className="store-badge-fallback">
                  <SiGoogleplay size={22} />
                  <div>
                    <span>Disponible sur</span>
                    <strong>Google Play</strong>
                  </div>
                </div>
              </a>
              <div className="store-badge store-badge-ios coming-soon">
                <div className="store-badge-fallback">
                  <FaApple size={22} />
                  <div>
                    <span>Bientôt sur</span>
                    <strong>App Store</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="footer-column">
            <h4>Plateforme</h4>
            <Link to="/">Accueil</Link>
            <Link to="/artisans">Annuaire artisans</Link>
            <Link to="/carte">Carte interactive</Link>
            <Link to="/publications">Offres de service</Link>
            <a href="/#fonctionnalites">Fonctionnalites</a>
            <Link to="/promo">Affiches promo</Link>
          </div>

          {/* Aide */}
          <div className="footer-column">
            <h4>Aide</h4>
            <Link to="/faq">FAQ</Link>
            <Link to="/support">Support</Link>
            <Link to="/connexion">Se connecter</Link>
            <hr className="footer-divider" />
            <h4>Legal</h4>
            <Link to="/politique-de-confidentialite">Confidentialite</Link>
            <Link to="/conditions-generales">CGU</Link>
            <Link to="/mentions-legales">Mentions legales</Link>
          </div>

          {/* Contact */}
          <div className="footer-column">
            <h4>Contact</h4>
            <a href={`mailto:${config.supportEmail}`}>
              <FiMail />{config.supportEmail}
            </a>
            <a href={`tel:${config.supportPhone.replace(/\s/g, '')}`}>
              <FiPhone />{config.supportPhone}
            </a>
            <span className="footer-address">
              <FiMapPin />{config.address}
            </span>
            <a href={config.social.whatsapp} className="btn btn-outline footer-whatsapp-btn" target="_blank" rel="noopener noreferrer">
              <FaWhatsapp /> Nous contacter
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {year} AZOTCHE. Tous droits reserves. Fait avec au Benin.</p>
          <div className="footer-bottom-links">
            <Link to="/politique-de-confidentialite">Confidentialite</Link>
            <span>·</span>
            <Link to="/conditions-generales">CGU</Link>
            <span>·</span>
            <Link to="/mentions-legales">Mentions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
