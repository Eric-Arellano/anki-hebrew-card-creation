import { textToAnkiFieldHtml } from '#lib/anki/html.ts';
import { formsHtml } from '#lib/card/parts-of-speech/forms.ts';
import { type Binyan, type BinyanWithInfinitive, hasInfinitive } from '#lib/hebrew/binyan.ts';
import type { FieldValues } from '#lib/note-type.ts';

// The forms for “he”, there to see beside the infinitive. They are pointed, as the human copies
// them from a dictionary, and any may be blank. Only the past is quizzed, through
// `unpointedPast`; a variant is what quizzes any other form.
//
// *Rejected: suggesting variants as `pluralHints` does for a noun. What's regular depends on the
// binyan and the root, so a simple check flags `להגיע` and misses `לאכול`, and the forms worth
// quizzing, like `אֶלְמַד`, usually aren't these.*
type VerbForms = { past: string; present: string; future: string };

// The past without niqqud, as the Production answer quizzes it beside the infinitive. Its own
// input, since stripping the pointed past is wrong: `דִּבֵּר` is spelled `דיבר`. A verb without an
// infinitive goes by its past, so it has no second one.
export type VerbInputs = VerbForms &
  (
    | { binyan: BinyanWithInfinitive; unpointedPast: string }
    | { binyan: Exclude<Binyan, BinyanWithInfinitive> }
  );

export type VerbDraft = VerbForms & { binyan: Binyan | undefined; unpointedPast: string };

export function emptyVerbDraft(): VerbDraft {
  return { binyan: undefined, past: '', unpointedPast: '', present: '', future: '' };
}

export function completeVerb({
  binyan,
  unpointedPast,
  ...forms
}: VerbDraft): VerbInputs | undefined {
  if (binyan === undefined) return undefined;
  return hasInfinitive(binyan) ? { ...forms, binyan, unpointedPast } : { ...forms, binyan };
}

/** The fields a verb's inputs write, given `word` as Anki field HTML. */
export function composeVerbFields(word: string, verb: VerbInputs): FieldValues {
  return {
    // The infinitive, then the past, as `ללכת הלך`: neither predicts the other. Each meaning's
    // preposition is in `Definitions`, which the Production card blanks on the front.
    // *Rejected: the preposition here, because one slot can't hold a preposition per meaning, and
    // Anki grades the typed answer exactly.*
    answer:
      'unpointedPast' in verb ? `${word} ${textToAnkiFieldHtml(verb.unpointedPast.trim())}` : word,
    binyan: verb.binyan,
    forms: formsHtml([
      ['past', verb.past],
      ['pres', verb.present],
      ['fut', verb.future],
    ]),
  };
}

/**
 * A verb's inputs from the fields `composeVerbFields` wrote, where `past` is what its production
 * answer holds after the word.
 */
export function verbDraftFrom({
  binyan,
  forms,
  past,
}: Pick<VerbDraft, 'binyan'> & {
  forms: ReadonlyMap<string, string>;
  past: string | undefined;
}): VerbDraft {
  return {
    binyan,
    past: forms.get('past') ?? '',
    unpointedPast: past ?? '',
    present: forms.get('pres') ?? '',
    future: forms.get('fut') ?? '',
  };
}
