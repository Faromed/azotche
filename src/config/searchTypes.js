/**
 * ─────────────────────────────────────────────────────────────
 *  TYPES DE RECHERCHE — doit correspondre EXACTEMENT à :
 *  - functions/src/search/searchEngine.ts  → TypeRecherche
 *  - artisan_connect_benin/.../search_service.dart → TypeRecherche
 *
 *  Toute valeur ajoutée ici doit être ajoutée dans les deux autres
 *  fichiers (parité mobile/web stricte).
 * ─────────────────────────────────────────────────────────────
 */
export const TYPES_RECHERCHE = [
  { value: 'general',   label: 'Tout',      hint: 'Nom, métier, ville, quartier…' },
  { value: 'nom',       label: 'Nom',       hint: "Nom de l'artisan…" },
  { value: 'metier',    label: 'Métier',    hint: 'Ex : maçon, soudeur, coiffeuse…' },
  { value: 'categorie', label: 'Catégorie', hint: 'Ex : Bâtiment, Beauté, Automobile…' },
  { value: 'ville',     label: 'Ville',     hint: 'Ex : Cotonou, Porto-Novo…' },
  { value: 'quartier',  label: 'Quartier',  hint: 'Ex : Akpakpa, Fidjrossè…' },
];

export const DEFAULT_HINT = 'Rechercher un artisan, un métier, une ville…';

export function hintForType(type) {
  return TYPES_RECHERCHE.find(t => t.value === type)?.hint || DEFAULT_HINT;
}
