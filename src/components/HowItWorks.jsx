import useScrollReveal from '../hooks/useScrollReveal';

const steps = [
  { num: '1', title: 'Ouvrez l\'app', desc: 'Aucun compte nécessaire pour chercher. Parcourez les artisans librement.' },
  { num: '2', title: 'Trouvez votre pro', desc: 'Recherchez par métier, ville ou catégorie. Consultez les avis et la galerie.' },
  { num: '3', title: 'Contactez-le !', desc: 'Appelez directement ou envoyez un WhatsApp. Simple et sans frais.' },
];

export default function HowItWorks() {
  const ref = useScrollReveal();

  return (
    <section className="how-it-works section" id="comment-ca-marche" ref={ref}>
      <div className="container">
        <div className="section-tag reveal">🎯 Comment ça marche</div>
        <h2 className="section-title reveal">
          En <span className="accent">3 étapes</span> simples
        </h2>
        <p className="section-subtitle reveal">
          Pas besoin de créer un compte pour trouver un artisan. C'est gratuit et instantané.
        </p>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step reveal" key={i} style={{ transitionDelay: `${i * 0.2}s` }}>
              <div className="step-number">{s.num}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}