import { getOfferTypeName, getOfferMethodName } from './translations';

type Language = 'fr' | 'en';

interface TypeInfo {
  name: string;
  color: string;
}

interface OfferTypeInfo {
  type: TypeInfo;
  method: TypeInfo;
}

// ============================================
// TYPE COLORS
// ============================================
const typeColors: { [key: string]: string } = {
  'travaux': 'bg-blue-100 text-blue-800',
  'fournitures': 'bg-amber-100 text-amber-800',
  'prestation_intellectuelle': 'bg-purple-100 text-purple-800',
  'services': 'bg-teal-100 text-teal-800',
  'offre_d_emploi': 'bg-green-100 text-green-800'
};

// ============================================
// METHOD COLORS
// ============================================
const methodColors: { [key: string]: string } = {
  'appel_d_offres_international': 'bg-red-100 text-red-800',
  'appel_d_offres_national': 'bg-rose-100 text-rose-800',
  'appel_d_offres_ouvert': 'bg-orange-100 text-orange-800',
  'appel_d_offres_restreint': 'bg-pink-100 text-pink-800',
  'appel_a_manifestation_d_interet': 'bg-indigo-100 text-indigo-800',
  'appel_a_candidature': 'bg-yellow-100 text-yellow-800',
  'consultation_fournisseurs': 'bg-cyan-100 text-cyan-800',
  'accords_cadres': 'bg-emerald-100 text-emerald-800',
  'gre_a_gre': 'bg-gray-100 text-gray-800'
};

// ============================================
// DOCUMENT REQUIREMENTS PER METHOD
// ============================================
export interface DocumentRequirement {
  key: string;
  name: string;
  required: boolean;
}

const baseDocuments: DocumentRequirement[] = [
  { key: 'cv', name: 'CV', required: true },
  { key: 'diplome', name: 'Diplôme', required: true },
  { key: 'id_card', name: "Carte d'identité", required: true },
  { key: 'cover_letter', name: 'Lettre de motivation', required: true }
];

const additionalDocsByMethod: { [method: string]: DocumentRequirement[] } = {
  // Appel d'Offres International - full procurement docs
  'appel_d_offres_international': [
    { key: 'declaration_sur_honneur', name: "Déclaration sur l'honneur", required: true },
    { key: 'fiche_de_referencement', name: 'Fiche de référencement', required: true },
    { key: 'extrait_registre', name: 'Extrait Registre National', required: true },
    { key: 'note_methodologique', name: 'Note méthodologique', required: true },
    { key: 'liste_references', name: 'Liste des références', required: true },
    { key: 'offre_financiere', name: 'Offre financière', required: true }
  ],
  // Appel d'Offres National - similar to international
  'appel_d_offres_national': [
    { key: 'declaration_sur_honneur', name: "Déclaration sur l'honneur", required: true },
    { key: 'fiche_de_referencement', name: 'Fiche de référencement', required: true },
    { key: 'extrait_registre', name: 'Extrait Registre National', required: true },
    { key: 'note_methodologique', name: 'Note méthodologique', required: true },
    { key: 'liste_references', name: 'Liste des références', required: true },
    { key: 'offre_financiere', name: 'Offre financière', required: true }
  ],
  // Appel d'Offres Ouvert - full procurement docs
  'appel_d_offres_ouvert': [
    { key: 'declaration_sur_honneur', name: "Déclaration sur l'honneur", required: true },
    { key: 'fiche_de_referencement', name: 'Fiche de référencement', required: true },
    { key: 'extrait_registre', name: 'Extrait Registre National', required: true },
    { key: 'note_methodologique', name: 'Note méthodologique', required: true },
    { key: 'liste_references', name: 'Liste des références', required: true },
    { key: 'offre_financiere', name: 'Offre financière', required: true }
  ],
  // Appel d'Offres Restreint - for consultancy, technical + financial proposals
  'appel_d_offres_restreint': [
    { key: 'declaration_sur_honneur', name: "Déclaration sur l'honneur", required: true },
    { key: 'fiche_de_referencement', name: 'Fiche de référencement', required: true },
    { key: 'extrait_registre', name: 'Extrait Registre National', required: true },
    { key: 'note_methodologique', name: 'Note méthodologique', required: true },
    { key: 'liste_references', name: 'Liste des références', required: true },
    { key: 'offre_financiere', name: 'Offre financière', required: true }
  ],
  // Appel à Manifestation d'Intérêt - just candidature docs, no financial
  'appel_a_manifestation_d_interet': [
    { key: 'declaration_sur_honneur', name: "Déclaration sur l'honneur", required: true },
    { key: 'fiche_de_referencement', name: 'Fiche de référencement', required: true },
    { key: 'extrait_registre', name: 'Extrait Registre National', required: true }
  ],
  // Appel à Candidature - basic additional docs
  'appel_a_candidature': [
    { key: 'declaration_sur_honneur', name: "Déclaration sur l'honneur", required: true },
    { key: 'fiche_de_referencement', name: 'Fiche de référencement', required: true },
    { key: 'extrait_registre', name: 'Extrait Registre National', required: true }
  ],
  // Consultation de Fournisseurs - simple quotation, minimal docs
  'consultation_fournisseurs': [
    { key: 'offre_financiere', name: 'Offre financière / Cotation', required: true }
  ],
  // Accords-Cadres - standard procurement docs
  'accords_cadres': [
    { key: 'declaration_sur_honneur', name: "Déclaration sur l'honneur", required: true },
    { key: 'fiche_de_referencement', name: 'Fiche de référencement', required: true },
    { key: 'extrait_registre', name: 'Extrait Registre National', required: true },
    { key: 'offre_financiere', name: 'Offre financière', required: true }
  ],
  // Gré à Gré - justification + negotiated offer
  'gre_a_gre': [
    { key: 'declaration_sur_honneur', name: "Déclaration sur l'honneur", required: true },
    { key: 'fiche_de_referencement', name: 'Fiche de référencement', required: true },
    { key: 'extrait_registre', name: 'Extrait Registre National', required: true },
    { key: 'offre_financiere', name: 'Offre financière', required: true }
  ]
};

