// Our `/api/anki/` endpoints: what each answers, and the browser's one way to call each. The reply
// types live here rather than beside the server code that builds them, so the browser never
// imports from `#lib/server/`.
import { getJson, postJsonForReply } from '#lib/api/http.ts';

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

// As plain text, for a reader choosing which note to open. `partOfSpeech` is as the note holds it,
// often blank in old notes.
export type ExistingNote = {
  noteId: number;
  unpointed: string;
  pointed: string;
  partOfSpeech: string;
  definitions: string;
};

// Each note in one list only, the first that fits: its word, then its root, then containing the word.
export type ExistingNotes = {
  exactMatches: ExistingNote[];
  sameRootMatches: ExistingNote[];
  relatedMatches: ExistingNote[];
};

/** A note as Anki holds it, with its fields keyed by Anki name. */
export type LoadedNote = { noteId: number; mod: number; fields: Record<string, string> };

export function fetchAnkiStatus(): Promise<AnkiStatus> {
  return getJson('/api/anki/status');
}

/** The notes that hold any of `words`, or whose root is `root`, as `formatRoot` writes it. */
export function fetchExistingNotes(
  words: readonly string[],
  root: string | undefined,
): Promise<ExistingNotes> {
  const query = new URLSearchParams(words.map((word) => ['word', word]));
  if (root !== undefined) query.append('root', root);
  return getJson(`/api/anki/existing?${query}`);
}

export function fetchNote(noteId: number): Promise<LoadedNote> {
  return getJson(`/api/anki/notes/${noteId}`);
}

/**
 * Writes `fields`, keyed by Anki field name, to the note as `held` loaded it, and answers with the
 * note as Anki now holds it. A `RouteError` with status 409 means it changed in Anki since.
 */
export function saveNote(held: LoadedNote, fields: Record<string, string>): Promise<LoadedNote> {
  return postJsonForReply(`/api/anki/notes/${held.noteId}`, { fields, mod: held.mod });
}

/**
 * Adds a note with `fields`, keyed by Anki field name, and answers with it as Anki holds it. A
 * `RouteError` with status 409 means Anki holds a note with the same `Hebrew`, which only
 * `allowDuplicate` lets through.
 */
export function addNote(
  fields: Record<string, string>,
  { allowDuplicate }: { allowDuplicate: boolean },
): Promise<LoadedNote> {
  return postJsonForReply('/api/anki/notes', { fields, allowDuplicate });
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

/** Where the browser reads a file already in Anki's media folder. */
export function storedMediaUrl(filename: string): string {
  return `/api/anki/media/${encodeURIComponent(filename)}`;
}
