import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test, vi } from 'vitest';
import { fakeAnki, unreachable } from '../../../../../tests/fake-anki.ts';
import { POST } from './+server.ts';

const connection = vi.hoisted(() => ({ anki: undefined as unknown }));
vi.mock('#lib/server/anki-connection.ts', () => connection);

function post(body: string) {
  const request = new Request('http://127.0.0.1:5173/api/anki/browse', { method: 'POST', body });
  return POST({ request } as never);
}

describe('POST /api/anki/browse', () => {
  test('opens the Browse window on the notes', async () => {
    const fake = fakeAnki({ guiBrowse: () => [1751686072899] });
    connection.anki = fake.anki;
    const response = await post(JSON.stringify({ noteIds: [1751686072898, 1751714132957] }));
    expect(response.status).toBe(204);
    expect(fake.calls).toEqual([
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
      const fake = fakeAnki({ guiBrowse: () => [] });
      connection.anki = fake.anki;
      await expect(post(body)).rejects.toSatisfy((error) => isHttpError(error, 400));
      expect(fake.calls).toEqual([]);
    });
  });

  test('answers 502 when Anki is closed', async () => {
    connection.anki = fakeAnki({ guiBrowse: unreachable }).anki;
    await expect(post('{"noteIds": [1751686072898]}')).rejects.toSatisfy((error) =>
      isHttpError(error, 502),
    );
  });
});
