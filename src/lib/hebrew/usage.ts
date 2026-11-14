// Where text uses a word. Only a warning, or bold the human can see, can rest on the answer: a
// form no one listed goes unrecognized, like `אלך` for `ללכת`, and ignoring ו and י inside a word
// lets `סיפור` pass for `ספר`.
import { withMedialLetters } from '#lib/hebrew/final-letters.ts';
import { POINT_OR_CANTILLATION, toComparisonKey, toDefectiveKey } from '#lib/hebrew/normalize.ts';

// The one-letter words written joined to the next: ו “and”, ה “the”, ב “in”, כ “like”, ל “to”,
// מ “from” and ש “that”. They stack, as in `וכשהרכבת`, but rarely more than four deep.
const PREFIX_LETTERS = /^[והבכלמש]{0,4}/;

// Matched in the original text, points and all, so a word's offsets are the text's own. A geresh
// or gershayim, or the quote typed for one, stays inside the word: `ג׳ירפה`, `צה"ל`, `סנדוויץ'`.
// A gershayim never ends a word, so a closing `"` is a quote. A maqaf, like a space, separates
// two words.
const HEBREW_WORD = new RegExp(
  `[א-ת](?:[א-ת׳'’]|${POINT_OR_CANTILLATION.source}|[״"](?=[א-ת]))*`,
  'g',
);

export type TextRange = { start: number; end: number };

type Word = TextRange & { key: string };

function hebrewWords(text: string): Word[] {
  return [...text.matchAll(HEBREW_WORD)].map(({ 0: word, index }) => ({
    key: toComparisonKey(word),
    start: index,
    end: index + word.length,
  }));
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

// Each word of a form of several may take prefix letters, as `לבית הספר` holds `בֵּית סֵפֶר`.
function formRanges(words: readonly Word[], form: readonly string[]): TextRange[] {
  return words.flatMap(({ start }, index) => {
    const last = words[index + form.length - 1];
    const matches =
      last !== undefined &&
      form.every((formWord, offset) => isPrefixedForm(words[index + offset]?.key ?? '', formWord));
    return matches ? [{ start, end: last.end }] : [];
  });
}

// The letters of `root`, in order, with only a ו or י between them: ד־ב־ר in `דיברתי` and
// `מדברים`. A root of fewer than three letters would match too much to say anything.
function rootRanges(words: readonly Word[], root: string): TextRange[] {
  const letters = withMedialLetters(root).split('־');
  if (letters.length < 3) return [];
  const pattern = new RegExp(letters.join('[וי]*'));
  return words.filter(({ key }) => pattern.test(withMedialLetters(key)));
}

// In order, with overlapping or touching ranges joined, so `בית` and `בית ספר` bold once.
function merged(ranges: readonly TextRange[]): TextRange[] {
  return ranges
    .toSorted((a, b) => a.start - b.start)
    .reduce<TextRange[]>((joined, { start, end }) => {
      const previous = joined.at(-1);
      if (previous === undefined || start > previous.end) joined.push({ start, end });
      else previous.end = Math.max(previous.end, end);
      return joined;
    }, []);
}

/** The forms a word takes in a sentence, and its root, as `formatRoot` writes it. */
export type WordUsage = { forms: readonly string[]; root?: string };

/**
 * The ranges of `text` that hold one of `forms`, pointed or not, in ktiv male or haser, or a word
 * built on `root`. A word's prefix letters fall inside its range: `ובבית` for `בַּיִת`.
 */
export function usageRanges(text: string, { forms, root }: WordUsage): TextRange[] {
  const words = hebrewWords(text);
  return merged([
    ...forms
      .map((form) => hebrewWords(form).map(({ key }) => key))
      .filter((form) => form.length > 0)
      .flatMap((form) => formRanges(words, form)),
    ...(root === undefined ? [] : rootRanges(words, root)),
  ]);
}
