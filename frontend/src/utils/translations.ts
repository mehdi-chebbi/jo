export const translations = {
  // ============================================
  // COUNTRIES
  // ============================================
  countries: {
    "International": { fr: "International", en: "International" },
    "Algerie": { fr: "Algérie", en: "Algeria" },
    "Angola": { fr: "Angola", en: "Angola" },
    "Benin": { fr: "Bénin", en: "Benin" },
    "Botswana": { fr: "Botswana", en: "Botswana" },
    "Burkina Faso": { fr: "Burkina Faso", en: "Burkina Faso" },
    "Burundi": { fr: "Burundi", en: "Burundi" },
    "Cap-Vert": { fr: "Cap-Vert", en: "Cape Verde" },
    "Cameroun": { fr: "Cameroun", en: "Cameroon" },
    "Republique centrafricaine": { fr: "République centrafricaine", en: "Central African Republic" },
    "Tchad": { fr: "Tchad", en: "Chad" },
    "Comores": { fr: "Comores", en: "Comoros" },
    "Republique democratique du Congo": { fr: "République démocratique du Congo", en: "Democratic Republic of the Congo" },
    "Republique du Congo": { fr: "République du Congo", en: "Republic of the Congo" },
    "Cote d'Ivoire": { fr: "Côte d'Ivoire", en: "Ivory Coast" },
    "Djibouti": { fr: "Djibouti", en: "Djibouti" },
    "Egypte": { fr: "Égypte", en: "Egypt" },
    "Guinee equatoriale": { fr: "Guinée équatoriale", en: "Equatorial Guinea" },
    "Erythree": { fr: "Érythrée", en: "Eritrea" },
    "Eswatini": { fr: "Eswatini", en: "Eswatini" },
    "Ethiopie": { fr: "Éthiopie", en: "Ethiopia" },
    "Gabon": { fr: "Gabon", en: "Gabon" },
    "Gambie": { fr: "Gambie", en: "Gambia" },
    "Ghana": { fr: "Ghana", en: "Ghana" },
    "Guinee": { fr: "Guinée", en: "Guinea" },
    "Guinee-Bissau": { fr: "Guinée-Bissau", en: "Guinea-Bissau" },
    "Kenya": { fr: "Kenya", en: "Kenya" },
    "Lesotho": { fr: "Lesotho", en: "Lesotho" },
    "Liberia": { fr: "Liberia", en: "Liberia" },
    "Lybie": { fr: "Libye", en: "Libya" },
    "Madagascar": { fr: "Madagascar", en: "Madagascar" },
    "Malawi": { fr: "Malawi", en: "Malawi" },
    "Mali": { fr: "Mali", en: "Mali" },
    "Mauritanie": { fr: "Mauritanie", en: "Mauritania" },
    "Maurice": { fr: "Maurice", en: "Mauritius" },
    "Maroc": { fr: "Maroc", en: "Morocco" },
    "Mozambique": { fr: "Mozambique", en: "Mozambique" },
    "Namibie": { fr: "Namibie", en: "Namibia" },
    "Niger": { fr: "Niger", en: "Niger" },
    "Nigeria": { fr: "Nigeria", en: "Nigeria" },
    "Rwanda": { fr: "Rwanda", en: "Rwanda" },
    "Sao Tome-et-Principe": { fr: "Sao Tomé-et-Principe", en: "São Tomé and Príncipe" },
    "Senegal": { fr: "Sénégal", en: "Senegal" },
    "Seychelles": { fr: "Seychelles", en: "Seychelles" },
    "Sierra Leone": { fr: "Sierra Leone", en: "Sierra Leone" },
    "Somalie": { fr: "Somalie", en: "Somalia" },
    "Afrique du Sud": { fr: "Afrique du Sud", en: "South Africa" },
    "Soudan": { fr: "Soudan", en: "Sudan" },
    "Soudan du Sud": { fr: "Soudan du Sud", en: "South Sudan" },
    "Tanzanie": { fr: "Tanzanie", en: "Tanzania" },
    "Togo": { fr: "Togo", en: "Togo" },
    "Tunisie": { fr: "Tunisie", en: "Tunisia" },
    "Ouganda": { fr: "Ouganda", en: "Uganda" },
    "Zambie": { fr: "Zambie", en: "Zambia" },
    "Zimbabwe": { fr: "Zimbabwe", en: "Zimbabwe" }
  },

  // ============================================
  // OFFER TYPES
  // ============================================
  offerTypes: {
    "travaux": { fr: "Travaux", en: "Works" },
    "prestation_intellectuelle": { fr: "Prestation Intellectuelle", en: "Consultancy" },
    "offre_d_emploi": { fr: "Offre d'Emploi", en: "Job Offer" }
  },

  // ============================================
  // OFFER METHODS
  // ============================================
  offerMethods: {
    "appel_d_offre": { fr: "Appel d'Offre", en: "Tender" },
    "appel_a_candidature": { fr: "Appel à Candidature", en: "Call for Applications" }
  }
} as const;

/**
 * Get translated country name
 * @param country - The country name (from database, usually in French)
 * @param lang - The language code ('fr' or 'en')
 * @returns The translated country name, or original country if not found
 */
export const getCountryName = (country: string, lang: 'fr' | 'en'): string => {
  const translation = translations.countries[country as keyof typeof translations.countries];
  return translation ? translation[lang] : country;
};

/**
 * Get translated offer type name
 * @param type - The offer type code
 * @param lang - The language code ('fr' or 'en')
 * @returns The translated offer type name, or original type if not found
 */
export const getOfferTypeName = (type: string, lang: 'fr' | 'en'): string => {
  const translation = translations.offerTypes[type as keyof typeof translations.offerTypes];
  return translation ? translation[lang] : type;
};

/**
 * Get translated offer method name
 * @param method - The offer method code
 * @param lang - The language code ('fr' or 'en')
 * @returns The translated offer method name, or original method if not found
 */
export const getOfferMethodName = (method: string, lang: 'fr' | 'en'): string => {
  const translation = translations.offerMethods[method as keyof typeof translations.offerMethods];
  return translation ? translation[lang] : method;
};