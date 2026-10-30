// Our own endpoints: what each answers, and the browser's one way to call each. The reply types
// live here rather than beside the server code that builds them, so the browser never imports
// from `#lib/server/`.
import { z } from 'zod';
import type { Preposition } from '#lib/card/verb.ts';
import type { Binyan } from '#lib/hebrew/binyan.ts';
import type { Gender } from '#lib/hebrew/gender.ts';
import type { PartOfSpeech } from '#lib/note-type.ts';

export type FieldDrift = { missingFromAnki: string[]; unexpectedInAnki: string[] };

export type NoteTypeStatus =
  | { found: false }
  // In the note type's order, which the editor follows.
  | { found: true; liveFieldNames: string[]; drift: FieldDrift };

export type AnkiStatus =
  | { kind: 'error'; message: string }
  | {
      kind: 'connected';
      ankiConnectVersion: number;
      deckFound: boolean;
      noteType: NoteTypeStatus;
    };

export type ExistingNote = { noteId: number; unpointed: string; pointed: string };

export type ExistingNotes = { exactMatches: ExistingNote[]; relatedMatches: ExistingNote[] };

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

export function fetchAnkiStatus(): Promise<AnkiStatus> {
  return getJson('/api/anki/status');
}

/** The notes that hold any of `words`. */
export function fetchExistingNotes(words: readonly string[]): Promise<ExistingNotes> {
  const query = words.map((word) => `word=${encodeURIComponent(word)}`).join('&');
  return getJson(`/api/anki/existing?${query}`);
}

export function lookUpWord(word: string): Promise<DictionaryLookup> {
  return getJson(`/api/lookup?word=${encodeURIComponent(word)}`);
}

export function browseNotes(noteIds: readonly number[]): Promise<void> {
  return postJson('/api/anki/browse', { noteIds });
}

/** Opens Anki's Add window, pre-filled with `fields`, keyed by Anki field name. */
export function openAddWindow(fields: Record<string, string>): Promise<void> {
  return postJson('/api/anki/add', { fields });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// The body SvelteKit's `error()` answers with.
const errorBodySchema = z.object({ message: z.string() });

async function failureMessage(response: Response): Promise<string> {
  const body = errorBodySchema.safeParse(await response.json().catch(() => undefined));
  return body.success ? body.data.message : `The server answered ${response.status}`;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(await failureMessage(response));
  return (await response.json()) as T;
}

async function postJson(path: string, body: unknown): Promise<void> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await failureMessage(response));
}
