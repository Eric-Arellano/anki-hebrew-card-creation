import { describe, expect, test } from 'vitest';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { getAnkiStatus } from './anki-status.ts';

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
