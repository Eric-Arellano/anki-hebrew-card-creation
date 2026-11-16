// The maqaf (U+05BE), paseq (U+05C0), sof pasuq (U+05C3) and nun hafukha (U+05C6) are
// punctuation and stay.
const POINTS_AND_CANTILLATION = /[֑-ׇֽֿׁׂׅׄ]/g;

// Typed Hebrew uses ASCII quotes and the apostrophe for geresh and gershayim as often as the
// real characters, so a key folds them together: ג'ירפה and ג׳ירפה are the same word.
export const GERESH_STAND_INS = /['’]/g;
const GERSHAYIM_STAND_INS = /"/g;

// Invisible, and never part of a word: Wiktionary wraps some forms in embeddings and isolates
// (U+202A–U+202E, U+2066–U+2069), and text copied from a web page can carry the marks U+200E,
// U+200F and U+061C. An override, U+202E, would even show a word's letters reversed in Anki.
const DIRECTION_CONTROLS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

export function withoutDirectionControls(text: string): string {
  return text.replace(DIRECTION_CONTROLS, '');
}

/** The form two spellings of a word share when they differ only in points or punctuation. */
export function toComparisonKey(text: string): string {
  return withoutDirectionControls(text)
    .normalize('NFC')
    .replaceAll('&nbsp;', ' ')
    .replace(POINTS_AND_CANTILLATION, '')
    .replace(GERESH_STAND_INS, '׳')
    .replace(GERSHAYIM_STAND_INS, '״')
    .replace(/\s+/g, ' ')
    .trim();
}

// Without the global flag, whose `lastIndex` would carry over from one `test` to the next.
export const POINT_OR_CANTILLATION = new RegExp(POINTS_AND_CANTILLATION.source);

export function hasNiqqud(text: string): boolean {
  return POINT_OR_CANTILLATION.test(text);
}

// A holam or a dagesh alone makes a ו a vowel, and in NFC a letter's vowel comes straight after it.
const CONSONANTAL_YOD_OR_VAV = /(?<=[א-ת][\u0591-\u05C7]*)[יו][\u05B0-\u05B8]/;

/** Whether pointed `text` has a י or ו inside a word that ktiv male doubles: `לְצַיֵּר` is `לצייר`. */
export function hasConsonantalYodOrVav(text: string): boolean {
  return CONSONANTAL_YOD_OR_VAV.test(text.normalize('NFC'));
}

// A hiriq before a doubled letter, and the tsere a nif'al takes before a guttural. In NFC a letter's
// dagesh comes after its vowel. The few words that keep such a hiriq unwritten, like `מִכָּאן`, are
// not infinitives, which is all this is asked about.
const UNWRITTEN_YOD = /\u05B4[א-טכ-ת][\u05B0-\u05BB]*\u05BC|^לְהֵ[אהחער]/;

/**
 * Whether the pointed infinitive `text` has a vowel that ktiv male writes with a י its pointed
 * spelling lacks: `לְהִשָּׁאֵר` is `להישאר`, and `לְהֵעָלֵם` is `להיעלם`.
 */
export function hasUnwrittenYod(text: string): boolean {
  return UNWRITTEN_YOD.test(text.normalize('NFC'));
}

/** The key the dictionary index files `text` under: `שְׁנַת־` and `שנת` share one. */
export function toLookupKey(text: string): string {
  return (
    toComparisonKey(text)
      // A construct form or a prefix ends in a maqaf, which no one types: `שְׁנַת־`, `לְ־`.
      .replace(/^[־-]+|[־-]+$/g, '')
      // Inside a compound, Wiktionary writes a maqaf or a space, and people type a hyphen too:
      // `בֵּית־קָפֶה`, `בית קפה`, `בית-קפה`.
      .replace(/\s*[־-]\s*/g, ' ')
  );
}

/**
 * `text`'s lookup key without the ו and י inside each word, the letters ktiv male adds and ktiv
 * haser leaves out: `שולחן`, `שלחן` and `שֻׁלְחָן` share one. A word's first and last letters stay,
 * since there they are consonants more often than not: `ילד`, `שלי`.
 */
export function toDefectiveKey(text: string): string {
  return toLookupKey(text).replace(/(?<=\S)[וי]+(?=\S)/g, '');
}

/**
 * Whether pointed `pointed` spells unpointed `unpointed`, in ktiv male or ktiv haser. Only a
 * warning can rest on it: some correct pairs fail, like `קראטה` and `קָרָטֶה`.
 */
export function spellsWord(pointed: string, unpointed: string): boolean {
  return toDefectiveKey(pointed) === toDefectiveKey(unpointed);
}

// Sources order combining marks differently, so pointed text is compared, never displayed,
// after NFC.
export function isSamePointedText(a: string, b: string): boolean {
  return a.normalize('NFC') === b.normalize('NFC');
}

// How a word is chanted or stressed, not which word it is: cantillation, the meteg, the rafe and
// the dots over and under a letter.
const CHANT_AND_STRESS = /[\u0591-\u05AF\u05BD\u05BF\u05C4\u05C5]/g;

// What two pointings of one word may differ in. Unicode has a qamats qatan and a vav's holam haser
// of their own, which most sources write as a plain qamats and holam. And a source may point the
// ktiv male spelling, whose vowel letters another leaves out: `שָׁחוֹר` and `שָׁחֹר`, `שׁוּלְחָן` and
// `שֻׁלְחָן`, `דִּיבֵּר` and `דִּבֵּר`. A ו followed straight by a dagesh is a shuruk, as in `plural.ts`.
function toReadingKey(pointed: string): string {
  return (
    withoutDirectionControls(pointed)
      .normalize('NFC')
      .replace(CHANT_AND_STRESS, '')
      .replaceAll('\u05C7', '\u05B8')
      .replaceAll('\u05BA', '\u05B9')
      .replace(/ו\u05B9/g, '\u05B9')
      .replace(/ו\u05BC(?![\u05B0-\u05BB])/g, '\u05BB')
      .replace(/(?<=[\u05B4\u05B5][\u05BC\u05C1\u05C2]*)י(?![\u05B0-\u05BC])/g, '')
      // A vowel moved onto the letter before it may now sit out of NFC's order.
      .normalize('NFC')
      .trim()
  );
}

/** Whether two pointed spellings are read aloud the same, so are one word pointed two ways. */
export function isSameReading(a: string, b: string): boolean {
  return toReadingKey(a) === toReadingKey(b);
}

export function includesPointedText(text: string, part: string): boolean {
  return text.normalize('NFC').includes(part.normalize('NFC'));
}

/** `values` without any that repeat an earlier one, spelled as each was first given. */
export function uniquePointedText(values: readonly string[]): string[] {
  return values.filter(
    (value, index) => values.findIndex((other) => isSamePointedText(other, value)) === index,
  );
}
