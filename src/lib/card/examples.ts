// `Examples` holds one line per example, joined by `<br>`:
//
//   <bdi lang="he">Hebrew.</bdi><span class="sep"> — </span><span lang="en">English.</span>
//
// Anki shows the field left to right, so without the `<bdi>` the `.`, `?` or `!` ending the
// Hebrew would jump to the far side of its sentence. The note type's styling puts the English on
// its own line under the Hebrew and hides `.sep`, which is there for where that styling doesn't
// reach, like the Browse table, so the two sentences don't run together.
//
// The word is bolded in the Hebrew wherever `examplesWithoutWord` would find it, so the warning
// and the bold can't disagree.
import { ankiFieldHtmlToText, textToAnkiFieldHtml } from '#lib/anki/html.ts';
import type { CardInputsDraft } from '#lib/card/inputs.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import { usageRanges, type WordUsage } from '#lib/hebrew/usage.ts';

// Each part is plain text, as a meaning is, not HTML.
export type Example = { hebrew: string; english: string };

export function blankExample(): Example {
  return { hebrew: '', english: '' };
}

export function isBlankExample({ hebrew, english }: Example): boolean {
  return hebrew.trim() === '' && english.trim() === '';
}

const SEPARATOR = '<span class="sep"> — </span>';

function boldedHtml(text: string, word: WordUsage): string {
  const ranges = usageRanges(text, word);
  const pieces = ranges.flatMap(({ start, end }, index) => [
    textToAnkiFieldHtml(text.slice(ranges[index - 1]?.end ?? 0, start)),
    `<b>${textToAnkiFieldHtml(text.slice(start, end))}</b>`,
  ]);
  return [...pieces, textToAnkiFieldHtml(text.slice(ranges.at(-1)?.end ?? 0))].join('');
}

function exampleHtml({ hebrew, english }: Example, word: WordUsage): string {
  const he =
    hebrew.trim() === '' ? [] : [`<bdi lang="he">${boldedHtml(hebrew.trim(), word)}</bdi>`];
  const en =
    english.trim() === '' ? [] : [`<span lang="en">${textToAnkiFieldHtml(english.trim())}</span>`];
  return [...he, ...en].join(SEPARATOR);
}

export function examplesToAnkiFieldHtml(examples: readonly Example[], word: WordUsage): string {
  return examples
    .filter((example) => !isBlankExample(example))
    .map((example) => exampleHtml(example, word))
    .join('<br>');
}

// The Hebrew may hold markup inside its `<bdi>`, like the `<b>` around the word, which reading
// drops and the next save puts back; the English, escaped, holds none.
const COMPOSED_LINE = new RegExp(
  '^(?:<bdi lang="he">((?:(?!</bdi>).)*)</bdi>' +
    `(?:${SEPARATOR}<span lang="en">([^<]*)</span>)?` +
    '|<span lang="en">([^<]*)</span>)$',
);

// A line this tool didn't write loads whole into the Hebrew, never guessed apart: the human splits
// it, and the review before a save shows it rewritten.
function exampleFromLine(line: string): Example {
  const match = line.trim().match(COMPOSED_LINE);
  if (match === null) return { hebrew: ankiFieldHtmlToText(line), english: '' };
  const [, hebrew = '', englishAfterHebrew = '', englishAlone = ''] = match;
  return {
    hebrew: ankiFieldHtmlToText(hebrew),
    english: ankiFieldHtmlToText(englishAfterHebrew || englishAlone),
  };
}

/** Each example in an `Examples` field, or one blank row when it holds none. */
export function examplesFromHtml(html: string): Example[] {
  const examples = html
    .split(/<br\s*\/?>/i)
    .filter((line) => ankiFieldHtmlToText(line) !== '')
    .map(exampleFromLine);
  return examples.length === 0 ? [blankExample()] : examples;
}

export type LabeledForm = { label: string; form: string };

function labeled(forms: Record<string, string>): LabeledForm[] {
  return Object.entries(forms).map(([label, form]) => ({ label, form }));
}

// A preposition's and other's are typed into `Forms` by hand, one `label: form` line each.
function formsFieldLines(formsField: string): LabeledForm[] {
  return formsField.split('\n').map((line) => {
    const colon = line.indexOf(':');
    return colon === -1
      ? { label: '', form: line }
      : { label: line.slice(0, colon).trim(), form: line.slice(colon + 1) };
  });
}

function allLabeledForms(inputs: CardInputsDraft, formsField: string): LabeledForm[] {
  switch (inputs.partOfSpeech) {
    case 'noun':
      return labeled({
        plural: inputs.noun.plural,
        feminine: inputs.noun.feminine,
        'feminine plural': inputs.noun.femininePlural,
      });
    case 'verb':
      return labeled({
        'past (he)': inputs.verb.past,
        'present (he)': inputs.verb.present,
        'future (he)': inputs.verb.future,
      });
    case 'adjective':
      return labeled({
        feminine: inputs.adjective.feminine,
        'masculine plural': inputs.adjective.masculinePlural,
        'feminine plural': inputs.adjective.femininePlural,
      });
    case 'preposition':
    case 'other':
      return formsFieldLines(formsField);
    case 'adverb':
    case 'phrase':
    case undefined:
      return [];
  }
}

/** The word's other forms that the inputs and `Forms` hold, trimmed, leaving out the blank. */
export function labeledForms(inputs: CardInputsDraft, formsField: string): LabeledForm[] {
  return allLabeledForms(inputs, formsField)
    .map(({ label, form }) => ({ label, form: form.trim() }))
    .filter(({ form }) => form !== '');
}

/**
 * The forms an example may use the word by: the word itself, pointed or not, its other forms, and
 * a verb's root, since a verb's forms are for “he” while an example may conjugate it any way:
 * `דיברתי` for `לְדַבֵּר`.
 */
export function wordUsage(inputs: CardInputsDraft, formsField: string): WordUsage {
  return {
    forms: [
      inputs.word,
      inputs.pointed,
      ...labeledForms(inputs, formsField).map(({ form }) => form),
    ],
    root: inputs.partOfSpeech === 'verb' ? formatRoot(inputs.root) : undefined,
  };
}
