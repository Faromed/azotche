import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown, FiArrowRight } from 'react-icons/fi';
import useScrollReveal from '../hooks/useScrollReveal';

const faqs = [
  { q: "C'est quoi AZÔTCHÉ ?", a: "AZÔTCHÉ est une application mobile qui référence les artisans et commerçants au Bénin. Vous pouvez y trouver des tailleurs, coiffeurs, plombiers, soudeurs, restaurateurs et bien d'autres pros près de chez vous." },
  { q: 'Faut-il créer un compte pour chercher ?', a: "Non ! La consultation est 100% gratuite et sans inscription. Vous pouvez chercher, consulter les profils et contacter les artisans sans créer de compte." },
  { q: "Comment contacter un artisan ?", a: "Depuis la fiche d'un artisan, vous pouvez l'appeler directement ou lui envoyer un message WhatsApp en un seul clic." },
  { q: "Je suis artisan, comment m'inscrire ?", a: "Téléchargez l'application, cliquez sur 'S'inscrire', validez votre numéro par SMS et remplissez votre profil. Vous pouvez ensuite publier vos réalisations pour attirer des clients." },
  { q: "L'application est-elle gratuite ?", a: "Oui, la consultation et l'inscription de base sont gratuites. Des options payantes (Boost, Premium) sont disponibles pour les artisans qui souhaitent plus de visibilité." },
];

export default function HomeFAQ() {
  const [openIndex, setOpenIndex] = useState(null);
  const ref = useScrollReveal();

  return (
    <section className="faq section" id="faq" ref={ref}>
      <div className="container">
        <div className="section-tag reveal">❓ FAQ</div>
        <h2 className="section-title reveal">Questions <span className="accent">fréquentes</span></h2>
        <p className="section-subtitle reveal">Les réponses aux questions les plus posées sur AZÔTCHÉ.</p>
        <div className="faq-list">
          {faqs.map((f, i) => (
            <div className="faq-item reveal" key={i} style={{ transitionDelay: `${i * 0.08}s` }}>
              <button className="faq-question" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                {f.q}
                <FiChevronDown className={`faq-chevron ${openIndex === i ? 'open' : ''}`} />
              </button>
              <div className={`faq-answer ${openIndex === i ? 'open' : ''}`}>
                <div className="faq-answer-content">{f.a}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="faq-more reveal">
          <Link to="/faq" className="btn btn-outline">Toutes les questions <FiArrowRight /></Link>
        </div>
      </div>
    </section>
  );
}