import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { AnkiError, type NoteInfo } from '#lib/server/anki/client.ts';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import kelevChatulDagNotes from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};
import { realNote } from '#tests/real-notes.ts';
import { _readNote, _saveNote } from './+server.ts';

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

function postRequest(body: string) {
  return new Request('http://127.0.0.1:5173/api/anki/notes/1751686072898', {
    method: 'POST',
    body,
  });
}

// An Anki holding only `note`, which applies each `updateNoteFields` to what `notesInfo` answers.
function ankiHolding(note: NoteInfo, update: () => null = () => null) {
  let held = note;
  return fakeAnki({
    findNotes: () => [note.noteId],
    notesInfo: () => [held],
    updateNoteFields: ({ note: { fields } }) => {
      const result = update();
      held = {
        ...held,
        mod: held.mod + 1,
        fields: Object.fromEntries(
          Object.entries(held.fields).map(([name, field]) => [
            name,
            { ...field, value: fields[name] ?? field.value },
          ]),
        ),
      };
      return result;
    },
  });
}

describe('_saveNote', () => {
  test('writes only the fields sent, then answers with the note as Anki holds it', async () => {
    const { anki, calls } = ankiHolding(kelev);
    const body = { fields: { 'Part of speech': 'noun' }, mod: kelev.mod };
    const response = await _saveNote(anki, String(kelev.noteId), postRequest(JSON.stringify(body)));
    expect(await response.json()).toEqual({
      noteId: 1751686072898,
      mod: 1793575635,
      fields: { ...realNote('כלב'), 'Part of speech': 'noun' },
    });
    expect(calls).toEqual([
      { action: 'findNotes', params: { query: '"note:Hebrew" nid:1751686072898' } },
      { action: 'notesInfo', params: { notes: [1751686072898] } },
      {
        action: 'updateNoteFields',
        params: { note: { id: 1751686072898, fields: { 'Part of speech': 'noun' } } },
      },
      { action: 'findNotes', params: { query: '"note:Hebrew" nid:1751686072898' } },
      { action: 'notesInfo', params: { notes: [1751686072898] } },
    ]);
  });

  describe('when the note changed in Anki since it loaded', () => {
    test('answers 409 without writing', async () => {
      const { anki, calls } = ankiHolding(kelev);
      const body = { fields: { 'Part of speech': 'noun' }, mod: kelev.mod - 1 };
      await expect(
        _saveNote(anki, String(kelev.noteId), postRequest(JSON.stringify(body))),
      ).rejects.toSatisfy((error) => isHttpError(error, 409));
      expect(calls.map(({ action }) => action)).not.toContain('updateNoteFields');
    });
  });

  describe('when no note of the type has the id', () => {
    test('answers 404 without writing', async () => {
      const { anki, calls } = fakeAnki({ findNotes: () => [] });
      const body = { fields: { 'Part of speech': 'noun' }, mod: kelev.mod };
      await expect(
        _saveNote(anki, String(kelev.noteId), postRequest(JSON.stringify(body))),
      ).rejects.toSatisfy((error) => isHttpError(error, 404));
      expect(calls.map(({ action }) => action)).toEqual(['findNotes']);
    });
  });

  describe('when the body is wrong', () => {
    test.each([
      ['a field the note type does not name', '{"fields": {"Tags": "x"}, "mod": 1793575634}'],
      ['no fields to change', '{"fields": {}, "mod": 1793575634}'],
      ['a value that is not text', '{"fields": {"Hebrew": 1}, "mod": 1793575634}'],
      ['no mod', '{"fields": {"Hebrew": "כלב"}}'],
      ['an extra key', '{"fields": {"Hebrew": "כלב"}, "mod": 1793575634, "tags": []}'],
      ['a body that is not JSON', 'Hebrew=כלב'],
    ])('answers 400 to %s without calling Anki', async (_, body) => {
      const { anki, calls } = ankiHolding(kelev);
      await expect(_saveNote(anki, String(kelev.noteId), postRequest(body))).rejects.toSatisfy(
        (error) => isHttpError(error, 400),
      );
      expect(calls).toEqual([]);
    });

    test('answers 400 to an id that is not a note id, without calling Anki', async () => {
      const { anki, calls } = ankiHolding(kelev);
      const body = { fields: { 'Part of speech': 'noun' }, mod: kelev.mod };
      await expect(
        _saveNote(anki, '1 OR deck:*', postRequest(JSON.stringify(body))),
      ).rejects.toSatisfy((error) => isHttpError(error, 400));
      expect(calls).toEqual([]);
    });
  });

  describe('when Anki refuses the write', () => {
    test('answers 502 with its reason', async () => {
      const { anki } = ankiHolding(kelev, () => {
        throw new AnkiError('AnkiConnect refused updateNoteFields: Close the affected editor');
      });
      const body = { fields: { 'Part of speech': 'noun' }, mod: kelev.mod };
      await expect(
        _saveNote(anki, String(kelev.noteId), postRequest(JSON.stringify(body))),
      ).rejects.toSatisfy(
        (error) =>
          isHttpError(error, 502) &&
          error.body.message === 'AnkiConnect refused updateNoteFields: Close the affected editor',
      );
    });
  });
});
