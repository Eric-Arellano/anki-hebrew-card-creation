import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { AnkiRefusal } from '#lib/server/anki/client.ts';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import kelevChatulDagNotes from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};
import { realNote } from '#tests/real-notes.ts';
import { _addNote } from './+server.ts';

const kelev = (() => {
  const note = kelevChatulDagNotes.find(({ fields }) => fields.Hebrew.value === 'כלב');
  if (note === undefined) throw new Error('No fixture note for כלב');
  return note;
})();

function postRequest(body: string) {
  return new Request('http://127.0.0.1:5173/api/anki/notes', { method: 'POST', body });
}

// An Anki that adds every note as כלב, and answers with it once added.
function ankiAddingKelev(add: () => number = () => kelev.noteId) {
  return fakeAnki({
    addNote: add,
    findNotes: () => [kelev.noteId],
    notesInfo: () => [kelev],
  });
}

describe('_addNote', () => {
  test('adds the note to the deck, then answers with it as Anki holds it', async () => {
    const { anki, calls } = ankiAddingKelev();
    const fields = realNote('כלב');
    const response = await _addNote(
      anki,
      postRequest(JSON.stringify({ fields, allowDuplicate: false })),
    );
    expect(await response.json()).toEqual({ noteId: 1751686072898, mod: 1793575634, fields });
    expect(calls).toEqual([
      {
        action: 'addNote',
        params: {
          note: {
            deckName: 'Hebrew',
            modelName: 'Hebrew',
            fields,
            tags: [],
            options: { allowDuplicate: false },
          },
        },
      },
      { action: 'findNotes', params: { query: '"note:Hebrew" nid:1751686072898' } },
      { action: 'notesInfo', params: { notes: [1751686072898] } },
    ]);
  });

  test('passes on that a duplicate is allowed', async () => {
    const { anki, calls } = ankiAddingKelev();
    const body = { fields: { Hebrew: 'כלב' }, allowDuplicate: true };
    await _addNote(anki, postRequest(JSON.stringify(body)));
    expect(calls[0]?.params).toMatchObject({ note: { options: { allowDuplicate: true } } });
  });

  describe('when Anki refuses the note as a duplicate', () => {
    test('answers 409', async () => {
      const { anki, calls } = ankiAddingKelev(() => {
        throw new AnkiRefusal('addNote', 'cannot create note because it is a duplicate');
      });
      const body = { fields: { Hebrew: 'כלב' }, allowDuplicate: false };
      await expect(_addNote(anki, postRequest(JSON.stringify(body)))).rejects.toSatisfy((error) =>
        isHttpError(error, 409),
      );
      expect(calls.map(({ action }) => action)).toEqual(['addNote']);
    });
  });

  describe('when Anki refuses the note for another reason', () => {
    test('answers 502 with its reason', async () => {
      const { anki } = ankiAddingKelev(() => {
        throw new AnkiRefusal('addNote', 'cannot create note because it is empty');
      });
      const body = { fields: { Hebrew: '' }, allowDuplicate: false };
      await expect(_addNote(anki, postRequest(JSON.stringify(body)))).rejects.toSatisfy(
        (error) =>
          isHttpError(error, 502) &&
          error.body.message ===
            'AnkiConnect refused addNote: cannot create note because it is empty',
      );
    });
  });

  describe('when the body is wrong', () => {
    test.each([
      [
        'a field the note type does not name',
        '{"fields": {"Hebrew": "כלב", "Tags": "x"}, "allowDuplicate": false}',
      ],
      ['a value that is not text', '{"fields": {"Hebrew": 1}, "allowDuplicate": false}'],
      ['no allowDuplicate', '{"fields": {"Hebrew": "כלב"}}'],
      [
        'an extra key',
        '{"fields": {"Hebrew": "כלב"}, "allowDuplicate": false, "deckName": "Default"}',
      ],
      ['no fields', '{"allowDuplicate": false}'],
      ['a body that is not JSON', 'Hebrew=כלב'],
    ])('answers 400 to %s without calling Anki', async (_, body) => {
      const { anki, calls } = ankiAddingKelev();
      await expect(_addNote(anki, postRequest(body))).rejects.toSatisfy((error) =>
        isHttpError(error, 400),
      );
      expect(calls).toEqual([]);
    });
  });

  describe('when Anki is closed', () => {
    test('answers 502', async () => {
      const body = { fields: { Hebrew: 'כלב' }, allowDuplicate: false };
      await expect(_addNote(closedAnki, postRequest(JSON.stringify(body)))).rejects.toSatisfy(
        (error) => isHttpError(error, 502),
      );
    });
  });
});
