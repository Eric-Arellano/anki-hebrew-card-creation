import { error } from '@sveltejs/kit';
import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import { searchByNoteIds, searchByNoteType } from '#lib/anki/search.ts';
import type { LoadedNote } from '#lib/api/anki.ts';
import { FIELD_NAMES, type Field, NOTE_TYPE } from '#lib/note-type.ts';
import type { AnkiClient, NoteInfo } from '#lib/server/anki/client.ts';
import { withAnkiErrorsAs502 } from '#lib/server/http.ts';

/** A field of `note` as plain text, blank when the note lacks it. */
export function fieldText(note: NoteInfo, field: Field): string {
  return ankiFieldHtmlToText(note.fields[field.name]?.value ?? '');
}

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

/** The note `readNote` finds, else a 404, or a 502 when Anki fails. */
export async function readNoteOr404(anki: AnkiClient, noteId: number): Promise<LoadedNote> {
  const note = await withAnkiErrorsAs502(() => readNote(anki, noteId));
  if (note === undefined) error(404, `Anki has no Hebrew note ${noteId}. Was it deleted?`);
  return note;
}

/** A 400 when `fields` names a field the note type doesn't have. */
export function refuseUnknownFields(fields: Record<string, string>): void {
  const unknownFieldNames = Object.keys(fields).filter((name) => !FIELD_NAMES.includes(name));
  if (unknownFieldNames.length > 0) error(400, `Unknown fields: ${unknownFieldNames.join(', ')}`);
}
