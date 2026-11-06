// Our `/api/anki/` endpoints: what each answers, and the browser's one way to call each. The reply
// types live here rather than beside the server code that builds them, so the browser never
// imports from `#lib/server/`.
import { getJson, postJson, postJsonForReply } from '#lib/api/http.ts';

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

/** The notes that hold any of `words`. */
export function fetchExistingNotes(words: readonly string[]): Promise<ExistingNotes> {
  const query = words.map((word) => `word=${encodeURIComponent(word)}`).join('&');
  return getJson(`/api/anki/existing?${query}`);
}

export function browseNotes(noteIds: readonly number[]): Promise<void> {
  return postJson('/api/anki/browse', { noteIds });
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // The result is a data URL, and only what follows its comma is the bytes.
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Stores a file in Anki's media folder, and answers with the name Anki used, not the one asked. */
export async function storeMedia(filename: string, blob: Blob): Promise<string> {
  const stored = await postJsonForReply<{ filename: string }>('/api/anki/media', {
    filename,
    data: await toBase64(blob),
  });
  return stored.filename;
}

/** Opens Anki's Add window, pre-filled with `fields`, keyed by Anki field name. */
export function openAddWindow(fields: Record<string, string>): Promise<void> {
  return postJson('/api/anki/add', { fields });
}
