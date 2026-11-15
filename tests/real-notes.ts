import type { LoadedNote } from '#lib/api/anki.ts';
import type { NoteInfo } from '#lib/server/anki/client.ts';
import bayit from '#tests/fixtures/anki/notes-info-bayit.json' with { type: 'json' };
import ima from '#tests/fixtures/anki/notes-info-ima.json' with { type: 'json' };
import kelevChatulDag from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};
import mechonitOto from '#tests/fixtures/anki/notes-info-mechonit-oto.json' with { type: 'json' };
import twoImages from '#tests/fixtures/anki/notes-info-two-images.json' with { type: 'json' };

/** The fixture note whose `Hebrew` is `word`, as AnkiConnect's `notesInfo` answers with it. */
export function noteInfo(word: string): NoteInfo {
  const note = [...kelevChatulDag, ...bayit, ...twoImages, ...mechonitOto, ...ima].find(
    ({ fields }) => fields.Hebrew.value === word,
  );
  if (note === undefined) throw new Error(`No fixture note for ${word}`);
  return note;
}

/** The fixture note whose `Hebrew` is `word`, as `GET /api/anki/notes/[noteId]` answers with it. */
export function loadedNote(word: string): LoadedNote {
  const note = noteInfo(word);
  return {
    noteId: note.noteId,
    mod: note.mod,
    fields: Object.fromEntries(
      Object.entries(note.fields).map(([name, { value }]) => [name, value]),
    ),
  };
}

/** Each field of the fixture note whose `Hebrew` is `word`, by Anki name, as Anki holds it. */
export function realNote(word: string): Record<string, string> {
  return loadedNote(word).fields;
}

/** One field of the fixture note whose `Hebrew` is `word`, by its Anki name. */
export function realField(word: string, field: string): string {
  const value = realNote(word)[field];
  if (value === undefined) throw new Error(`No fixture field ${field} for ${word}`);
  return value;
}
