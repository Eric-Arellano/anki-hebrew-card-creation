import { formsHtml } from '#lib/card/parts-of-speech/forms.ts';
import type { Binyan } from '#lib/hebrew/binyan.ts';
import type { FieldValues } from '#lib/note-type.ts';

// The forms for “he”, there to see beside the infinitive and never quizzed; a variant is what
// quizzes a form. They are pointed, as the human copies them from a dictionary, and any may be
// blank.
//
// *Rejected: suggesting variants as `pluralHints` does for a noun. What's regular depends on the
// binyan and the root, so a simple check flags `להגיע` and misses `לאכול`, and the forms worth
// quizzing, like `אֵלֵךְ`, usually aren't these.*
type VerbForms = { past: string; present: string; future: string };

export type VerbInputs = VerbForms & { binyan: Binyan };

export type VerbDraft = VerbForms & { binyan: Binyan | undefined };

export function emptyVerbDraft(): VerbDraft {
  return { binyan: undefined, past: '', present: '', future: '' };
}

export function completeVerb({ binyan, ...forms }: VerbDraft): VerbInputs | undefined {
  return binyan === undefined ? undefined : { ...forms, binyan };
}

/** The fields a verb's inputs write, given `word` as Anki field HTML. */
export function composeVerbFields(word: string, verb: VerbInputs): FieldValues {
  return {
    // The infinitive alone. Each meaning's preposition is in `Definitions`, which the Production
    // card blanks on the front.
    // *Rejected: the preposition here, because one slot can't hold a preposition per meaning, and
    // Anki grades the typed answer exactly.*
    productionAnswer: word,
    binyan: verb.binyan,
    forms: formsHtml([
      ['past', verb.past],
      ['pres', verb.present],
      ['fut', verb.future],
    ]),
  };
}

/** A verb's inputs from the fields `composeVerbFields` wrote, and its binyan, read apart. */
export function verbDraftFrom({
  binyan,
  forms,
}: Pick<VerbDraft, 'binyan'> & { forms: ReadonlyMap<string, string> }): VerbDraft {
  return {
    binyan,
    past: forms.get('past') ?? '',
    present: forms.get('pres') ?? '',
    future: forms.get('fut') ?? '',
  };
}
