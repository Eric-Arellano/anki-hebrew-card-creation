import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import { _openAddWindow } from './+server.ts';

function postRequest(body: string) {
  return new Request('http://127.0.0.1:5173/api/anki/add', { method: 'POST', body });
}

describe('_openAddWindow', () => {
  test('opens the Add window with the deck, note type and tags', async () => {
    const { anki, calls } = fakeAnki({ guiAddCards: () => null });
    const fields = { Hebrew: 'דג', Pointed: 'דָּג', Definitions: 'fish' };
    const response = await _openAddWindow(anki, postRequest(JSON.stringify({ fields })));
    expect(response.status).toBe(204);
    expect(calls).toEqual([
      {
        action: 'guiAddCards',
        params: { note: { deckName: 'עברית', modelName: 'Hebrew', fields, tags: [] } },
      },
    ]);
  });

  describe('when the body is wrong', () => {
    test.each([
      ['a field the note type does not name', '{"fields": {"Hebrew": "דג", "Tags": "x"}}'],
      ['a value that is not text', '{"fields": {"Hebrew": 1}}'],
      ['an extra key', '{"fields": {"Hebrew": "דג"}, "deckName": "Default"}'],
      ['no fields', '{}'],
      ['a body that is not JSON', 'Hebrew=דג'],
    ])('answers 400 to %s without calling Anki', async (_, body) => {
      const { anki, calls } = fakeAnki({ guiAddCards: () => null });
      await expect(_openAddWindow(anki, postRequest(body))).rejects.toSatisfy((error) =>
        isHttpError(error, 400),
      );
      expect(calls).toEqual([]);
    });
  });

  describe('when Anki is closed', () => {
    test('answers 502', async () => {
      await expect(
        _openAddWindow(closedAnki, postRequest('{"fields": {"Hebrew": "דג"}}')),
      ).rejects.toSatisfy((error) => isHttpError(error, 502));
    });
  });
});
