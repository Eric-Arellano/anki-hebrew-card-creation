import { textToAnkiFieldHtml } from '#lib/anki/html.ts';
import type { CardInputs, Definitions } from '#lib/card/inputs.ts';
import { composeNounFields } from '#lib/card/noun.ts';
import { composeVerbFields } from '#lib/card/verb.ts';
import type { FieldValues } from '#lib/note-type.ts';

/** Every field the editor can fill from `inputs`, as Anki field HTML. */
export function composeFields(inputs: CardInputs): FieldValues {
  const word = textToAnkiFieldHtml(inputs.word.trim());
  const shared = {
    // What the human typed, never derived from the pointed form: `דִּבֵּר` strips to `דבר`, not `דיבר`.
    unpointed: word,
    pointed: textToAnkiFieldHtml(inputs.pointed.trim()),
    definitions: definitionsHtml(inputs.definitions),
  };
  switch (inputs.partOfSpeech) {
    case 'noun':
      return { ...shared, ...composeNounFields(word, inputs.noun) };
    case 'verb':
      return { ...shared, ...composeVerbFields(word, inputs.verb) };
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
