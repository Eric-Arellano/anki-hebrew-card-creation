import type { Binyan } from '#lib/hebrew/binyan.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import type { FieldValues } from '#lib/note-type.ts';

// The prepositions (מילות יחס) a verb commonly governs, roughly by frequency. Hebrew grammar counts
// את, which marks a definite direct object, among them, and the production answer keeps it:
// `לראות את`. אל, אחרי, בפני and מפני are left out: after a verb they are rare or formal, and the
// deck is a beginner's.
export const PREPOSITIONS = ['את', 'ל', 'ב', 'על', 'עם', 'מ'] as const;

export type Preposition = (typeof PREPOSITIONS)[number];

// The root is as `formatRoot` writes it. A verb with no preposition takes no object at all, like
// ללכת, and its production answer is the word alone.
export type VerbInputs = {
  binyan: Binyan;
  root: string;
  preposition: Preposition | undefined;
};

// The root is as the human typed it. The preposition starts as את, the commonest case.
export type VerbDraft = {
  binyan: Binyan | undefined;
  root: string;
  preposition: Preposition | 'none';
};

export function emptyVerbDraft(): VerbDraft {
  return { binyan: undefined, root: '', preposition: 'את' };
}

// A root that isn't only letters is as missing as a blank one.
export function missingVerbInputs({ binyan, root }: VerbDraft): ('binyan' | 'root')[] {
  return [
    ...(binyan === undefined ? (['binyan'] as const) : []),
    ...(formatRoot(root) === undefined ? (['root'] as const) : []),
  ];
}

export function completeVerb({ binyan, root, preposition }: VerbDraft): VerbInputs | undefined {
  const formattedRoot = formatRoot(root);
  if (binyan === undefined || formattedRoot === undefined) return undefined;
  return {
    binyan,
    root: formattedRoot,
    preposition: preposition === 'none' ? undefined : preposition,
  };
}

/** The fields a verb's inputs write, given `word` as Anki field HTML. */
export function composeVerbFields(word: string, verb: VerbInputs): FieldValues {
  return {
    productionAnswer: verb.preposition === undefined ? word : `${word} ${verb.preposition}`,
    binyan: verb.binyan,
    root: verb.root,
  };
}
