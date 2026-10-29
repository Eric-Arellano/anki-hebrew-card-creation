// The maqaf (U+05BE), paseq (U+05C0), sof pasuq (U+05C3) and nun hafukha (U+05C6) are
// punctuation and stay.
const POINTS_AND_CANTILLATION = /[֑-ׇֽֿׁׂׅׄ]/g;

// Typed Hebrew uses ASCII quotes and the apostrophe for geresh and gershayim as often as the
// real characters, so a key folds them together: ג'ירפה and ג׳ירפה are the same word.
const GERESH_STAND_INS = /['’]/g;
const GERSHAYIM_STAND_INS = /"/g;

/** The form two spellings of a word share when they differ only in points or punctuation. */
export function toComparisonKey(text: string): string {
  return text
    .normalize('NFC')
    .replaceAll('&nbsp;', ' ')
    .replace(POINTS_AND_CANTILLATION, '')
    .replace(GERESH_STAND_INS, '׳')
    .replace(GERSHAYIM_STAND_INS, '״')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sources order combining marks differently, so pointed text is compared, never displayed,
// after NFC.
export function isSamePointedText(a: string, b: string): boolean {
  return a.normalize('NFC') === b.normalize('NFC');
}
