// `Examples` holds one line per example, `<bdi lang="he">Hebrew.</bdi> (English.)`, joined by
// `<br>`. Anki shows the field left to right, so without the `<bdi>` the `.`, `?` or `!` ending
// the Hebrew would jump to the far side of its sentence.
import { ankiFieldHtmlToText, textToAnkiFieldHtml } from '#lib/anki/html.ts';

// Each part is plain text, as a meaning is, not HTML.
export type Example = { hebrew: string; english: string };

export function blankExample(): Example {
  return { hebrew: '', english: '' };
}

export function isBlankExample({ hebrew, english }: Example): boolean {
  return hebrew.trim() === '' && english.trim() === '';
}

function exampleHtml({ hebrew, english }: Example): string {
  const he =
    hebrew.trim() === '' ? [] : [`<bdi lang="he">${textToAnkiFieldHtml(hebrew.trim())}</bdi>`];
  const en = english.trim() === '' ? [] : [`(${textToAnkiFieldHtml(english.trim())})`];
  return [...he, ...en].join(' ');
}

export function examplesToAnkiFieldHtml(examples: readonly Example[]): string {
  return examples
    .filter((example) => !isBlankExample(example))
    .map(exampleHtml)
    .join('<br>');
}

const COMPOSED_LINE = /^(?:<bdi lang="he">((?:(?!<\/bdi>).)*)<\/bdi>)? ?(?:\((.*)\))?$/;

// A line this tool didn't write loads whole into the Hebrew, never guessed apart: the human splits
// it, and the review before a save shows it rewritten.
function exampleFromLine(line: string): Example {
  const [, hebrew = '', english = ''] = line.trim().match(COMPOSED_LINE) ?? [];
  if (hebrew === '' && english === '') {
    return { hebrew: ankiFieldHtmlToText(line), english: '' };
  }
  return { hebrew: ankiFieldHtmlToText(hebrew), english: ankiFieldHtmlToText(english) };
}

/** Each example in an `Examples` field, or one blank row when it holds none. */
export function examplesFromHtml(html: string): Example[] {
  const examples = html
    .split(/<br\s*\/?>/i)
    .filter((line) => ankiFieldHtmlToText(line) !== '')
    .map(exampleFromLine);
  return examples.length === 0 ? [blankExample()] : examples;
}
