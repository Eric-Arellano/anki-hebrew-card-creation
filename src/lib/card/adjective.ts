import { formsHtml } from '#lib/card/forms.ts';
import type { FieldValues } from '#lib/note-type.ts';

// The forms are pointed, as the human copies them from a dictionary, and any may be blank.
export type AdjectiveInputs = {
  feminine: string;
  masculinePlural: string;
  femininePlural: string;
};

export function emptyAdjectiveInputs(): AdjectiveInputs {
  return { feminine: '', masculinePlural: '', femininePlural: '' };
}

/** The fields an adjective's inputs write, given `word` as Anki field HTML. */
export function composeAdjectiveFields(word: string, adjective: AdjectiveInputs): FieldValues {
  return {
    productionAnswer: word,
    forms: formsHtml([
      ['f', adjective.feminine],
      ['m.pl', adjective.masculinePlural],
      ['f.pl', adjective.femininePlural],
    ]),
  };
}
