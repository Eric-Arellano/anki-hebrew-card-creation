import { searchByNoteIds, searchByNoteType } from '#lib/anki/search.ts';
import type { LoadedNote } from '#lib/api/anki.ts';
import { NOTE_TYPE } from '#lib/note-type.ts';
import type { AnkiClient } from '#lib/server/anki/client.ts';

/** The note of our note type with `noteId`, or `undefined` when Anki has none. */
export async function readNote(anki: AnkiClient, noteId: number): Promise<LoadedNote | undefined> {
  // `notesInfo` answers `[{}]` for a missing note, which its schema refuses as a reply Anki
  // shouldn't send. Finding the note first tells a missing note from a broken reply, and keeps
  // out a note of another type, whose fields the editor can't read.
  const query = `${searchByNoteType(NOTE_TYPE)} ${searchByNoteIds([noteId])}`;
  if (!(await anki('findNotes', { query })).includes(noteId)) return undefined;

  const [note] = await anki('notesInfo', { notes: [noteId] });
  if (note === undefined) return undefined;
  return {
    noteId: note.noteId,
    mod: note.mod,
    fields: Object.fromEntries(
      Object.entries(note.fields).map(([name, { value }]) => [name, value]),
    ),
  };
}
