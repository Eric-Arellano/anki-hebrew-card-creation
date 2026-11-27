import { textToAnkiFieldHtml } from '#lib/anki/html.ts';
import { definitionsToAnkiFieldHtml } from '#lib/card/definitions.ts';
import type { CardInputs } from '#lib/card/inputs.ts';
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
    definitions: definitionsToAnkiFieldHtml(inputs.definitions),
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
