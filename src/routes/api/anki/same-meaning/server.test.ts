import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import mechonitOtoNotes from '#tests/fixtures/anki/notes-info-mechonit-oto.json' with {
  type: 'json',
};
import { _findSameMeaning } from './+server.ts';

function sameMeaningUrl(query: string) {
  return new URL(`http://127.0.0.1:5173/api/anki/same-meaning${query}`);
}

describe('_findSameMeaning', () => {
  test('answers with the other words for each meaning', async () => {
    const { anki } = fakeAnki({
      findNotes: () => mechonitOtoNotes.map((note) => note.noteId),
      notesInfo: () => mechonitOtoNotes,
    });
    const response = await _findSameMeaning(
      anki,
      sameMeaningUrl(`?meaning=car&word=${encodeURIComponent('אוטו')}`),
    );
    expect(await response.json()).toEqual([
      {
        noteId: 1751762491688,
        unpointed: 'מכונית',
        pointed: 'מְכוֹנִית',
        sharedMeanings: ['car'],
        productionContext: '',
      },
    ]);
  });

  describe('with several meanings', () => {
    test('searches for each', async () => {
      const { anki, calls } = fakeAnki({ findNotes: () => [] });
      await _findSameMeaning(anki, sameMeaningUrl('?meaning=car&meaning=to%20go'));
      expect(calls[0]?.params).toEqual({
        query: String.raw`"note:Hebrew" ("Definitions:re:\bcar\b" OR "Definitions:re:\bto(\s|&nbsp;)+go\b")`,
      });
    });
  });

  describe('without a meaning', () => {
    test('answers 400 without calling Anki', async () => {
      const { anki, calls } = fakeAnki({});
      await expect(_findSameMeaning(anki, sameMeaningUrl('?word=x'))).rejects.toSatisfy((error) =>
        isHttpError(error, 400),
      );
      expect(calls).toEqual([]);
    });
  });

  describe('when Anki is closed', () => {
    test('answers 502 with the reason', async () => {
      await expect(_findSameMeaning(closedAnki, sameMeaningUrl('?meaning=car'))).rejects.toSatisfy(
        (error) =>
          isHttpError(error, 502) &&
          error.body.message === "Can't reach AnkiConnect at http://127.0.0.1:8765. Is Anki open?",
      );
    });
  });
});
