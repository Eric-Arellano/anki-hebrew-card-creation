import { searchByFieldHavingPhrase, searchByNoteType, searchForAny } from '#lib/anki/search.ts';
import type { SameMeaningNote } from '#lib/api/anki.ts';
import { definitionsFromHtml } from '#lib/card/compose.ts';
import { senseKeys, sharedSenses } from '#lib/card/meanings.ts';
import { toComparisonKey } from '#lib/hebrew/normalize.ts';
import { FIELDS, NOTE_TYPE } from '#lib/note-type.ts';
import type { AnkiClient } from '#lib/server/anki/client.ts';
import { fieldHtml, fieldText } from '#lib/server/anki/notes.ts';

/** The notes that share a sense with `meanings`, other than the notes for any of `words`. */
export async function findSameMeaningNotes(
  anki: AnkiClient,
  meanings: readonly string[],
  words: readonly string[],
): Promise<SameMeaningNote[]> {
  const keys = senseKeys(meanings);
  if (keys.length === 0) return [];

  // The search finds `car` in `car park` too, so the senses are compared once the notes are read.
  const terms = keys.map((key) => searchByFieldHavingPhrase(FIELDS.definitions.name, key));
  const noteIds = await anki('findNotes', {
    query: `${searchByNoteType(NOTE_TYPE)} ${searchForAny(terms)}`,
  });
  if (noteIds.length === 0) return [];

  const wordKeys = words.map(toComparisonKey);
  const notes = await anki('notesInfo', { notes: noteIds });
  return notes
    .filter((note) => !wordKeys.includes(toComparisonKey(fieldText(note, FIELDS.unpointed))))
    .map((note) => ({
      noteId: note.noteId,
      unpointed: fieldText(note, FIELDS.unpointed),
      pointed: fieldText(note, FIELDS.pointed),
      sharedMeanings: sharedSenses(
        meanings,
        definitionsFromHtml(fieldHtml(note, FIELDS.definitions)),
      ),
      productionContext: fieldText(note, FIELDS.productionContext),
    }))
    .filter((note) => note.sharedMeanings.length > 0);
}
