import PromoCard from '../components/PromoCard';
import { FiDownload, FiShare2 } from 'react-icons/fi';

const promoCards = [
  {
    id: 1,
    emoji: '🪡✨',
    image: '/images/couturiere.png',
    headline: 'Tu cherches un bon tailleur dans ta zone ?',
    subline: 'Trouve les meilleurs boss de couture sur AZÔTCHÉ ! Consulte leurs créations et contacte-les directement.',
    tag: 'COUTURE',
    gradient: 'linear-gradient(145deg, #FF6B35 0%, #D32F2F 50%, #B71C1C 100%)',
  },
  {
    id: 2,
    emoji: '🔧💧',
    image: '/images/plombier.png',
    headline: 'Fatigué des faux rendez-vous de ton plombier ?',
    subline: 'Sur AZÔTCHÉ, trouve des artisans fiables avec des avis vérifiés. Fini les galères !',
    tag: 'PLOMBERIE',
    gradient: 'linear-gradient(145deg, #1565C0 0%, #0D47A1 50%, #0A1929 100%)',
  },
  {
    id: 3,
    emoji: '💇‍♀️💅',
    image: '/images/coiffeur.png',
    headline: 'Ton coiffeur te ghost encore ?',
    subline: 'Découvre de nouveaux talents capillaires près de chez toi. Notes, photos, contact direct !',
    tag: 'BEAUTÉ',
    gradient: 'linear-gradient(145deg, #E91E63 0%, #AD1457 50%, #880E4F 100%)',
  },
  {
    id: 4,
    emoji: '⚡🔌',
    image: '/images/électricien.png',
    headline: 'Panne de courant ? Ton électricien est introuvable ?',
    subline: 'Trouve un pro disponible MAINTENANT sur AZÔTCHÉ. Avis clients, réalisations, 1 clic pour appeler.',
    tag: 'ÉLECTRICITÉ',
    gradient: 'linear-gradient(145deg, #FF9800 0%, #E65100 50%, #BF360C 100%)',
  },
  {
    id: 5,
    emoji: '🎨🖌️',
    image: '/images/peintre.png',
    headline: 'Tu veux repeindre ta maison mais tu connais pas de bon peintre ?',
    subline: 'Les pros vérifiés de ta ville sont tous sur AZÔTCHÉ. Galerie de travaux, notes clients.',
    tag: 'PEINTURE',
    gradient: 'linear-gradient(145deg, #7B1FA2 0%, #4A148C 50%, #311B92 100%)',
  },
  {
    id: 6,
    emoji: '👗🌺',
    image: '/images/tailleur.png',
    headline: 'Une robe en wax sur mesure pour cet événement ?',
    subline: 'Les meilleures couturières du Bénin t\'attendent sur AZÔTCHÉ. Regarde leurs créations et choisis la tienne !',
    tag: 'MODE',
    gradient: 'linear-gradient(145deg, #C62828 0%, #880E4F 50%, #4A148C 100%)',
  },
  {
    id: 7,
    emoji: '🔩⚙️',
    image: '/images/logo.png',
    headline: 'Besoin d\'un soudeur pour ton portail ?',
    subline: 'AZÔTCHÉ te connecte avec les meilleurs artisans du quartier. Vérifiés, notés, joignables en 1 clic.',
    tag: 'SOUDURE',
    gradient: 'linear-gradient(145deg, #455A64 0%, #263238 50%, #1A1A2E 100%)',
  },
  {
    id: 8,
    emoji: '🍽️🔥',
    image: '/images/restaurant.png',
    headline: 'Envie de bonne bouffe locale ?',
    subline: 'Trouve les meilleurs restaurants et traiteurs de ta zone. Photos des plats, avis clients et contact direct !',
    tag: 'FOOD',
    gradient: 'linear-gradient(145deg, #2E7D32 0%, #1B5E20 50%, #0D3B0F 100%)',
  },
  {
    id: 9,
    emoji: '🏗️🧱',
    image: '/images/btp.png',
    headline: 'Tu construis ta maison et tu galères à trouver de bons ouvriers ?',
    subline: 'Maçons, carreleurs, ferrailleurs — tous vérifiés et notés sur AZÔTCHÉ !',
    tag: 'BTP',
    gradient: 'linear-gradient(145deg, #6D4C41 0%, #4E342E 50%, #3E2723 100%)',
  },
  {
    id: 10,
    emoji: '🌟🚀',
    image: '/images/artisans.png',
    headline: 'Tu es artisan ? Montre ton talent au Bénin entier !',
    subline: 'Inscris-toi gratuitement sur AZÔTCHÉ. Publie tes réalisations et reçois des clients chaque jour.',
    tag: 'ARTISANS',
    slogan: 'Ton savoir-faire mérite d\'être vu 🇧🇯',
    gradient: 'linear-gradient(145deg, #FF6B35 0%, #FFB300 50%, #FF6B35 100%)',
  },
  {
    id: 11,
    emoji: '📱🔍',
    image: '/images/logo.png',
    headline: 'Chercher un artisan sur Facebook c\'est terminé !',
    subline: 'AZÔTCHÉ regroupe tous les pros de ta ville en une seule appli. Recherche par métier, par zone. Gratuit !',
    tag: 'DIGITAL',
    gradient: 'linear-gradient(145deg, #00838F 0%, #006064 50%, #004D40 100%)',
  },
  {
    id: 12,
    emoji: '🤝📢',
    image: '/images/communauté.png',
    headline: 'Tu connais un bon artisan ? Dis-lui de s\'inscrire !',
    subline: 'Plus on est nombreux sur AZÔTCHÉ, plus on facilite la vie de tout le monde. Partage cette affiche !',
    tag: 'COMMUNAUTÉ',
    gradient: 'linear-gradient(145deg, #FF6B35 0%, #2E7D32 100%)',
  },
  {
    id: 13,
    emoji: '🚗🔧',
    image: '/images/logo.png',
    headline: 'Ta voiture est en panne et ton garagiste est au village ?',
    subline: 'Trouve un mécanicien de confiance près de toi sur AZÔTCHÉ. Avis, réalisations, appel direct !',
    tag: 'MÉCANIQUE',
    gradient: 'linear-gradient(145deg, #37474F 0%, #1C1C2E 50%, #0A0A14 100%)',
  },
  {
    id: 14,
    emoji: '💻🛠️',
    image: '/images/logo.png',
    headline: 'Ton téléphone ou ton ordi est cassé ?',
    subline: 'Trouve les meilleurs réparateurs tech de ta zone sur AZÔTCHÉ. Vérifiés et notés par de vrais clients.',
    tag: 'TECH',
    gradient: 'linear-gradient(145deg, #1E88E5 0%, #1565C0 50%, #0D47A1 100%)',
  },
  {
    id: 15,
    emoji: '🎂🍰',
    image: '/images/logo.png',
    headline: 'Tu cherches une bonne pâtissière pour ton anniversaire ?',
    subline: 'Les meilleurs gâteaux du Bénin sont sur AZÔTCHÉ ! Regarde les photos et passe ta commande.',
    tag: 'PÂTISSERIE',
    gradient: 'linear-gradient(145deg, #F48FB1 0%, #E91E63 50%, #C2185B 100%)',
  },
  {
    id: 16,
    emoji: '🪑🪚',
    image: '/images/logo.png',
    headline: 'Un meuble sur mesure ? Un menuisier fiable ?',
    subline: 'Les artisans du bois les plus talentueux de ta ville sont tous référencés sur AZÔTCHÉ.',
    tag: 'MENUISERIE',
    gradient: 'linear-gradient(145deg, #8D6E63 0%, #5D4037 50%, #3E2723 100%)',
  },
];

