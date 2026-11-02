import { formsHtml } from '#lib/card/forms.ts';
import type { Binyan } from '#lib/hebrew/binyan.ts';
import type { GovernedPreposition } from '#lib/hebrew/preposition.ts';
import type { FieldValues } from '#lib/note-type.ts';

// The forms for “he”, there to see beside the infinitive and never quizzed; a variant is what
// quizzes a form. They are pointed, as the human copies them from a dictionary, and any may be
// blank.
//
// *Rejected: suggesting variants as `pluralHints` does for a noun. What's regular depends on the
// binyan and the root, so a simple check flags `להגיע` and misses `לאכול`, and the forms worth
// quizzing, like `אֵלֵךְ`, usually aren't these.*
type VerbForms = { past: string; present: string; future: string };

// A verb with no preposition takes no object at all, like ללכת, and its production answer is the
// word alone.
export type VerbInputs = VerbForms & {
  binyan: Binyan;
  preposition: GovernedPreposition | undefined;
};

// The preposition starts unchosen, like the binyan: it is part of the answer the Production card
// checks, and את and none are easy to mix up.
export type VerbDraft = VerbForms & {
  binyan: Binyan | undefined;
  preposition: GovernedPreposition | 'none' | undefined;
};

export function emptyVerbDraft(): VerbDraft {
  return { binyan: undefined, preposition: undefined, past: '', present: '', future: '' };
}

export function completeVerb({ binyan, preposition, ...forms }: VerbDraft): VerbInputs | undefined {
  if (binyan === undefined || preposition === undefined) return undefined;
  return { ...forms, binyan, preposition: preposition === 'none' ? undefined : preposition };
}

/** The fields a verb's inputs write, given `word` as Anki field HTML. */
export function composeVerbFields(word: string, verb: VerbInputs): FieldValues {
  return {
    productionAnswer: verb.preposition === undefined ? word : `${word} ${verb.preposition}`,
    binyan: verb.binyan,
    forms: formsHtml([
      ['past', verb.past],
      ['pres', verb.present],
      ['fut', verb.future],
    ]),
  };
}
