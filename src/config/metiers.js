// Données conformes à MetiersData.dart du projet Flutter mobile

export const CATEGORIES = [
  'Artisanat',
  'Commerce',
  'Service',
  'Élevage & Agriculture',
];

export const METIERS_PAR_CATEGORIE = {
  'Artisanat': [
    'Couturier / Couturière', 'Tailleur', 'Brodeur / Brodeuse', 'Tisserand',
    'Soudeur', 'Menuisier', 'Ébéniste', 'Forgeron', 'Bijoutier / Bijoutière',
    'Potier / Potière', 'Sculpteur', 'Peintre décorateur', 'Carreleur',
    'Plombier', 'Électricien', 'Maçon', 'Ferronnier', 'Vitrier',
    'Cordonnier', 'Maroquinier', 'Vannier / Tresseur', 'Tapissier', 'Sérigraphe',
  ],
  'Commerce': [
    'Restaurateur / Restauratrice', 'Pâtissier / Pâtissière', 'Boulanger / Boulangère',
    'Vendeur de jus naturels', 'Vendeur de grillades', 'Boutiquier / Boutiquière',
    'Vendeur de pièces auto/moto', 'Vendeur de téléphones', 'Vendeur de vêtements',
    'Vendeur de chaussures', 'Vendeur de cosmétiques',
    'Vendeur de matériaux de construction', 'Vendeur de meubles',
    'Libraire / Vendeur de fournitures', 'Vendeur de produits agricoles', 'Grossiste',
  ],
  'Service': [
    'Coiffeur / Coiffeuse', 'Barbier', 'Tresseur / Tresseuse',
    'Maquilleur / Maquilleuse', 'Photographe', 'Vidéaste', 'DJ / Sonorisation',
    'Décorateur événementiel', 'Mécanicien auto', 'Mécanicien moto',
    'Électricien auto', 'Vulcanisateur', 'Laveur auto',
    'Informaticien / Réparateur', 'Développeur web/mobile', 'Graphiste',
    'Imprimeur', 'Pressing / Blanchisserie', 'Déménageur', 'Coursier / Livreur',
    'Agent immobilier', 'Professeur particulier', 'Traducteur',
  ],
  'Élevage & Agriculture': [
    'Éleveur de poulets', 'Éleveur de poissons', 'Éleveur de lapins',
    'Éleveur de porcs', 'Éleveur de moutons/chèvres', 'Apiculteur',
    'Maraîcher', 'Producteur de tomates', 'Producteur de piments',
    'Producteur de maïs', 'Producteur de manioc', 'Producteur de soja',
    'Pépiniériste', 'Jardinier / Paysagiste', "Vendeur d'aliments pour animaux",
    'Vétérinaire',
  ],
};

export const TOUS_LES_METIERS = Object.values(METIERS_PAR_CATEGORIE).flat();

export const VILLES = [
  'Cotonou', 'Porto-Novo', 'Abomey-Calavi', 'Parakou', 'Djougou',
  'Bohicon', 'Abomey', 'Natitingou', 'Lokossa', 'Ouidah', 'Kandi',
  'Malanville', 'Savalou', 'Nikki', 'Dassa-Zoumé', 'Dogbo', 'Comé',
  'Allada', 'Sèmè-Kpodji', 'Pobè', 'Sakété', 'Aplahoué', 'Covè',
  'Tchaourou', 'Bembèrèkè', 'Banikoara', 'Gogounou', 'Tanguiéta',
  'Bassila', 'Bantè',
];

/** Génère un code de parrainage artisan : AZO-ABC-XXXXXX
 *  Charset identique au mobile Flutter — aucun caractère ambigu (0,O,1,I exclus)
 */
export function genReferralCode(nom, uid) {
  const letters = (nom || 'ART').replace(/[^a-zA-ZÀ-ÿ]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return `AZO-${letters}-${rand}`;
}

/** Génère un code de parrainage client : CXXXXXX */
export function genClientReferralCode(uid) {
  return 'C' + (uid || '').substring(0, 6).toUpperCase();
}
