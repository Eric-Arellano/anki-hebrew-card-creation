import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import { searchByFieldContainingKey, searchByNoteType } from '#lib/anki/search.ts';
import type { ExistingNotes } from '#lib/api.ts';
import { toComparisonKey } from '#lib/hebrew/normalize.ts';
import { FIELDS, NOTE_TYPE } from '#lib/note-type.ts';
import type { AnkiClient, NoteInfo } from '#lib/server/anki.ts';

function partitionByExactMatch(notes: readonly NoteInfo[], comparisonKey: string): ExistingNotes {
  const existingNotes = notes.map((note) => ({
    noteId: note.noteId,
    unpointed: ankiFieldHtmlToText(note.fields[FIELDS.unpointed.name]?.value ?? ''),
    pointed: ankiFieldHtmlToText(note.fields[FIELDS.pointed.name]?.value ?? ''),
  }));
  const exactMatches = existingNotes.filter(
    (note) => toComparisonKey(note.unpointed) === comparisonKey,
  );
  const relatedMatches = existingNotes.filter((note) => !exactMatches.includes(note));
  return { exactMatches, relatedMatches };
}

export async function findExistingNotes(anki: AnkiClient, word: string): Promise<ExistingNotes> {
  const comparisonKey = toComparisonKey(word);
  if (comparisonKey === '') return { exactMatches: [], relatedMatches: [] };

  const query = `${searchByNoteType(NOTE_TYPE)} ${searchByFieldContainingKey(FIELDS.unpointed.name, comparisonKey)}`;
  const noteIds = await anki('findNotes', { query });
  if (noteIds.length === 0) return { exactMatches: [], relatedMatches: [] };

  return partitionByExactMatch(await anki('notesInfo', { notes: noteIds }), comparisonKey);
}
