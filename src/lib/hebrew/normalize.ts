// Points and cantillation. The maqaf (U+05BE), paseq (U+05C0), sof pasuq (U+05C3) and nun
// hafukha (U+05C6) are punctuation and stay.
const MARKS = /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g;

// Typed Hebrew uses ASCII quotes and the apostrophe for geresh and gershayim as often as the
// real characters, so a key folds them together: ג'ירפה and ג׳ירפה are the same word.
const GERESH = /['’]/g;
const GERSHAYIM = /"/g;

/** The form two spellings of a word share when they differ only in points or punctuation. */
export function toKey(text: string): string {
  return text
    .normalize('NFC')
    .replaceAll('&nbsp;', ' ')
    .replace(MARKS, '')
    .replace(GERESH, '׳')
    .replace(GERSHAYIM, '״')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sources order combining marks differently, so pointed text is compared, never displayed,
// after NFC.
export function samePointed(a: string, b: string): boolean {
  return a.normalize('NFC') === b.normalize('NFC');
}
