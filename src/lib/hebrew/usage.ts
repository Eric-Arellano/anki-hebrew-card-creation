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

// The future's א for “I”, which takes no ending, so a word that starts with it ends with the
// root's last letter: `אקום`, `אשב`, `אקנה`, but not `אנכי` for נ־כ־ה. In medial letters.
function firstPerson(last: string): string {
  return `א(?=.*${last}$)`;
}

// What a verb's form may start with before its root, after what it is joined to: an infinitive's
// ל, a hif'il's ה, a present's מ or a future's person, and a hitpa'el's ת after any of them:
// `להקים`, `מתנסה`, `יתראו`.
function beforeRoot(last: string): string {
  return `${JOINED}(?:ל?ה|מ|ל|[תינ]|${firstPerson(last)})?ת?`;
}

// What a form may end with after its root: `קמתי`, `קמנו`, `קמו`, `קמים`, `לשבת`. In medial
// letters, like the words and roots `rootRanges` matches.
const AFTER_ROOT = withMedialLetters('(?:|ה|ו|י|ת|תי|תם|תן|נו|ים|ות)$');

// The same, where a hollow root's middle has dropped: no form that drops it ends in a י.
const AFTER_DROPPED_MIDDLE = withMedialLetters('(?:|ה|ו|ת|תי|תם|תן|נו|ים|ות)$');

// What may follow a root's middle letter where its last is weak, to the end of the word. A last ה
// stays, becomes י or ת, or drops before a ו or י, each with only the endings a verb gives it:
// `קנה`, `קניתי`, `קנתה`, `קנו`, `קונים`, `לקנות`, `קנוי`. So `עליו` doesn't pass for ע־ל־ה. A
// last נ drops into the ת after it, as in `נתתי`. Any other last letter may only have a ו or י
// before it.
const AFTER_MIDDLE: Readonly<Record<string, readonly string[]>> = {
  ה: [withMedialLetters('(?:ה|י?ית[יםןה]?|ינו|תה|ות|ו|ים|י|וי(?:ה|ים|ות)?)$')],
  נ: [`[וי]*נ${AFTER_ROOT}`, `(?=ת)${AFTER_ROOT}`],
};

// The start of a form, through its middle letter, whose first letter has dropped. A first י drops
// after a future's person or an infinitive's ל, with nothing then between the other two
// (`אשב`, `לשבת`), or becomes the ו of a hif'il (`מוציא`). A first נ drops after any of them,
// leaving a י in ktiv male after all but א (`אסע`, `ליפול`), and a hif'il's present keeps a ו or
// י before the last letter, unless it is a ה (`מכיר`, `מכה`), so `מצרים` doesn't pass for
// נ־צ־ר. ה־ל־ך conjugates as if its ה were a י, and ל־ק־ח as if its ל were a נ, here in medial
// letters.
function withoutFirst(root: string, middle: string, last: string): string[] {
  const person = `(?:[תינ]|${firstPerson(last)})`;
  if (root.startsWith('י') || root === 'הלכ') {
    return [`${JOINED}(?:${person}|ל)${middle}(?![וי])`, `${JOINED}(?:ל?ה|מ|${person})ו${middle}`];
  }
  if (root.startsWith('נ') || root === 'לקח') {
    const present = last === 'ה' ? 'מ' : `מ(?=${middle}[וי])`;
    return [`${JOINED}(?:ל?ה|${present}|${firstPerson(last)}|[תינל]י?)${middle}`];
  }
  return [];
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
  // A middle ו or י drops only in a past or present, or a hif'il's past with its ה, and never
  // before a י: `קמתי`, `קמים`, `הקמנו`, but `אקום` and `מקים`. So `ארץ` doesn't pass for ר־ו־ץ,
  // nor `בני` for ב־י־ן. Unless the root ends in ה, which makes it a consonant: `היינו` for ה־י־ה.
  if (/[וי]/.test(middle) && last !== 'ה') {
    return [
      new RegExp(`${beforeRoot(last)}${first}[וי]+${last}${AFTER_ROOT}`),
      new RegExp(`${JOINED}ה?${first}${last}${AFTER_DROPPED_MIDDLE}`),
    ];
  }
  const starts = [
    ...(last in AFTER_MIDDLE ? [`${beforeRoot(last)}${first}[וי]*${middle}`] : []),
    ...withoutFirst(letters.join(''), middle, last),
  ];
  const ends = AFTER_MIDDLE[last] ?? [`[וי]*${last}${AFTER_ROOT}`];
  return starts.flatMap((start) => ends.map((end) => new RegExp(`${start}${end}`)));
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

/**
 * The forms a word takes in a sentence, and a verb's root, as `formatRoot` writes it. Only a verb's:
 * the root is matched by how a verb conjugates, which would pass far too much for another word.
 */
export type WordUsage = { forms: readonly string[]; root?: string };

/**
 * The ranges of `text` that hold one of `forms`, pointed or not, in ktiv male or haser, or a
 * conjugation of `root`. A word's prefix letters fall inside its range: `ובבית` for `בַּיִת`.
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
