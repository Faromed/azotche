import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import config from '../config';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  const scrollTo = (e, id) => {
    if (location.pathname === '/') {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <img src="/logo.png" alt="AZÔTCHÉ" className="logo-img" />
          <span>AZÔ<span className="logo-accent">TCHÉ</span></span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Accueil</Link>
          <a href="/#fonctionnalites" onClick={(e) => scrollTo(e, 'fonctionnalites')}>Fonctionnalités</a>
          <a href="/#telecharger" onClick={(e) => scrollTo(e, 'telecharger')}>Télécharger</a>
          <Link to="/promo" className={location.pathname === '/promo' ? 'active' : ''}>Affiches</Link>
          <Link to="/faq" className={location.pathname === '/faq' ? 'active' : ''}>FAQ</Link>
          <Link to="/support" className={location.pathname === '/support' ? 'active' : ''}>Support</Link>
          <a href={config.apkDownloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary navbar-cta">
            <FiDownload /> APK
          </a>
        </div>

        <button
          className={`navbar-toggle ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </div>

      <div className={`navbar-mobile ${mobileOpen ? 'show' : ''}`}>
        <Link to="/">Accueil</Link>
        <Link to="/promo">Affiches promo</Link>
        <Link to="/faq">FAQ</Link>
        <Link to="/support">Support</Link>
        <Link to="/conditions-generales">CGU</Link>
        <Link to="/politique-de-confidentialite">Confidentialité</Link>
        <a href={config.apkDownloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          <FiDownload /> Télécharger l'APK
        </a>
      </div>
    </nav>
  );
}