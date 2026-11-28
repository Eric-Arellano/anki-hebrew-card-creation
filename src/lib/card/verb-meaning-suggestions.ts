// What Suggest meanings asks Claude about a verb, and how its answer is shown and used.
//
// Claude answers the whole list, so the human sees each of their lines kept, given a preposition,
// overridden or split, and each meaning Claude added, and takes any part of it. Taking none of
// what came from a line keeps that line as it was, so a suggestion never removes a line the human
// wrote; the × beside it does.
// *Rejected: replacing the meanings with the answer whole, because Claude offers more meanings
// than a card wants, and the reasons it gives for each are gone once the answer is used.*
import type { SuggestedVerbMeaning, VerbMeaningsRequest } from '#lib/api/ai.ts';
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import { filledMeanings, type Meaning, type PrepositionChoice } from '#lib/card/meanings.ts';

/** Why there is nothing to ask Claude for yet, or `undefined` once there is. */
export function verbMeaningsBlocker({
  word,
  meanings,
  dictionaryDefinitions,
}: VerbMeaningsRequest): string | undefined {
  if (word === '') return 'Type the verb first.';
  if (meanings.length === 0 && dictionaryDefinitions.length === 0) {
    return 'Type a meaning, or pick the verb’s dictionary entry, first.';
  }
  return undefined;
}

export function verbMeaningsRequest(
  { word, pointed, meanings }: { word: string; pointed: string; meanings: Meaning[] },
  pickedEntry: DictionaryCandidate | undefined,
): VerbMeaningsRequest {
  const verb = pickedEntry?.partOfSpeech === 'verb' ? pickedEntry : undefined;
  return {
    word: word.trim(),
    pointed: pointed.trim(),
    meanings: filledMeanings(meanings).map(({ english, preposition }) =>
      preposition === undefined ? { english } : { english, preposition },
    ),
    dictionaryDefinitions: verb?.definitions ?? [],
    dictionaryPrepositions: verb?.verb.prepositions ?? [],
  };
}

/** What a suggested meaning does to the human's meaning it came from. */
export type VerbMeaningChange =
  | { kind: 'unchanged' }
  | {
      kind: 'newPreposition';
      /** The human's own choice, which Claude replaced. Absent where they had chosen none. */
      replaced?: PrepositionChoice;
    }
  | { kind: 'reworded'; original: string }
  | { kind: 'added' };

export type ProposedVerbMeaning = SuggestedVerbMeaning & { change: VerbMeaningChange };

function changeFrom(
  askedMeanings: readonly Meaning[],
  { english, preposition, fromIndex }: SuggestedVerbMeaning,
): VerbMeaningChange {
  const asked = fromIndex === undefined ? undefined : askedMeanings[fromIndex];
  if (asked === undefined) return { kind: 'added' };
  if (asked.english !== english) return { kind: 'reworded', original: asked.english };
  if (asked.preposition === preposition) return { kind: 'unchanged' };
  return asked.preposition === undefined
    ? { kind: 'newPreposition' }
    : { kind: 'newPreposition', replaced: asked.preposition };
}

/** Claude's meanings, each with what it does to the `askedMeanings` it points into. */
export function proposedVerbMeanings(
  askedMeanings: readonly Meaning[],
  suggested: readonly SuggestedVerbMeaning[],
): ProposedVerbMeaning[] {
  return suggested.map((meaning) => ({ ...meaning, change: changeFrom(askedMeanings, meaning) }));
}

function toMeaning({ english, preposition }: ProposedVerbMeaning): Meaning {
  return { english, preposition };
}

/**
 * The meanings once the proposal is used, but for the proposed ones at the `skipped` indices: each
 * of `askedMeanings` in its place, replaced by what is taken from it, then each added one taken.
 */
export function verbMeaningsAfterUse(
  askedMeanings: readonly Meaning[],
  proposed: readonly ProposedVerbMeaning[],
  skipped: readonly number[],
): Meaning[] {
  const taken = proposed.filter(
    ({ change }, index) => change.kind === 'unchanged' || !skipped.includes(index),
  );
  const fromAsked = askedMeanings.flatMap((asked, index) => {
    const parts = taken.filter(({ fromIndex }) => fromIndex === index);
    return parts.length === 0 ? [{ ...asked }] : parts.map(toMeaning);
  });
  const added = taken.filter(({ change }) => change.kind === 'added').map(toMeaning);
  return [...fromAsked, ...added];
}
