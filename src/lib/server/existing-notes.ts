import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import { searchByFieldContainingKey, searchByNoteType, searchForAny } from '#lib/anki/search.ts';
import type { ExistingNotes } from '#lib/api.ts';
import { toComparisonKey } from '#lib/hebrew/normalize.ts';
import { FIELDS, NOTE_TYPE } from '#lib/note-type.ts';
import type { AnkiClient, NoteInfo } from '#lib/server/anki-client.ts';

function partitionByExactMatch(
  notes: readonly NoteInfo[],
  comparisonKeys: readonly string[],
): ExistingNotes {
  const existingNotes = notes.map((note) => ({
    noteId: note.noteId,
    unpointed: ankiFieldHtmlToText(note.fields[FIELDS.unpointed.name]?.value ?? ''),
    pointed: ankiFieldHtmlToText(note.fields[FIELDS.pointed.name]?.value ?? ''),
  }));
  const exactMatches = existingNotes.filter((note) =>
    comparisonKeys.includes(toComparisonKey(note.unpointed)),
  );
  const relatedMatches = existingNotes.filter((note) => !exactMatches.includes(note));
  return { exactMatches, relatedMatches };
}

/** The notes whose unpointed field holds any of `words`, such as an infinitive and its lemma. */
export async function findExistingNotes(
  anki: AnkiClient,
  words: readonly string[],
): Promise<ExistingNotes> {
  const comparisonKeys = [...new Set(words.map(toComparisonKey))].filter((key) => key !== '');
  if (comparisonKeys.length === 0) return { exactMatches: [], relatedMatches: [] };

  const fieldTerms = comparisonKeys.map((key) =>
    searchByFieldContainingKey(FIELDS.unpointed.name, key),
  );
  const query = `${searchByNoteType(NOTE_TYPE)} ${searchForAny(fieldTerms)}`;
  const noteIds = await anki('findNotes', { query });
  if (noteIds.length === 0) return { exactMatches: [], relatedMatches: [] };

  return partitionByExactMatch(await anki('notesInfo', { notes: noteIds }), comparisonKeys);
}
