import { textToAnkiFieldHtml } from '#lib/anki/html.ts';
import type { CardInputs } from '#lib/card-inputs.ts';
import type { FieldValues } from '#lib/note-type.ts';

/** What the editor suggests for each field it can fill from `inputs`, as Anki field HTML. */
export function suggestFields(inputs: CardInputs): FieldValues {
  const word = textToAnkiFieldHtml(inputs.word.trim());
  return {
    // What the human typed, never derived from the pointed form: `דִּבֵּר` strips to `דבר`, not `דיבר`.
    unpointed: word,
    pointed: textToAnkiFieldHtml(inputs.pointed.trim()),
    definitions: textToAnkiFieldHtml(inputs.gloss.trim()),
    // A noun's carries טוב and a verb's its preposition, so those are left to their own
    // composition rather than guessed.
    productionAnswer: inputs.partOfSpeech === 'other' ? word : '',
  };
}
