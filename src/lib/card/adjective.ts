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

/** An adjective's inputs from the `Forms` that `composeAdjectiveFields` wrote. */
export function adjectiveInputsFrom(forms: ReadonlyMap<string, string>): AdjectiveInputs {
  return {
    feminine: forms.get('f') ?? '',
    masculinePlural: forms.get('m.pl') ?? '',
    femininePlural: forms.get('f.pl') ?? '',
  };
}
