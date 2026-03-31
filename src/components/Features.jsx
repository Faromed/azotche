import { FiSearch, FiShield, FiStar, FiPhone, FiMapPin, FiGrid } from 'react-icons/fi';
import useScrollReveal from '../hooks/useScrollReveal';

const features = [
  { icon: <FiSearch />, title: 'Recherche intelligente', desc: 'Trouvez un artisan par métier, catégorie, ville ou quartier. Filtrez selon vos besoins en quelques secondes.' },
  { icon: <FiShield />, title: 'Profils vérifiés', desc: 'Les artisans avec un badge "Vérifié" ont été contrôlés. Consultez les avis et notes pour choisir en confiance.' },
  { icon: <FiPhone />, title: 'Contact direct', desc: 'Appelez ou envoyez un WhatsApp directement depuis la fiche du professionnel. Pas d\'intermédiaire.' },
  { icon: <FiMapPin />, title: 'Géolocalisation', desc: 'Activez "Autour de moi" pour voir les artisans proches de votre position actuelle sur une carte.' },
  { icon: <FiStar />, title: 'Galerie de réalisations', desc: 'Consultez les photos des travaux réalisés par chaque artisan avant de le contacter.' },
  { icon: <FiGrid />, title: 'QR Code unique', desc: 'Chaque artisan reçoit un QR code à afficher dans sa boutique. Scannez-le pour voir son profil.' },
];

export default function Features() {
  const ref = useScrollReveal();

  return (
    <section className="features section" id="fonctionnalites" ref={ref}>
      <div className="container">
        <div className="section-tag reveal">✨ Fonctionnalités</div>
        <h2 className="section-title reveal">
          Pourquoi choisir <span className="accent">AZÔTCHÉ</span> ?
        </h2>
        <p className="section-subtitle reveal">
          Une application pensée pour les réalités du Bénin. Simple, rapide et sans complications.
        </p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card reveal" key={i} style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}