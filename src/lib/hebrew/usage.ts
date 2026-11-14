// Whether text uses a word. Only a warning can rest on either answer: a form no one listed goes
// unrecognized, like `אלך` for `ללכת`, and ignoring ו and י inside a word lets `סיפור` pass for `ספר`.
import { withMedialLetters } from '#lib/hebrew/final-letters.ts';
import { toComparisonKey, toDefectiveKey } from '#lib/hebrew/normalize.ts';

// The one-letter words written joined to the next: ו “and”, ה “the”, ב “in”, כ “like”, ל “to”,
// מ “from” and ש “that”. They stack, as in `וכשהרכבת`, but rarely more than four deep.
const PREFIX_LETTERS = /^[והבכלמש]{0,4}/;

// Unpointed, with a geresh or gershayim kept inside the word: `ג׳ירפה`, `צה״ל`. A maqaf, like a
// space, separates two words.
function hebrewWords(text: string): string[] {
  return toComparisonKey(text).match(/[א-ת][א-ת׳״]*/g) ?? [];
}

function isSameWord(a: string, b: string): boolean {
  return toDefectiveKey(a) === toDefectiveKey(b);
}

// Every way to read `word` as prefix letters and then the rest, from no prefix up: `ובבית` is
// `ובבית`, `ו` + `בבית` and `וב` + `בית`. The rest is never empty.
function prefixSplits(word: string): { prefixes: string; rest: string }[] {
  const longest = Math.min(word.match(PREFIX_LETTERS)?.[0].length ?? 0, word.length - 1);
  return Array.from({ length: longest + 1 }, (_, length) => ({
    prefixes: word.slice(0, length),
    rest: word.slice(length),
  }));
}

// A preposition that is itself a prefix letter is used among them: `בבית` uses `ב`.
function isPrefixedForm(word: string, form: string): boolean {
  return prefixSplits(word).some(
    ({ prefixes, rest }) =>
      isSameWord(rest, form) || (form.length === 1 && prefixes.includes(form)),
  );
}

function hasFormAt(words: readonly string[], form: readonly string[]): boolean {
  return (
    words.length >= form.length &&
    form.every((formWord, index) => isPrefixedForm(words[index] ?? '', formWord))
  );
}

/**
 * Whether `text` holds one of `forms`, pointed or not, in ktiv male or haser, after any prefix
 * letters: `ובבית` holds `בַּיִת`. Each word of a form of several may take them, as `בית הספר`
 * holds `בֵּית סֵפֶר`.
 */
export function usesForm(text: string, forms: readonly string[]): boolean {
  const words = hebrewWords(text);
  return forms
    .map(hebrewWords)
    .filter((form) => form.length > 0)
    .some((form) => words.some((_, index) => hasFormAt(words.slice(index), form)));
}

/**
 * Whether a word of `text` holds the letters of `root`, as `formatRoot` writes it, in order, with
 * only a ו or י between them: ד־ב־ר in `דיברתי` and `מדברים`. A root of fewer than three letters
 * would match too much to say anything.
 */
export function usesRoot(text: string, root: string): boolean {
  const letters = withMedialLetters(root).split('־');
  if (letters.length < 3) return false;
  const pattern = new RegExp(letters.join('[וי]*'));
  return hebrewWords(text).some((word) => pattern.test(withMedialLetters(word)));
}
