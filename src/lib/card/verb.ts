import type { Binyan } from '#lib/hebrew/binyan.ts';
import type { GovernedPreposition } from '#lib/hebrew/preposition.ts';
import type { FieldValues } from '#lib/note-type.ts';

// A verb with no preposition takes no object at all, like ללכת, and its production answer is the
// word alone.
export type VerbInputs = {
  binyan: Binyan;
  preposition: GovernedPreposition | undefined;
};

// The preposition starts unchosen, like the binyan: it is part of the answer the Production card
// checks, and את and none are easy to mix up.
export type VerbDraft = {
  binyan: Binyan | undefined;
  preposition: GovernedPreposition | 'none' | undefined;
};

export function emptyVerbDraft(): VerbDraft {
  return { binyan: undefined, preposition: undefined };
}

export function completeVerb({ binyan, preposition }: VerbDraft): VerbInputs | undefined {
  if (binyan === undefined || preposition === undefined) return undefined;
  return { binyan, preposition: preposition === 'none' ? undefined : preposition };
}

/** The fields a verb's inputs write, given `word` as Anki field HTML. */
export function composeVerbFields(word: string, verb: VerbInputs): FieldValues {
  return {
    productionAnswer: verb.preposition === undefined ? word : `${word} ${verb.preposition}`,
    binyan: verb.binyan,
  };
}
