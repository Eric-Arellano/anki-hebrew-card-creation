import { ankiFieldHtmlToText, textToAnkiFieldHtml } from '#lib/anki/html.ts';
import type { CardInputs, Definitions } from '#lib/card/inputs.ts';
import { composeAdjectiveFields } from '#lib/card/parts-of-speech/adjective.ts';
import { composeNounFields } from '#lib/card/parts-of-speech/noun.ts';
import { composeVerbFields } from '#lib/card/parts-of-speech/verb.ts';
import { withoutTrailingMaqaf } from '#lib/hebrew/preposition.ts';
import type { FieldValues } from '#lib/note-type.ts';

/** Every field the editor can fill from `inputs`, as Anki field HTML. */
export function composeFields(inputs: CardInputs): FieldValues {
  const word = textToAnkiFieldHtml(inputs.word.trim());
  const shared = {
    // What the human typed, never derived from the pointed form: `דִּבֵּר` strips to `דבר`, not `דיבר`.
    unpointed: word,
    partOfSpeech: inputs.partOfSpeech,
    pointed: textToAnkiFieldHtml(inputs.pointed.trim()),
    definitions: definitionsHtml(inputs.definitions),
  };
  switch (inputs.partOfSpeech) {
    case 'noun':
      return { ...shared, root: inputs.root, ...composeNounFields(word, inputs.noun) };
    case 'verb':
      return { ...shared, root: inputs.root, ...composeVerbFields(word, inputs.verb) };
    case 'adjective':
      return { ...shared, root: inputs.root, ...composeAdjectiveFields(word, inputs.adjective) };
    case 'preposition':
      return { ...shared, productionAnswer: withoutTrailingMaqaf(word) };
    case 'adverb':
    case 'phrase':
    case 'other':
      return { ...shared, productionAnswer: word };
  }
}

// One meaning alone, or `1. friend<br>2. companion` when there are several.
function definitionsHtml(definitions: Definitions): string {
  if (definitions.length === 1) return textToAnkiFieldHtml(definitions[0]);
  return definitions
    .map((definition, index) => `${index + 1}. ${textToAnkiFieldHtml(definition)}`)
    .join('<br>');
}

/** Each meaning in a `Definitions` field, one a line, without the numbers `definitionsHtml` adds. */
export function definitionsFromHtml(html: string): string[] {
  const lines = html
    .split(/<br\s*\/?>/i)
    .map(ankiFieldHtmlToText)
    .filter((line) => line !== '');
  // Only a list numbered from 1 is one `definitionsHtml` wrote, so a meaning like `1. Kings` stays.
  const numbered =
    lines.length > 1 && lines.every((line, index) => line.startsWith(`${index + 1}. `));
  return numbered ? lines.map((line) => line.replace(/^\d+\. /, '')) : lines;
}
