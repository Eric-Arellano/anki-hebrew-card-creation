import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import kelevChatulDagNotes from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};
import { realNote } from '#tests/real-notes.ts';
import { _readNote } from './+server.ts';

const kelev = kelevChatulDagNotes.find((note) => note.fields.Hebrew.value === 'כלב');
if (kelev === undefined) throw new Error('No fixture note for כלב');

describe('_readNote', () => {
  test('answers with the note, its fields keyed by Anki name', async () => {
    const { anki, calls } = fakeAnki({
      findNotes: () => [kelev.noteId],
      notesInfo: () => [kelev],
    });
    const response = await _readNote(anki, String(kelev.noteId));
    expect(await response.json()).toEqual({
      noteId: 1751686072898,
      mod: 1793575634,
      fields: realNote('כלב'),
    });
    expect(calls).toEqual([
      { action: 'findNotes', params: { query: '"note:Hebrew" nid:1751686072898' } },
      { action: 'notesInfo', params: { notes: [1751686072898] } },
    ]);
  });

  describe('when no note of the type has the id', () => {
    test('answers 404 without asking for its fields', async () => {
      const { anki, calls } = fakeAnki({ findNotes: () => [] });
      await expect(_readNote(anki, '1751686072898')).rejects.toSatisfy((error) =>
        isHttpError(error, 404),
      );
      expect(calls.map(({ action }) => action)).toEqual(['findNotes']);
    });
  });

  describe('when the id is not a note id', () => {
    test.each([
      ['a word', 'kelev'],
      ['a search', '1 OR deck:*'],
      ['a negative number', '-1'],
      ['zero', '0'],
      ['a leading zero', '01'],
      ['a fraction', '1.5'],
      ['a number past what JavaScript holds exactly', '9007199254740993'],
    ])('answers 400 to %s without calling Anki', async (_, noteId) => {
      const { anki, calls } = fakeAnki({});
      await expect(_readNote(anki, noteId)).rejects.toSatisfy((error) => isHttpError(error, 400));
      expect(calls).toEqual([]);
    });
  });

  describe('when Anki is closed', () => {
    test('answers 502 with the reason', async () => {
      await expect(_readNote(closedAnki, '1751686072898')).rejects.toSatisfy(
        (error) =>
          isHttpError(error, 502) &&
          error.body.message === "Can't reach AnkiConnect at http://127.0.0.1:8765. Is Anki open?",
      );
    });
  });
});
