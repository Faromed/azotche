import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown, FiArrowRight } from 'react-icons/fi';

const allFaqs = [
  {
    category: '🔍 Recherche & Consultation',
    items: [
      { q: "Faut-il créer un compte pour chercher un artisan ?", a: "Non ! La recherche et la consultation sont 100% gratuites et sans inscription. Ouvrez l'app et cherchez directement." },
      { q: "Comment trouver un artisan près de chez moi ?", a: "Activez la géolocalisation 'Autour de moi' ou saisissez manuellement votre ville/quartier. Les résultats s'affichent par proximité." },
      { q: "Puis-je voir les travaux réalisés par un artisan ?", a: "Oui ! Chaque artisan peut publier des photos de ses réalisations. Consultez sa galerie avant de le contacter." },
      { q: "Comment contacter un artisan ?", a: "Depuis sa fiche, cliquez sur 'Appeler' pour un appel direct ou 'WhatsApp' pour envoyer un message pré-rempli." },
      { q: "Que signifie le badge 'Vérifié' ?", a: "Un artisan vérifié a été contrôlé par notre équipe. C'est un gage de fiabilité supplémentaire." },
    ],
  },
  {
    category: '👷 Inscription Artisan',
    items: [
      { q: "Comment m'inscrire en tant qu'artisan ?", a: "Téléchargez l'app, cliquez 'S'inscrire', validez votre numéro par SMS, puis remplissez votre profil (nom, métier, localisation, photos)." },
      { q: "L'inscription est-elle gratuite ?", a: "L'inscription de base est gratuite. Des options payantes (Boost, Premium) sont disponibles pour plus de visibilité." },
      { q: "Combien de photos puis-je publier ?", a: "En compte de base, vous pouvez publier un nombre limité de réalisations. L'abonnement Premium vous donne un accès illimité." },
      { q: "Comment voir mes statistiques ?", a: "Dans votre Dashboard pro, vous voyez le nombre de vues de votre profil, les clics sur Appeler et WhatsApp." },
      { q: "Qu'est-ce que le Boost ?", a: "Le Boost est une option payante qui place votre profil en tête des résultats de recherche pendant une durée définie (3, 7 ou 30 jours)." },
    ],
  },
  {
    category: '💰 Paiements',
    items: [
      { q: "Quels moyens de paiement sont acceptés ?", a: "Nous acceptons les paiements via Mobile Money (MTN et Moov) grâce à notre partenaire FedaPay." },
      { q: "Les paiements sont-ils sécurisés ?", a: "Oui, tous les paiements passent par FedaPay, une plateforme de paiement certifiée et sécurisée." },
      { q: "Puis-je me faire rembourser ?", a: "Les conditions de remboursement dépendent du type de service acheté. Contactez notre support pour toute demande." },
    ],
  },
  {
    category: '🔒 Sécurité',
    items: [
      { q: "Mes données sont-elles en sécurité ?", a: "Oui. Nous utilisons Firebase (Google Cloud) avec chiffrement HTTPS, authentification SMS et règles de sécurité strictes." },
      { q: "Comment me protéger des arnaques ?", a: "Ne payez JAMAIS d'avance par Mobile Money sans avoir rencontré l'artisan. AZÔTCHÉ ne garantit pas les transactions hors plateforme." },
      { q: "Comment signaler un profil suspect ?", a: "Depuis la fiche d'un artisan, utilisez le bouton 'Signaler' ou contactez notre support." },
      { q: "Puis-je supprimer mon compte ?", a: "Oui, depuis les paramètres de l'app vous pouvez geler ou supprimer votre compte. Un compte gelé est supprimé après 3 mois." },
    ],
  },
];

export default function FAQPage() {
  const [openIndexes, setOpenIndexes] = useState({});

  const toggle = (catIdx, itemIdx) => {
    const key = `${catIdx}-${itemIdx}`;
    setOpenIndexes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="legal-page">
      <div className="container">
        <div className="legal-header">
          <h1>Foire Aux <span className="gradient-text">Questions</span></h1>
          <p>Toutes les réponses sur AZÔTCHÉ</p>
        </div>
        <div className="faq-list">
          {allFaqs.map((cat, catIdx) => (
            <div key={catIdx} style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--orange)', marginBottom: 16 }}>
                {cat.category}
              </h2>
              {cat.items.map((faq, itemIdx) => {
                const key = `${catIdx}-${itemIdx}`;
                const isOpen = openIndexes[key];
                return (
                  <div className="faq-item" key={itemIdx}>
                    <button className="faq-question" onClick={() => toggle(catIdx, itemIdx)}>
                      {faq.q}
                      <FiChevronDown className={`faq-chevron ${isOpen ? 'open' : ''}`} />
                    </button>
                    <div className={`faq-answer ${isOpen ? 'open' : ''}`}>
                      <div className="faq-answer-content">{faq.a}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Vous n'avez pas trouvé votre réponse ?</p>
          <Link to="/support" className="btn btn-primary">
            Contacter le support <FiArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
}