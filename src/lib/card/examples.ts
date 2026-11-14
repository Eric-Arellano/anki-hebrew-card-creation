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
