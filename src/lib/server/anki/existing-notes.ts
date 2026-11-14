import {
  searchByFieldContainingKey,
  searchByFieldEquals,
  searchByNoteType,
  searchForAny,
} from '#lib/anki/search.ts';
import type { ExistingNotes } from '#lib/api/anki.ts';
import { toComparisonKey } from '#lib/hebrew/normalize.ts';
import { FIELDS, NOTE_TYPE } from '#lib/note-type.ts';
import type { AnkiClient, NoteInfo } from '#lib/server/anki/client.ts';
import { fieldText } from '#lib/server/anki/notes.ts';

const NONE: ExistingNotes = { exactMatches: [], sameRootMatches: [], relatedMatches: [] };

function partition(
  notes: readonly NoteInfo[],
  comparisonKeys: readonly string[],
  sameRootNoteIds: readonly number[],
): ExistingNotes {
  const existingNotes = notes.map((note) => ({
    noteId: note.noteId,
    unpointed: fieldText(note, FIELDS.unpointed),
    pointed: fieldText(note, FIELDS.pointed),
    partOfSpeech: fieldText(note, FIELDS.partOfSpeech),
    definitions: fieldText(note, FIELDS.definitions),
  }));
  const exactMatches = existingNotes.filter((note) =>
    comparisonKeys.includes(toComparisonKey(note.unpointed)),
  );
  const rest = existingNotes.filter((note) => !exactMatches.includes(note));
  const sameRootMatches = rest.filter((note) => sameRootNoteIds.includes(note.noteId));
  const relatedMatches = rest.filter((note) => !sameRootMatches.includes(note));
  return { exactMatches, sameRootMatches, relatedMatches };
}

/**
 * The notes whose unpointed field holds any of `words`, such as an infinitive and its lemma, and
 * those whose root is `root`, as `formatRoot` writes it.
 */
export async function findExistingNotes(
  anki: AnkiClient,
  words: readonly string[],
  root?: string,
): Promise<ExistingNotes> {
  const comparisonKeys = [...new Set(words.map(toComparisonKey))].filter((key) => key !== '');
  if (comparisonKeys.length === 0) return NONE;

  const byNoteType = searchByNoteType(NOTE_TYPE);
  const fieldTerms = comparisonKeys.map((key) =>
    searchByFieldContainingKey(FIELDS.unpointed.name, key),
  );
  // Separate searches, so a note is sorted by which one found it, not by rereading its `Root`.
  const [wordNoteIds, sameRootNoteIds] = await Promise.all([
    anki('findNotes', { query: `${byNoteType} ${searchForAny(fieldTerms)}` }),
    root === undefined
      ? []
      : anki('findNotes', {
          query: `${byNoteType} ${searchByFieldEquals(FIELDS.root.name, root)}`,
        }),
  ]);
  const noteIds = [...new Set([...wordNoteIds, ...sameRootNoteIds])];
  if (noteIds.length === 0) return NONE;

  return partition(await anki('notesInfo', { notes: noteIds }), comparisonKeys, sameRootNoteIds);
}
