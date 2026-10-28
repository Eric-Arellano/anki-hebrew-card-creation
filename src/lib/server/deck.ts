import { htmlToText } from '#lib/anki/html.ts';
import { fieldContainsKey, noteTypeIs } from '#lib/anki/search.ts';
import type { Config } from '#lib/config.ts';
import { toKey } from '#lib/hebrew/normalize.ts';
import { type AnkiClient, AnkiError, type NoteInfo } from '#lib/server/anki.ts';

export type FieldDrift = { missing: string[]; unexpected: string[] };

export type NoteTypeStatus =
  | { found: false }
  // `fields` is the note type's live order, which the editor follows.
  | { found: true; fields: string[]; drift: FieldDrift };

export type AnkiStatus =
  | { kind: 'error'; message: string }
  | { kind: 'connected'; version: number; deckFound: boolean; noteType: NoteTypeStatus };

export function fieldDrift(configured: readonly string[], live: readonly string[]): FieldDrift {
  return {
    missing: configured.filter((name) => !live.includes(name)),
    unexpected: live.filter((name) => !configured.includes(name)),
  };
}

export async function getStatus(anki: AnkiClient, config: Config): Promise<AnkiStatus> {
  try {
    const [version, decks, noteTypes] = await Promise.all([
      anki('version'),
      anki('deckNames'),
      anki('modelNames'),
    ]);
    const deckFound = decks.includes(config.anki.deck);
    if (!noteTypes.includes(config.anki.noteType)) {
      return { kind: 'connected', version, deckFound, noteType: { found: false } };
    }

    const fields = await anki('modelFieldNames', { modelName: config.anki.noteType });
    const drift = fieldDrift(Object.values(config.fields), fields);
    return { kind: 'connected', version, deckFound, noteType: { found: true, fields, drift } };
  } catch (error) {
    if (error instanceof AnkiError) return { kind: 'error', message: error.message };
    throw error;
  }
}

export type ExistingNote = { noteId: number; unpointed: string; pointed: string };

export type Existing = { exact: ExistingNote[]; related: ExistingNote[] };

export function sortExisting(notes: readonly NoteInfo[], config: Config, key: string): Existing {
  const existing = notes.map((note) => ({
    noteId: note.noteId,
    unpointed: htmlToText(note.fields[config.fields.unpointed]?.value ?? ''),
    pointed: htmlToText(note.fields[config.fields.pointed]?.value ?? ''),
  }));
  const exact = existing.filter((note) => toKey(note.unpointed) === key);
  return { exact, related: existing.filter((note) => !exact.includes(note)) };
}

export async function findExisting(
  anki: AnkiClient,
  config: Config,
  word: string,
): Promise<Existing> {
  const key = toKey(word);
  if (key === '') return { exact: [], related: [] };

  const query = `${noteTypeIs(config.anki.noteType)} ${fieldContainsKey(config.fields.unpointed, key)}`;
  const noteIds = await anki('findNotes', { query });
  if (noteIds.length === 0) return { exact: [], related: [] };

  return sortExisting(await anki('notesInfo', { notes: noteIds }), config, key);
}
