// Our `/api/lookup` endpoint: what it answers, and the browser's one way to call it. The reply
// types live here rather than beside the server code that builds them, so the browser never
// imports from `#lib/server/`.
import { getJson } from '#lib/api/http.ts';
import type { Binyan } from '#lib/hebrew/binyan.ts';
import type { Gender } from '#lib/hebrew/gender.ts';
import type { Preposition } from '#lib/hebrew/preposition.ts';
import type { PartOfSpeech } from '#lib/note-type.ts';

// Pointed forms throughout, as the dictionary spells them. A list may hold several, for the human
// to choose between, or none.
export type DictionaryNoun = {
  // `undefined` where the dictionary's gender is missing or isn't one the deck has.
  gender: { gender: Gender; pluralOnly: boolean } | undefined;
  plurals: string[];
  feminines: string[];
  femininePlurals: string[];
};

export type DictionaryInfinitive = { pointed: string; unpointed?: string };

export type DictionaryVerb = {
  // `undefined` for a binyan the deck doesn't have, like hitpu'al.
  binyan: Binyan | undefined;
  infinitives: DictionaryInfinitive[];
  // Only a suggestion: the dictionary names one for few verbs, and not always the usual one.
  prepositions: Preposition[];
};

// A lemma: never a plural, an infinitive or a spelling that only points at one.
export type DictionaryCandidate = {
  id: number;
  // The page's unpointed title, as Wiktionary spells it.
  title: string;
  pointed: string | undefined;
  // Wiktionary's own, like `adj` or `name`.
  pos: string;
  glosses: string[];
  // Joined with maqafs.
  roots: string[];
} & (
  | { partOfSpeech: 'noun'; noun: DictionaryNoun }
  | { partOfSpeech: 'verb'; verb: DictionaryVerb }
  | { partOfSpeech: Exclude<PartOfSpeech, 'noun' | 'verb'> }
);

export type DictionaryLookup = {
  // `possible` when nothing matched exactly, and these match only once ו and י are ignored.
  match: 'exact' | 'possible';
  candidates: DictionaryCandidate[];
  // Whether Wiktionary has a Hebrew entry titled with the word as typed.
  titleHasEntry: boolean;
  // The dictionary file changed after the index was built from it.
  staleIndex: boolean;
};

export function fetchDictionaryLookup(word: string): Promise<DictionaryLookup> {
  return getJson(`/api/lookup?word=${encodeURIComponent(word)}`);
}