/**
 * Get all required documents for a given method (base + additional)
 */
export const getRequiredDocumentsForMethod = (method: string): DocumentRequirement[] => {
  const additional = additionalDocsByMethod[method] || [];
  return [...baseDocuments, ...additional];
};

/**
 * Get additional required documents for a given method (excluding base docs)
 */
export const getAdditionalDocumentsForMethod = (method: string): DocumentRequirement[] => {
  return additionalDocsByMethod[method] || [];
};

/**
 * Check if a method requires additional documents beyond the base set
 */
export const methodRequiresAdditionalDocs = (method: string): boolean => {
  return (additionalDocsByMethod[method] || []).length > 0;
};

// ============================================
// TYPE INFO FUNCTIONS
// ============================================

export const getOfferTypeInfo = (type: string, method?: string, lang: Language = 'fr'): TypeInfo | OfferTypeInfo => {
  // Type information
  const typeInfo: { [key: string]: TypeInfo } = {
    'travaux': { name: getOfferTypeName(type, lang), color: typeColors[type] || 'bg-gray-100 text-gray-800' },
    'fournitures': { name: getOfferTypeName(type, lang), color: typeColors[type] || 'bg-gray-100 text-gray-800' },
    'prestation_intellectuelle': { name: getOfferTypeName(type, lang), color: typeColors[type] || 'bg-gray-100 text-gray-800' },
    'services': { name: getOfferTypeName(type, lang), color: typeColors[type] || 'bg-gray-100 text-gray-800' },
    'offre_d_emploi': { name: getOfferTypeName(type, lang), color: typeColors[type] || 'bg-gray-100 text-gray-800' }
  };

  // Method information
  const methodInfo: { [key: string]: TypeInfo } = {};
  const allMethods = [
    'appel_d_offres_international', 'appel_d_offres_national', 'appel_d_offres_ouvert',
    'appel_d_offres_restreint', 'appel_a_manifestation_d_interet', 'appel_a_candidature',
    'consultation_fournisseurs', 'accords_cadres', 'gre_a_gre'
  ];
  allMethods.forEach(m => {
    methodInfo[m] = { name: getOfferMethodName(m, lang), color: methodColors[m] || 'bg-gray-100 text-gray-800' };
  });

  if (method !== undefined) {
    return {
      type: typeInfo[type] || { name: type, color: 'bg-gray-100 text-gray-800' },
      method: methodInfo[method] || { name: method, color: 'bg-gray-100 text-gray-800' }
    };
  }

  // For backward compatibility - when only type is provided, return type info directly
  return typeInfo[type] || { name: type, color: 'bg-gray-100 text-gray-800' };
};

export const getOfferTypeOnlyInfo = (type: string, lang: Language = 'fr'): TypeInfo => {
  const typeInfo: { [key: string]: TypeInfo } = {
    'travaux': { name: getOfferTypeName(type, lang), color: typeColors[type] || 'bg-gray-100 text-gray-800' },
    'fournitures': { name: getOfferTypeName(type, lang), color: typeColors[type] || 'bg-gray-100 text-gray-800' },
    'prestation_intellectuelle': { name: getOfferTypeName(type, lang), color: typeColors[type] || 'bg-gray-100 text-gray-800' },
    'services': { name: getOfferTypeName(type, lang), color: typeColors[type] || 'bg-gray-100 text-gray-800' },
    'offre_d_emploi': { name: getOfferTypeName(type, lang), color: typeColors[type] || 'bg-gray-100 text-gray-800' }
  };

  return typeInfo[type] || { name: type, color: 'bg-gray-100 text-gray-800' };
};

export const getOfferTypeOptions = (lang: Language = 'fr') => [
  { value: 'travaux', label: getOfferTypeName('travaux', lang) },
  { value: 'fournitures', label: getOfferTypeName('fournitures', lang) },
  { value: 'prestation_intellectuelle', label: getOfferTypeName('prestation_intellectuelle', lang) },
  { value: 'services', label: getOfferTypeName('services', lang) },
  { value: 'offre_d_emploi', label: getOfferTypeName('offre_d_emploi', lang) }
];

export const getOfferMethodOptions = (lang: Language = 'fr') => [
  { value: 'appel_d_offres_international', label: getOfferMethodName('appel_d_offres_international', lang) },
  { value: 'appel_d_offres_national', label: getOfferMethodName('appel_d_offres_national', lang) },
  { value: 'appel_d_offres_ouvert', label: getOfferMethodName('appel_d_offres_ouvert', lang) },
  { value: 'appel_d_offres_restreint', label: getOfferMethodName('appel_d_offres_restreint', lang) },
  { value: 'appel_a_manifestation_d_interet', label: getOfferMethodName('appel_a_manifestation_d_interet', lang) },
  { value: 'appel_a_candidature', label: getOfferMethodName('appel_a_candidature', lang) },
  { value: 'consultation_fournisseurs', label: getOfferMethodName('consultation_fournisseurs', lang) },
  { value: 'accords_cadres', label: getOfferMethodName('accords_cadres', lang) },
  { value: 'gre_a_gre', label: getOfferMethodName('gre_a_gre', lang) }
];
