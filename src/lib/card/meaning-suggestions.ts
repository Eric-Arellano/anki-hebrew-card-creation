// What Suggest meanings asks Claude about a verb, and how its answer is shown and used.
//
// Claude answers the whole list, so the human sees each of their lines kept, given a preposition,
// overridden or split, and each meaning Claude added, and takes any part of it. Taking none of
// what came from a line keeps that line as it was, so a suggestion never removes a line the human
// wrote; the × beside it does.
// *Rejected: replacing the meanings with the answer whole, because Claude offers more meanings
// than a card wants, and the reasons it gives for each are gone once the answer is used.*
import type { MeaningsRequest, SuggestedMeaning } from '#lib/api/ai.ts';
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import { filledDefinitions, type Meaning, type PrepositionChoice } from '#lib/card/definitions.ts';

/** Why there is nothing to ask Claude for yet, or `undefined` once there is. */
export function meaningsBlocker({ word, meanings, glosses }: MeaningsRequest): string | undefined {
  if (word === '') return 'Type the verb first.';
  if (meanings.length === 0 && glosses.length === 0) {
    return 'Type a meaning, or pick the verb’s dictionary entry, first.';
  }
  return undefined;
}

export function meaningsRequest(
  { word, pointed, definitions }: { word: string; pointed: string; definitions: Meaning[] },
  // The entry picked, which gives its definitions only while it is a verb.
  candidate: DictionaryCandidate | undefined,
): MeaningsRequest {
  const verb = candidate?.partOfSpeech === 'verb' ? candidate : undefined;
  return {
    word: word.trim(),
    pointed: pointed.trim(),
    meanings: filledDefinitions(definitions).map(({ english, preposition }) =>
      preposition === undefined ? { english } : { english, preposition },
    ),
    glosses: verb?.definitions ?? [],
    prepositions: verb?.verb.prepositions ?? [],
  };
}

// What a suggested meaning does to the line it came from. `chose` is the human's own preposition,
// where Claude gave another; `from` is the line's English, where Claude's differs.
export type Origin =
  | { kind: 'unchanged' }
  | { kind: 'yours'; chose?: PrepositionChoice }
  | { kind: 'reworded'; from: string }
  | { kind: 'added' };

export type ProposedMeaning = SuggestedMeaning & { origin: Origin };

function originOf(asked: readonly Meaning[], { english, preposition, from }: SuggestedMeaning) {
  const line = from === undefined ? undefined : asked[from];
  if (line === undefined) return { kind: 'added' } as const;
  if (line.english !== english) return { kind: 'reworded', from: line.english } as const;
  if (line.preposition === preposition) return { kind: 'unchanged' } as const;
  return line.preposition === undefined
    ? ({ kind: 'yours' } as const)
    : ({ kind: 'yours', chose: line.preposition } as const);
}

/** Claude's meanings, each with what it does to the `asked` lines. */
export function proposedMeanings(
  asked: readonly Meaning[],
  suggested: readonly SuggestedMeaning[],
): ProposedMeaning[] {
  return suggested.map((meaning) => ({ ...meaning, origin: originOf(asked, meaning) }));
}

function toMeaning({ english, preposition }: ProposedMeaning): Meaning {
  return { english, preposition };
}

/**
 * The meanings once the proposal is used, but for those at the `skipped` indices: each of `asked`
 * in its place, replaced by what is taken from it, then each added meaning taken.
 */
export function withProposal(
  asked: readonly Meaning[],
  proposed: readonly ProposedMeaning[],
  skipped: readonly number[],
): Meaning[] {
  const taken = proposed.filter(
    ({ origin }, index) => origin.kind === 'unchanged' || !skipped.includes(index),
  );
  const fromLines = asked.flatMap((line, index) => {
    const parts = taken.filter(({ from }) => from === index);
    return parts.length === 0 ? [{ ...line }] : parts.map(toMeaning);
  });
  const added = taken.filter(({ origin }) => origin.kind === 'added').map(toMeaning);
  return [...fromLines, ...added];
}
