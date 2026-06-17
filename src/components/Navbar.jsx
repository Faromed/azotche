import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiSearch, FiFileText, FiUser, FiLogOut, FiChevronDown, FiMap } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const userMenuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fermer menu mobile et user menu a chaque navigation
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  // Fermer user menu au clic exterieur
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Bloquer le scroll body quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const scrollTo = (e, id) => {
    if (location.pathname === '/') {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      setMobileOpen(false);
    }
  };

  // Pages avec hero sombre → navbar transparente au scroll-top (aspect premium)
  const isHomePage = location.pathname === '/';
  const isAppPage = location.pathname.startsWith('/artisans')
    || location.pathname.startsWith('/publications')
    || ['/connexion', '/dashboard', '/espace-pro', '/mon-compte'].includes(location.pathname);

  // Navbar opaque partout SAUF page d'accueil (hero) et pages app à hero sombre
  // Toutes les autres pages (abonnements, faq, support, carte, parrainage…) = opaque
  const navbarScrolled = scrolled || (!isHomePage && !isAppPage);

  const navLinks = [
    { to: '/', label: 'Accueil', exact: true },
    { to: '/#fonctionnalites', label: 'Fonctionnalites', scroll: 'fonctionnalites' },
    { to: '/artisans', label: 'Artisans', icon: <FiSearch />, chip: true },
    { to: '/carte', label: 'Carte', icon: <FiMap /> },
    { to: '/publications', label: 'Offres', icon: <FiFileText /> },
    { to: '/faq', label: 'FAQ' },
  ];

  const isActive = (link) => {
    if (link.exact) return location.pathname === link.to;
    if (link.to.startsWith('/#')) return false;
    return location.pathname.startsWith(link.to);
  };

  return (
    <>
      <nav className={`navbar ${navbarScrolled ? 'scrolled' : ''} ${isAppPage ? 'navbar-app' : ''}`}>
        <div className="navbar-inner">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <img src="/logo.png" alt="AZOTCHE" className="logo-img" />
            <span>AZÔ<span className="logo-accent">TCHÉ</span></span>
          </Link>

          {/* Desktop links */}
          <div className="navbar-links">
            {navLinks.map(link => (
              link.scroll ? (
                <a
                  key={link.to}
                  href={link.to}
                  onClick={(e) => scrollTo(e, link.scroll)}
                  className={isActive(link) ? 'active' : ''}
                >
                  {link.label}
                </a>
              ) : link.chip ? (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`navbar-artisans-link ${isActive(link) ? 'active' : ''}`}
                >
                  {link.icon} {link.label}
                </Link>
              ) : (
                <Link
                  key={link.to}
                  to={link.to}
                  className={isActive(link) ? 'active' : ''}
                >
                  {link.icon && <span className="nav-icon">{link.icon}</span>}{link.label}
                </Link>
              )
            ))}

            {/* Auth */}
            {user ? (
              <div className="navbar-user" ref={userMenuRef}>
                <button
                  className="navbar-user-btn"
                  onClick={() => setUserMenuOpen(o => !o)}
                  aria-expanded={userMenuOpen}
                >
                  {profile?.photoUrl || user.photoURL ? (
                    <img src={profile?.photoUrl || user.photoURL} alt="" className="navbar-avatar" />
                  ) : (
                    <div className="navbar-avatar-placeholder">
                      {(profile?.nom || user.displayName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <FiChevronDown className={`navbar-chevron ${userMenuOpen ? 'open' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className="navbar-user-menu">
                    <div className="navbar-user-header">
                      <span className="navbar-user-name">{profile?.nom || user.displayName}</span>
                      <span className="navbar-user-role">{profile?.role === 'pro' ? 'Artisan' : 'Client'}</span>
                    </div>
                    <Link to="/dashboard" className="navbar-menu-item">
                      <FiUser /> Mon espace
                    </Link>
                    <button className="navbar-menu-item navbar-menu-signout" onClick={signOut}>
                      <FiLogOut /> Se deconnecter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/connexion" className="btn btn-primary btn-sm navbar-cta">
                Connexion
              </Link>
            )}
          </div>

          {/* Hamburger mobile */}
          <button
            className={`navbar-hamburger ${mobileOpen ? 'open' : ''}`}
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </nav>

      {/* Menu mobile overlay */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}
      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          {/* User info si connecte */}
          {user && (
            <div className="mobile-user-info">
              {profile?.photoUrl || user.photoURL ? (
                <img src={profile?.photoUrl || user.photoURL} alt="" className="mobile-user-avatar" />
              ) : (
                <div className="mobile-user-avatar-placeholder">
                  {(profile?.nom || user.displayName || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <strong>{profile?.nom || user.displayName}</strong>
                <span>{profile?.role === 'pro' ? 'Artisan' : 'Client'}</span>
              </div>
            </div>
          )}

          <nav className="mobile-nav">
            {navLinks.map(link => (
              link.scroll ? (
                <a key={link.to} href={link.to} onClick={(e) => scrollTo(e, link.scroll)} className="mobile-nav-link">
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`mobile-nav-link ${isActive(link) ? 'active' : ''}`}
                >
                  {link.icon && link.icon} {link.label}
                </Link>
              )
            ))}
            <Link to="/support" className={`mobile-nav-link ${location.pathname === '/support' ? 'active' : ''}`}>
              Support
            </Link>
          </nav>

          <div className="mobile-menu-footer">
            {user ? (
              <>
                <Link to="/dashboard" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  <FiUser /> Mon espace
                </Link>
                <button className="mobile-signout" onClick={signOut}>
                  <FiLogOut /> Se deconnecter
                </button>
              </>
            ) : (
              <Link to="/connexion" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
