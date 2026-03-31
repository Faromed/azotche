import { Link } from 'react-router-dom';
import { FiArrowRight, FiShare2 } from 'react-icons/fi';
import useScrollReveal from '../hooks/useScrollReveal';

export default function ShareSection() {
  const ref = useScrollReveal();

  return (
    <section className="share-section section" ref={ref}>
      <div className="container">
        <h2 className="section-title reveal" style={{ color: 'white' }}>
          Partagez <span style={{ color: 'var(--gold)' }}>AZÔTCHÉ</span> autour de vous !
        </h2>
        <p className="section-subtitle reveal" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Téléchargez nos affiches promo et partagez-les sur WhatsApp, Facebook, Instagram pour faire connaître les artisans de votre quartier.
        </p>
        <div className="reveal" style={{ textAlign: 'center' }}>
          <Link to="/promo" className="btn btn-white btn-large">
            <FiShare2 /> Voir les affiches promo <FiArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}