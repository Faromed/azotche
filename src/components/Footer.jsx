import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { FaFacebook, FaInstagram, FaWhatsapp, FaTiktok } from 'react-icons/fa';
import config from '../config';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link to="/" className="navbar-logo" style={{ color: 'white', marginBottom: 4 }}>
              <img src="/logo.png" alt="AZÔTCHÉ" className="logo-img" />
              <span>AZÔ<span className="logo-accent">TCHÉ</span></span>
            </Link>
            <p className="footer-brand-desc">
              La plateforme qui connecte clients et artisans de confiance au Bénin.
              Trouvez les meilleurs talents près de chez vous.
            </p>
            <div className="footer-socials">
              <a href={config.social.facebook} className="footer-social" aria-label="Facebook"><FaFacebook /></a>
              <a href={config.social.instagram} className="footer-social" aria-label="Instagram"><FaInstagram /></a>
              <a href={config.social.tiktok} className="footer-social" aria-label="TikTok"><FaTiktok /></a>
              <a href={config.social.whatsapp} className="footer-social" aria-label="WhatsApp"><FaWhatsapp /></a>
            </div>
          </div>
          <div className="footer-column">
            <h4>Navigation</h4>
            <Link to="/">Accueil</Link>
            <a href="/#fonctionnalites">Fonctionnalités</a>
            <a href="/#telecharger">Télécharger</a>
            <Link to="/promo">Affiches promo</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/support">Support</Link>
          </div>
          <div className="footer-column">
            <h4>Légal</h4>
            <Link to="/politique-de-confidentialite">Confidentialité</Link>
            <Link to="/conditions-generales">CGU</Link>
            <Link to="/mentions-legales">Mentions légales</Link>
          </div>
          <div className="footer-column">
            <h4>Contact</h4>
            <a href={`mailto:${config.supportEmail}`}>
              <FiMail style={{ verticalAlign: 'middle', marginRight: 8 }} />{config.supportEmail}
            </a>
            <a href={`tel:${config.supportPhone.replace(/\s/g, '')}`}>
              <FiPhone style={{ verticalAlign: 'middle', marginRight: 8 }} />{config.supportPhone}
            </a>
            <a href="#">
              <FiMapPin style={{ verticalAlign: 'middle', marginRight: 8 }} />{config.address}
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {year} AZÔTCHÉ. Tous droits réservés.</p>
          <div className="footer-bottom-links">
            <Link to="/politique-de-confidentialite">Confidentialité</Link>
            <Link to="/conditions-generales">CGU</Link>
            <Link to="/mentions-legales">Mentions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}