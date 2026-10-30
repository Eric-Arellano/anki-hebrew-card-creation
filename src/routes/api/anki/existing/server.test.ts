import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import kelevChatulDagNotes from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};
import { _findExisting } from './+server.ts';

function existingUrl(query: string) {
  return new URL(`http://127.0.0.1:5173/api/anki/existing${query}`);
}

describe('_findExisting', () => {
  test('answers with the matches for the word', async () => {
    const dagNotes = kelevChatulDagNotes.filter((note) => note.fields.Hebrew.value === 'דג');
    const { anki } = fakeAnki({
      findNotes: () => dagNotes.map((note) => note.noteId),
      notesInfo: () => dagNotes,
    });
    const response = await _findExisting(anki, existingUrl(`?word=${encodeURIComponent('דג')}`));
    expect(await response.json()).toEqual({
      exactMatches: [{ noteId: 1751714182456, unpointed: 'דג', pointed: 'דָּג' }],
      relatedMatches: [],
    });
  });

  describe('with several words', () => {
    test('searches for each', async () => {
      const { anki, calls } = fakeAnki({ findNotes: () => [] });
      await _findExisting(anki, existingUrl(`?word=${encodeURIComponent('לדבר')}&word=x`));
      expect(calls[0]?.params).toEqual({
        query: '"note:Hebrew" ("Hebrew:*לדבר*" OR "Hebrew:*x*")',
      });
    });
  });

  describe('without a word', () => {
    test('answers 400 without calling Anki', async () => {
      const { anki, calls } = fakeAnki({});
      await expect(_findExisting(anki, existingUrl(''))).rejects.toSatisfy((error) =>
        isHttpError(error, 400),
      );
      expect(calls).toEqual([]);
    });
  });

  describe('when Anki is closed', () => {
    test('answers 502 with the reason', async () => {
      await expect(_findExisting(closedAnki, existingUrl('?word=x'))).rejects.toSatisfy(
        (error) =>
          isHttpError(error, 502) &&
          error.body.message === "Can't reach AnkiConnect at http://127.0.0.1:8765. Is Anki open?",
      );
    });
  });
});
