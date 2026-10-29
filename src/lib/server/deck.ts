import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import { searchByFieldContainingKey, searchByNoteType } from '#lib/anki/search.ts';
import { toComparisonKey } from '#lib/hebrew/normalize.ts';
import { DECK, FIELD_NAMES, FIELDS, NOTE_TYPE } from '#lib/note-type.ts';
import { type AnkiClient, AnkiError, type NoteInfo } from '#lib/server/anki.ts';

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

export function findFieldDrift(
  expectedFieldNames: readonly string[],
  liveFieldNames: readonly string[],
): FieldDrift {
  return {
    missingFromAnki: expectedFieldNames.filter((name) => !liveFieldNames.includes(name)),
    unexpectedInAnki: liveFieldNames.filter((name) => !expectedFieldNames.includes(name)),
  };
}

export async function getAnkiStatus(anki: AnkiClient): Promise<AnkiStatus> {
  try {
    const [ankiConnectVersion, deckNames, noteTypeNames] = await Promise.all([
      anki('version'),
      anki('deckNames'),
      anki('modelNames'),
    ]);
    const deckFound = deckNames.includes(DECK);
    if (!noteTypeNames.includes(NOTE_TYPE)) {
      return { kind: 'connected', ankiConnectVersion, deckFound, noteType: { found: false } };
    }

    const liveFieldNames = await anki('modelFieldNames', { modelName: NOTE_TYPE });
    const drift = findFieldDrift(FIELD_NAMES, liveFieldNames);
    return {
      kind: 'connected',
      ankiConnectVersion,
      deckFound,
      noteType: { found: true, liveFieldNames, drift },
    };
  } catch (error) {
    if (error instanceof AnkiError) return { kind: 'error', message: error.message };
    throw error;
  }
}

export type ExistingNote = { noteId: number; unpointed: string; pointed: string };

export type ExistingNotes = { exactMatches: ExistingNote[]; relatedMatches: ExistingNote[] };

export function partitionByExactMatch(
  notes: readonly NoteInfo[],
  comparisonKey: string,
): ExistingNotes {
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
