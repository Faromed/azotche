import PromoCard from '../components/PromoCard';

const promoCards = [
  {
    id: 1,
    emoji: '🪡',
    headline: 'Tu cherches un bon tailleur dans ta zone ?',
    subline: 'Trouve les meilleurs boss de couture sur AZÔTCHÉ ! Consulte leurs réalisations et contacte-les directement.',
    gradient: 'linear-gradient(135deg, #FF6B35, #E55A25)',
  },
  {
    id: 2,
    emoji: '🔧',
    headline: 'Fatigué des faux rendez-vous de ton plombier ?',
    subline: 'Sur AZÔTCHÉ, trouve des artisans fiables avec des avis vérifiés. Plus de mauvaises surprises !',
    gradient: 'linear-gradient(135deg, #2196F3, #1565C0)',
  },
  {
    id: 3,
    emoji: '💇‍♀️',
    headline: 'Ton coiffeur te ghost encore ?',
    subline: 'Découvre de nouveaux talents capillaires près de chez toi sur AZÔTCHÉ. Notes, photos, contact direct !',
    gradient: 'linear-gradient(135deg, #E91E63, #AD1457)',
  },
  {
    id: 4,
    emoji: '⚡',
    headline: 'Ton électricien ne répond plus au téléphone ?',
    subline: 'Trouve un pro disponible maintenant sur AZÔTCHÉ. Regarde ses réalisations et appelle-le en 1 clic.',
    gradient: 'linear-gradient(135deg, #FF9800, #E65100)',
  },
  {
    id: 5,
    emoji: '🎨',
    headline: 'Marre de chercher un bon peintre ?',
    subline: 'Les pros vérifiés de ta ville sont sur AZÔTCHÉ. Galerie de travaux, notes clients, contact WhatsApp.',
    gradient: 'linear-gradient(135deg, #9C27B0, #6A1B9A)',
  },
  {
    id: 6,
    emoji: '👗',
    headline: 'Tu veux une robe en wax sur mesure ?',
    subline: 'Les meilleures couturières du Bénin t\'attendent sur AZÔTCHÉ. Regarde leurs créations et choisis !',
    gradient: 'linear-gradient(135deg, #F44336, #C62828)',
  },
  {
    id: 7,
    emoji: '🔩',
    headline: 'Besoin d\'un soudeur en urgence ?',
    subline: 'AZÔTCHÉ te connecte avec les meilleurs artisans du quartier. Vérifiés, notés, joignables direct.',
    gradient: 'linear-gradient(135deg, #607D8B, #37474F)',
  },
  {
    id: 8,
    emoji: '🍽️',
    headline: 'Envie de bonne bouffe locale ?',
    subline: 'Trouve les meilleurs restaurants et traiteurs de ta zone sur AZÔTCHÉ. Photos des plats et avis clients !',
    gradient: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
  },
  {
    id: 9,
    emoji: '🏗️',
    headline: 'Tu construis ta maison ?',
    subline: 'Trouve maçons, carreleurs, peintres et électriciens de confiance sur AZÔTCHÉ. Tous vérifiés !',
    gradient: 'linear-gradient(135deg, #795548, #4E342E)',
  },
  {
    id: 10,
    emoji: '🌟',
    headline: 'Tu es artisan ? Montre ton talent au Bénin entier !',
    subline: 'Inscris-toi gratuitement sur AZÔTCHÉ et reçois des clients chaque jour. Ton savoir-faire mérite d\'être vu.',
    gradient: 'linear-gradient(135deg, #FFD700, #FF8F00)',
  },
  {
    id: 11,
    emoji: '📱',
    headline: 'Chercher un artisan sur Facebook c\'est fini !',
    subline: 'AZÔTCHÉ regroupe tous les pros de ta ville. Recherche par métier, par zone. C\'est rapide et gratuit.',
    gradient: 'linear-gradient(135deg, #00BCD4, #00838F)',
  },
  {
    id: 12,
    emoji: '🛠️',
    headline: 'Tu connais un bon artisan ? Dis-lui de s\'inscrire !',
    subline: 'Plus on est nombreux sur AZÔTCHÉ, plus on facilite la vie de tout le monde. Partagez cette appli !',
    gradient: 'linear-gradient(135deg, #FF6B35, #2E7D32)',
  },
];

export default function PromoPage() {
  return (
    <div className="promo-page">
      <div className="container">
        <div className="promo-intro">
          <div className="section-tag">📣 Affiches Promo</div>
          <h1 className="section-title">
            Partagez <span className="accent">AZÔTCHÉ</span> autour de vous
          </h1>
          <p>
            Téléchargez ces affiches et partagez-les sur votre statut WhatsApp, 
            Facebook, Instagram ou TikTok pour faire connaître les artisans de votre quartier !
          </p>
        </div>

        <div className="promo-grid">
          {promoCards.map((card) => (
            <PromoCard key={card.id} data={card} />
          ))}
        </div>
      </div>
    </div>
  );
}