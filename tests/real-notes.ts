import type { LoadedNote } from '#lib/api/anki.ts';
import bayit from '#tests/fixtures/anki/notes-info-bayit.json' with { type: 'json' };
import kelevChatulDag from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};
import twoImages from '#tests/fixtures/anki/notes-info-two-images.json' with { type: 'json' };

/** The fixture note whose `Hebrew` is `word`, as `GET /api/anki/notes/[noteId]` answers with it. */
export function loadedNote(word: string): LoadedNote {
  const note = [...kelevChatulDag, ...bayit, ...twoImages].find(
    ({ fields }) => fields.Hebrew.value === word,
  );
  if (note === undefined) throw new Error(`No fixture note for ${word}`);
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
