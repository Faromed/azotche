import { FiSearch, FiHeart, FiBell, FiUser, FiPhone } from 'react-icons/fi';

export default function PhoneMockup() {
  return (
    <div className="phone-container">
      <div className="phone-glow" />
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-screen">
          {/* Header */}
          <div className="ps-header">
            <div>
              <div className="ps-hello">👋 Bienvenue !</div>
              <div className="ps-name">AZÔTCHÉ</div>
            </div>
            <div className="ps-icons">
              <div className="ps-icon-btn">❤️</div>
              <div className="ps-icon-btn">🔔</div>
              <div className="ps-icon-btn" style={{background:'#FFF3EE'}}>👤</div>
            </div>
          </div>

          {/* Search */}
          <div className="ps-search">
            <div className="ps-search-bar">
              <FiSearch size={10} /> Rechercher un artisan...
            </div>
            <div className="ps-qr-btn">📷</div>
          </div>

          {/* Categories */}
          <div className="ps-cats">
            {[
              { icon: '🏗️', label: 'Bâtiment', bg: '#FFF3E0' },
              { icon: '✂️', label: 'Mode', bg: '#F3E5F5' },
              { icon: '💇', label: 'Beauté', bg: '#FCE4EC' },
              { icon: '🍽️', label: 'Food', bg: '#FFEBEE' },
              { icon: '⚡', label: 'Tech', bg: '#E3F2FD' },
            ].map((c, i) => (
              <div className="ps-cat" key={i}>
                <div className="ps-cat-icon" style={{background:c.bg}}>{c.icon}</div>
                <span className="ps-cat-label">{c.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="ps-cta-card">
            <div className="ps-cta-title">🚀 Vous êtes artisan ?</div>
            <div className="ps-cta-sub">Montrez votre talent à des milliers de clients</div>
            <div className="ps-cta-btn">S'inscrire</div>
          </div>

          {/* Pro cards */}
          {[
            { emoji: '👨‍🔧', name: 'Koffi Marc', metier: 'Plombier • Cotonou', stars: '⭐⭐⭐⭐⭐' },
            { emoji: '👩‍🎨', name: 'Adjo Marie', metier: 'Couturière • Calavi', stars: '⭐⭐⭐⭐' },
          ].map((p, i) => (
            <div className="ps-pro-card" key={i}>
              <div className="ps-pro-avatar">{p.emoji}</div>
              <div className="ps-pro-info">
                <div className="ps-pro-name">{p.name}</div>
                <div className="ps-pro-metier">{p.metier}</div>
                <div className="ps-pro-stars">{p.stars}</div>
              </div>
              <div className="ps-pro-contact">
                <div className="ps-pro-btn ps-pro-btn-call"><FiPhone size={9}/></div>
                <div className="ps-pro-btn ps-pro-btn-wa" style={{fontSize:9}}>💬</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}