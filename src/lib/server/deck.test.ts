import { describe, expect, test } from 'vitest';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import bayitNotes from '#tests/fixtures/anki/notes-info-bayit.json' with { type: 'json' };
import kelevChatulDagNotes from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};
import type { NoteInfo } from './anki.ts';
import { findExistingNotes, getAnkiStatus } from './deck.ts';

// `&nbsp;` in a field decodes to this, not to a space.
const NBSP = String.fromCodePoint(0xa0);

describe('getAnkiStatus', () => {
  function connectedAnkiWithFields(liveFieldNames: string[]) {
    return fakeAnki({
      version: () => 6,
      deckNames: () => ['Default', 'עברית'],
      modelNames: () => ['Basic', 'Hebrew'],
      modelFieldNames: () => liveFieldNames,
    });
  }

  describe('when Anki matches the note type', () => {
    test('reports the live fields and no drift', async () => {
      const { anki, calls } = connectedAnkiWithFields(fieldNames);
      expect(await getAnkiStatus(anki)).toEqual({
        kind: 'connected',
        ankiConnectVersion: 6,
        deckFound: true,
        noteType: {
          found: true,
          liveFieldNames: fieldNames,
          drift: { missingFromAnki: [], unexpectedInAnki: [] },
        },
      });
      expect(calls).toContainEqual({ action: 'modelFieldNames', params: { modelName: 'Hebrew' } });
    });
  });

  describe('when a field has been renamed in Anki', () => {
    test('names the field on both sides', async () => {
      const fieldNamesWithNotesRenamed = fieldNames.map((name) =>
        name === 'Notes' ? 'Comments' : name,
      );
      const { anki } = connectedAnkiWithFields(fieldNamesWithNotesRenamed);
      expect(await getAnkiStatus(anki)).toEqual({
        kind: 'connected',
        ankiConnectVersion: 6,
        deckFound: true,
        noteType: {
          found: true,
          liveFieldNames: fieldNamesWithNotesRenamed,
          drift: { missingFromAnki: ['Notes'], unexpectedInAnki: ['Comments'] },
        },
      });
    });
  });

  describe('when the deck and note type are missing', () => {
    test('says so without asking for fields', async () => {
      const { anki, calls } = fakeAnki({
        version: () => 6,
        deckNames: () => ['Default'],
        modelNames: () => ['Basic'],
      });
      expect(await getAnkiStatus(anki)).toEqual({
        kind: 'connected',
        ankiConnectVersion: 6,
        deckFound: false,
        noteType: { found: false },
      });
      expect(calls.map((call) => call.action)).not.toContain('modelFieldNames');
    });
  });

  describe('when Anki is closed', () => {
    test('reports the error', async () => {
      expect(await getAnkiStatus(closedAnki)).toEqual({
        kind: 'error',
        message: "Can't reach AnkiConnect at http://127.0.0.1:8765. Is Anki open?",
      });
    });
  });

  describe('when something other than Anki fails', () => {
    test('rethrows', async () => {
      const { anki } = fakeAnki({
        version: () => {
          throw new TypeError('bug');
        },
        deckNames: () => ['Default'],
        modelNames: () => ['Basic'],
      });
      await expect(getAnkiStatus(anki)).rejects.toThrow(new TypeError('bug'));
    });
  });
});

describe('findExistingNotes', () => {
  function ankiWithNotes(notes: NoteInfo[]) {
    return fakeAnki({
      findNotes: () => notes.map((note) => note.noteId),
      notesInfo: ({ notes: requestedIds }) =>
        notes.filter((note) => requestedIds.includes(note.noteId)),
    });
  }

  const kelevNotes = kelevChatulDagNotes.filter((note) => note.fields.Hebrew.value === 'כלב');

  describe('when the word has its own note', () => {
    test('finds it as an exact match', async () => {
      const { anki, calls } = ankiWithNotes(kelevNotes);
      expect(await findExistingNotes(anki, 'כלב')).toEqual({
        exactMatches: [{ noteId: 1751686072898, unpointed: 'כלב', pointed: 'כֶּלֶב' }],
        relatedMatches: [],
      });
      expect(calls[0]).toEqual({
        action: 'findNotes',
        params: { query: '"note:Hebrew" "Hebrew:*כלב*"' },
      });
    });

    test('finds it from pointed input', async () => {
      const { anki, calls } = ankiWithNotes(kelevNotes);
      expect((await findExistingNotes(anki, ' כֶּלֶב ')).exactMatches).toHaveLength(1);
      expect(calls[0]?.params).toEqual({ query: '"note:Hebrew" "Hebrew:*כלב*"' });
    });
  });

  describe('when other notes contain the word', () => {
    test('lists them as related matches', async () => {
      const { anki } = ankiWithNotes(bayitNotes);
      expect(await findExistingNotes(anki, 'בית')).toEqual({
        exactMatches: [
          { noteId: 1752114960166, unpointed: 'בית', pointed: `(ms) בַּיִת (mp)${NBSP}בָּתִּים` },
        ],
        relatedMatches: [
          { noteId: 1752426864218, unpointed: 'בית משפט', pointed: 'בֵּית מִשְׁפָּט' },
          {
            noteId: 1752427043636,
            unpointed: 'בית ספר',
            pointed: `[ms] בֵּית סֵפֶר [ps]${NBSP}בָּתֵּי סֵפֶר`,
          },
          { noteId: 1752428275813, unpointed: 'בית חולים', pointed: 'בֵּית חוֹלִים' },
          { noteId: 1752428348888, unpointed: 'בית כנסת', pointed: 'בֵּית כְּנֶסֶת' },
        ],
      });
    });
  });

  describe('when nothing matches', () => {
    test('does not ask for note details', async () => {
      const { anki, calls } = ankiWithNotes([]);
      expect(await findExistingNotes(anki, 'זזזז')).toEqual({
        exactMatches: [],
        relatedMatches: [],
      });
      expect(calls.map((call) => call.action)).toEqual(['findNotes']);
    });
  });

  describe('when the word is blank', () => {
    test('asks Anki nothing', async () => {
      const { anki, calls } = ankiWithNotes(kelevChatulDagNotes);
      expect(await findExistingNotes(anki, ' ')).toEqual({
        exactMatches: [],
        relatedMatches: [],
      });
      expect(calls).toEqual([]);
    });
  });
});
