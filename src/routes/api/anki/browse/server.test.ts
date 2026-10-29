import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import { _browseNotes } from './+server.ts';

function postRequest(body: string) {
  return new Request('http://127.0.0.1:5173/api/anki/browse', { method: 'POST', body });
}

describe('_browseNotes', () => {
  test('opens the Browse window on the notes', async () => {
    const { anki, calls } = fakeAnki({ guiBrowse: () => [1751686072899] });
    const response = await _browseNotes(
      anki,
      postRequest(JSON.stringify({ noteIds: [1751686072898, 1751714132957] })),
    );
    expect(response.status).toBe(204);
    expect(calls).toEqual([
      { action: 'guiBrowse', params: { query: 'nid:1751686072898,1751714132957' } },
    ]);
  });

  describe('when the body is wrong', () => {
    test.each([
      ['no note ids', '{"noteIds": []}'],
      ['a note id that is not an integer', '{"noteIds": [1.5]}'],
      ['a note id that is a string', '{"noteIds": ["1751686072898"]}'],
      ['a negative note id', '{"noteIds": [-1]}'],
      ['an extra key', '{"noteIds": [1751686072898], "query": "deck:*"}'],
      ['a body that is not JSON', 'nid:1'],
    ])('answers 400 to %s without calling Anki', async (_, body) => {
      const { anki, calls } = fakeAnki({ guiBrowse: () => [] });
      await expect(_browseNotes(anki, postRequest(body))).rejects.toSatisfy((error) =>
        isHttpError(error, 400),
      );
      expect(calls).toEqual([]);
    });
  });

  describe('when Anki is closed', () => {
    test('answers 502', async () => {
      await expect(
        _browseNotes(closedAnki, postRequest('{"noteIds": [1751686072898]}')),
      ).rejects.toSatisfy((error) => isHttpError(error, 502));
    });
  });
});
