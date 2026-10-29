import type { Binyan } from '#lib/hebrew/binyan.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import type { FieldValues } from '#lib/note-type.ts';

// The prepositions a verb can govern, roughly by frequency. את is left out on purpose: a verb that
// takes a direct object gets no preposition at all, so its production answer is `לראות`, never
// `לראות את`.
export const PREPOSITIONS = ['ל', 'ב', 'על', 'עם', 'מ', 'אל', 'אחרי', 'בפני', 'מפני'] as const;

export type Preposition = (typeof PREPOSITIONS)[number];

// The root is as the human typed it, which composition formats. The binyan may be unknown.
export type VerbInputs = {
  binyan: Binyan | undefined;
  root: string;
  preposition: Preposition | undefined;
};

// The preposition starts unchosen rather than as none, because it is part of the answer the
// Production card checks, so the human says “none” out loud.
export type VerbDraft = {
  binyan: Binyan | undefined;
  root: string;
  preposition: Preposition | 'none' | undefined;
};

export function emptyVerbDraft(): VerbDraft {
  return { binyan: undefined, root: '', preposition: undefined };
}

export function missingVerbInputs({ preposition }: VerbDraft): 'preposition'[] {
  return preposition === undefined ? ['preposition'] : [];
}

export function completeVerb({ preposition, ...verb }: VerbDraft): VerbInputs | undefined {
  if (preposition === undefined) return undefined;
  return { ...verb, preposition: preposition === 'none' ? undefined : preposition };
}

/** The fields a verb's inputs write, given `word` as Anki field HTML. */
export function composeVerbFields(word: string, verb: VerbInputs): FieldValues {
  return {
    productionAnswer: verb.preposition === undefined ? word : `${word} ${verb.preposition}`,
    binyan: verb.binyan ?? '',
    root: formatRoot(verb.root) ?? '',
  };
}