export default function PromoPage() {
  const downloadImage = async (imageSrc, fileName) => {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  const shareImage = async (imageSrc, tag) => {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], `azotche-${tag.toLowerCase()}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `AZÔTCHÉ - ${tag}`,
          text: 'Téléchargez AZÔTCHÉ et trouvez les meilleurs artisans du Bénin !',
        });
      } else {
        // Fallback: partager via WhatsApp
        const text = encodeURIComponent(`AZÔTCHÉ - ${tag}\nTéléchargez l'app: https://azotche.vercel.app/`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      // Fallback simple
      const text = encodeURIComponent(`AZÔTCHÉ - ${tag}\nTéléchargez l'app: https://azotche.vercel.app/`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  return (
    <div className="promo-page">
      <div className="container">
        <div className="promo-intro">
          <div className="section-tag">📣 Affiches Promotionnelles</div>
          <h1 className="section-title">
            Partagez <span className="accent">AZÔTCHÉ</span> sur vos réseaux
          </h1>
          <p>
            Téléchargez ces affiches au format carré (1080×1080) optimisé pour
            les statuts WhatsApp, stories Instagram, posts Facebook et TikTok.
            Aidez-nous à faire connaître les artisans du Bénin ! 🇧🇯
          </p>
        </div>

        <div className="promo-grid">
          {promoCards.map((card) => (
            card.image ? (
              <div key={card.id} className="promo-static-wrapper">
                <img src={card.image} alt={card.tag} className="promo-static-image" />
                <div className="promo-actions">
                  <button
                    className="promo-action-btn promo-download-btn"
                    onClick={() => downloadImage(card.image, `azotche-${card.tag.toLowerCase()}.png`)}
                  >
                    <FiDownload /> Télécharger
                  </button>
                  <button
                    className="promo-action-btn promo-share-btn"
                    onClick={() => shareImage(card.image, card.tag)}
                  >
                    <FiShare2 /> Partager
                  </button>
                </div>
              </div>
            ) : (
              <PromoCard key={card.id} data={card} />
            )
          ))}
        </div>
      </div>
    </div>
  );
}