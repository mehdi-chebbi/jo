const SLUG_WORD_LIMIT = 4;

const IGNORED_WORDS = new Set([
  // Common English filler words
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
  // Common French filler words
  'au', 'aux', 'de', 'des', 'du', 'en', 'et', 'la', 'le', 'les', 'par', 'pour', 'un', 'une',
  // Generic recruitment wording that adds little value to an offer URL
  'cabinet', 'consultant', 'consultants', 'consultancy', 'firm', 'group', 'recruitment', 'recrutement'
]);

const getSlugWords = (title: string): string[] =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

export const createOfferSlug = (title: string, id: number | string): string => {
  const allWords = getSlugWords(title);
  const meaningfulWords = allWords.filter(word => !IGNORED_WORDS.has(word));
  const selectedWords = (meaningfulWords.length > 0 ? meaningfulWords : allWords)
    .slice(0, SLUG_WORD_LIMIT);
  const readablePart = selectedWords.join('-') || 'offer';

  return `${readablePart}-${id}`;
};

export const extractOfferId = (value?: string): string | null => {
  if (!value) return null;

  const match = value.match(/(?:^|-)(\d+)$/);
  return match?.[1] ?? null;
};
