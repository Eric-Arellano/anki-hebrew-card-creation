// `Definitions` holds one meaning alone, or several numbered one a line, joined by `<br>`:
//
//   1. friend<br>2. companion
import { ankiFieldHtmlToText, textToAnkiFieldHtml } from '#lib/anki/html.ts';

// The English is plain text, not HTML.
export type Meaning = { english: string };

// Each meaning trimmed, in the order the human typed them. There is always a first one.
export type Definitions = readonly [Meaning, ...Meaning[]];

export function blankMeaning(): Meaning {
  return { english: '' };
}

export function isBlankMeaning({ english }: Meaning): boolean {
  return english.trim() === '';
}

/** Each meaning with English, trimmed, leaving out blank rows. */
export function filledDefinitions(meanings: readonly Meaning[]): Meaning[] {
  return meanings
    .filter((meaning) => !isBlankMeaning(meaning))
    .map((meaning) => ({ ...meaning, english: meaning.english.trim() }));
}

export function definitionsToAnkiFieldHtml(definitions: Definitions): string {
  if (definitions.length === 1) return textToAnkiFieldHtml(definitions[0].english);
  return definitions
    .map(({ english }, index) => `${index + 1}. ${textToAnkiFieldHtml(english)}`)
    .join('<br>');
}

/** Each meaning in a `Definitions` field, without the numbers composition adds. */
export function definitionsFromHtml(html: string): Meaning[] {
  const lines = html
    .split(/<br\s*\/?>/i)
    .map(ankiFieldHtmlToText)
    .filter((line) => line !== '');
  // Only a list numbered from 1 is one composition wrote, so a meaning like `1. Kings` stays.
  const numbered =
    lines.length > 1 && lines.every((line, index) => line.startsWith(`${index + 1}. `));
  return lines.map((line) => ({ english: numbered ? line.replace(/^\d+\. /, '') : line }));
}
