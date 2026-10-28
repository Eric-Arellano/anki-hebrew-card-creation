import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test, vi } from 'vitest';
import { fakeAnki, unreachable } from '../../../../../tests/fake-anki.ts';
import kelevChatulDagNotes from '../../../../../tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};
import { GET } from './+server.ts';

const connection = vi.hoisted(() => ({ anki: undefined as unknown }));
vi.mock('#lib/server/anki-connection.ts', () => connection);

function get(query: string) {
  return GET({ url: new URL(`http://127.0.0.1:5173/api/anki/existing${query}`) } as never);
}

describe('GET /api/anki/existing', () => {
  test('answers with the matches for the word', async () => {
    const dagNotes = kelevChatulDagNotes.filter((note) => note.fields.Hebrew.value === 'דג');
    connection.anki = fakeAnki({
      findNotes: () => dagNotes.map((note) => note.noteId),
      notesInfo: () => dagNotes,
    }).anki;
    const response = await get(`?word=${encodeURIComponent('דג')}`);
    expect(await response.json()).toEqual({
      exactMatches: [{ noteId: 1751714182456, unpointed: 'דג', pointed: 'דָּג' }],
      relatedMatches: [],
    });
  });

  test('answers 400 without a word', async () => {
    connection.anki = fakeAnki({}).anki;
    await expect(get('')).rejects.toSatisfy((error) => isHttpError(error, 400));
  });

  test('answers 502 when Anki is closed', async () => {
    connection.anki = fakeAnki({ findNotes: unreachable }).anki;
    await expect(get('?word=x')).rejects.toSatisfy(
      (error) =>
        isHttpError(error, 502) &&
        error.body.message === "Can't reach AnkiConnect at http://127.0.0.1:8765. Is Anki open?",
    );
  });
});
