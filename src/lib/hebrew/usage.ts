// Where text uses a word. Only a warning, or bold the human can see, can rest on the answer: a
// form no one listed goes unrecognized, like `שב` for `לשבת`, and ignoring ו and י inside a word
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

type TextRange = { start: number; end: number };

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
// `מדברים`.
function rootPattern(letters: readonly string[]): RegExp {
  return new RegExp(letters.join('[וי]*'));
}

// What a verb's form may be joined to: ו “and”, then ש “that” or כש “when”, as in `וכשאקנה`.
const JOINED = '^ו?(?:כ?ש)?';

// What a verb's form may start with before its root, after what it is joined to: an infinitive's
// ל, a hif'il's ה, a present's מ or a future's person, and a hitpa'el's ת after any of them:
// `להקים`, `מתנסה`, `יתראו`.
const BEFORE_ROOT = `${JOINED}(?:ל?ה|מ|ל|[אתינ])?ת?`;

// What a form may end with after its root: `קמתי`, `קמנו`, `קמו`, `קמים`, `לשבת`. In medial
// letters, like the words and roots `rootRanges` matches.
const AFTER_ROOT = withMedialLetters('(?:|ה|ו|י|ת|תי|תם|תן|נו|ים|ות)$');

// What may follow a root's middle letter where its last is weak: a ה becomes י or ת, or drops
// before a ו or י, as in `קניתי`, `קנתה`, `קנו` and `קונים`, and a נ drops into the ת after it,
// as in `נתתי`. Any other last letter may only have a ו or י before it.
const AFTER_MIDDLE: Readonly<Record<string, readonly string[]>> = {
  ה: ['[וי]*[יתה]', '(?=[וי])'],
  נ: ['[וי]*נ', '(?=ת)'],
};

// The start of a form, through its middle letter, whose first letter has dropped. A first י drops
// after a future's person or an infinitive's ל, with nothing then between the other two
// (`אשב`, `לשבת`), or becomes the ו of a hif'il (`מוציא`). A first נ drops after any of them,
// leaving a י in ktiv male after all but א (`אסע`, `ליפול`, `מכיר`). ה־ל־ך conjugates as if its
// ה were a י, and ל־ק־ח as if its ל were a נ, here in medial letters.
function withoutFirst(root: string, middle: string): string[] {
  if (root.startsWith('י') || root === 'הלכ') {
    return [`${JOINED}[אתינל]${middle}(?![וי])`, `${JOINED}(?:ל?ה|מ|[אתינ])ו${middle}`];
  }
  if (root.startsWith('נ') || root === 'לקח') {
    return [`${JOINED}(?:ל?ה|מ|א|[תינל]י?)${middle}`];
  }
  return [];
}

function wholeWord(stem: string): RegExp {
  return new RegExp(`${stem}${AFTER_ROOT}`);
}

// A weak root loses or changes a letter as it conjugates, which leaves too little of it to find
// inside just any word, so these match a whole word, from what starts a verb's form to what ends
// one. Even so, another word spelled like a form passes: `שתי`, “two”, for ש־ת־ה. Commands
// that drop a first letter, like `שב` and `תן`, are left out, because `לך`, “go”, is far more
// often “to you”.
// *Rejected: matching the dictionary's conjugation table, because a note loaded from Anki has no
// picked entry, so its warnings and saved bold would depend on whether its word was looked up.*
function weakRootPatterns(letters: readonly string[]): RegExp[] {
  const [first, middle, last] = letters;
  if (letters.length !== 3 || first === undefined || middle === undefined || last === undefined) {
    return [];
  }
  const anyLast = `[וי]*${last}`;
  // A middle ו or י drops, as in `קמתי` for ק־ו־ם, unless the root ends in ה, which makes it a
  // consonant: `היינו` for ה־י־ה.
  if (/[וי]/.test(middle) && last !== 'ה') return [wholeWord(`${BEFORE_ROOT}${first}${anyLast}`)];
  const starts = [
    ...(last in AFTER_MIDDLE ? [`${BEFORE_ROOT}${first}[וי]*${middle}`] : []),
    ...withoutFirst(letters.join(''), middle),
  ];
  const ends = AFTER_MIDDLE[last] ?? [anyLast];
  return starts.flatMap((start) => ends.map((end) => wholeWord(`${start}${end}`)));
}

// A root of fewer than three letters would match too much to say anything.
function rootRanges(words: readonly Word[], root: string): TextRange[] {
  const letters = withMedialLetters(root).split('־');
  if (letters.length < 3) return [];
  const patterns = [rootPattern(letters), ...weakRootPatterns(letters)];
  return words.filter(({ key }) =>
    patterns.some((pattern) => pattern.test(withMedialLetters(key))),
  );
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
