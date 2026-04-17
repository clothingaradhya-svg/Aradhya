export const SITE_NAME = 'Aradhya';
export const SITE_URL = 'https://www.thehouseofaradhya.com';

export const TARGET_KEYWORDS = [
  'Aradhya designer wear',
  'men outfit combination',
  'skintone based outfit combinations for men',
  'men outfit under 2500',
  'shirt and pant shoes combination for men',
  'best colour combination for men',
  'men fashion for dark skin tone',
  'men fashion for fair skin tone',
  'men fashion for wheatish skin tone',
  'men fashion for neutral skin tone',
  'what to wear for date men india',
  'party outfit for men india',
  'college outfit for men india',
  'old money outfits for men india',
];

export function buildCanonicalUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, SITE_URL).toString();
}

export function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createKeywordList(keywords = []) {
  return Array.from(new Set(keywords.map((item) => String(item || '').trim()).filter(Boolean)));
}
