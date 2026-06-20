/**
 * Reference Generator Utility
 *
 * Format: {method}/OSS/{project}/{title_abbrev}/{DDMMYYYY}-{number}
 * Example: AO/OSS/umbrella/Nat-Con-SEY-UNCCD/28012026-03
 */

// ───── Stop words (French + English) ─────
const STOP_WORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', "d'un", "l'un",
  'et', 'en', 'pour', 'au', 'aux', 'à', 'dans', 'par', 'sur', 'avec',
  'qui', 'que', 'ce', 'se', 'ne', 'pas', 'plus', 'ou', 'où',
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'from', 'is',
]);

// ───── Method → Abbreviation mapping ─────
const METHOD_ABBREVIATIONS: { [key: string]: string } = {
  'appel_d_offres_international': 'AOI',
  'appel_d_offres_national': 'AON',
  'appel_d_offres_ouvert': 'AOO',
  'appel_d_offres_restreint': 'AOR',
  'appel_a_manifestation_d_interet': 'AMI',
  'appel_a_candidature': 'AC',
  'consultation_fournisseurs': 'CF',
  'accords_cadres': 'ACC',
  'gre_a_gre': 'GG',
};

/**
 * Abbreviate a string into a reference segment.
 * - Strips stop words
 * - Words > 4 chars: first 3 letters, capitalize first letter
 * - Words ≤ 4 chars: keep full
 * - Caps at `maxWords` significant words
 * - Joins with '-'
 */
export const abbreviateText = (text: string, maxWords: number = 4): string => {
  if (!text || !text.trim()) return '';

  // Split on spaces, hyphens, underscores, slashes
  const words = text
    .replace(/[/\\_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .filter(w => !STOP_WORDS.has(w.toLowerCase()));

  const significantWords = words.slice(0, maxWords);

  return significantWords
    .map(word => {
      const clean = word.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '');
      if (!clean) return '';
      if (clean.length <= 4) {
        return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
      }
      return clean.charAt(0).toUpperCase() + clean.slice(1, 3).toLowerCase();
    })
    .filter(Boolean)
    .join('-');
};

/**
 * Get method abbreviation
 */
export const getMethodAbbreviation = (method: string): string => {
  return METHOD_ABBREVIATIONS[method] || 'XX';
};

/**
 * Format today's date as DDMMYYYY
 */
export const getFormattedDate = (date: Date = new Date()): string => {
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
};

/**
 * Generate the full reference string
 */
export const generateReference = (params: {
  method: string;
  projectName: string;
  title: string;
  offerNumber: string;
}): string => {
  const { method, projectName, title, offerNumber } = params;

  const methodAbbr = getMethodAbbreviation(method);
  const projectAbbr = abbreviateText(projectName, 3);
  const titleAbbr = abbreviateText(title, 4);
  const dateStr = getFormattedDate();

  return `${methodAbbr}/OSS/${projectAbbr}/${titleAbbr}/${dateStr}-${offerNumber}`;
};