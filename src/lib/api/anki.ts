// Our `/api/anki/` endpoints: what each answers, and the browser's one way to call each. The reply
// types live here rather than beside the server code that builds them, so the browser never
// imports from `#lib/server/`.
import { getJson, postJson } from '#lib/api/http.ts';

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

export function fetchAnkiStatus(): Promise<AnkiStatus> {
  return getJson('/api/anki/status');
}

export function fetchExistingNotes(word: string): Promise<ExistingNotes> {
  return getJson(`/api/anki/existing?word=${encodeURIComponent(word)}`);
}

export function browseNotes(noteIds: readonly number[]): Promise<void> {
  return postJson('/api/anki/browse', { noteIds });
}

/** Opens Anki's Add window, pre-filled with `fields`, keyed by Anki field name. */
export function openAddWindow(fields: Record<string, string>): Promise<void> {
  return postJson('/api/anki/add', { fields });
}
