import { describe, expect, test, vi } from 'vitest';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { AnkiError, createAnkiClient } from './anki-client.ts';

const ANKI_URL = 'http://127.0.0.1:8765';

function stubFetchReplyingWith(body: unknown, status = 200) {
  const fetch = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function firstRequestBody(fetch: ReturnType<typeof stubFetchReplyingWith>): unknown {
  const init = fetch.mock.calls[0]?.at(1) as RequestInit | undefined;
  return JSON.parse(String(init?.body));
}

describe('createAnkiClient', () => {
  describe('when AnkiConnect answers', () => {
    test('posts the action, version 6 and params, and returns the result', async () => {
      const fetch = stubFetchReplyingWith({ result: fieldNames, error: null });
      const anki = createAnkiClient(ANKI_URL);

      expect(await anki('modelFieldNames', { modelName: 'Hebrew' })).toEqual(fieldNames);
      expect(fetch).toHaveBeenCalledWith(
        ANKI_URL,
        expect.objectContaining({ method: 'POST', redirect: 'error' }),
      );
      expect(firstRequestBody(fetch)).toEqual({
        action: 'modelFieldNames',
        version: 6,
        params: { modelName: 'Hebrew' },
      });
    });

    test('rejects with what AnkiConnect said when it refuses', async () => {
      stubFetchReplyingWith({ result: null, error: 'model was not found: No such note type' });
      await expect(
        createAnkiClient(ANKI_URL)('modelFieldNames', {
          modelName: 'No such note type',
        }),
      ).rejects.toThrow(
        new AnkiError(
          'AnkiConnect refused modelFieldNames: model was not found: No such note type',
        ),
      );
    });

    test('rejects a result of the wrong shape', async () => {
      stubFetchReplyingWith({ result: 'six', error: null });
      await expect(createAnkiClient(ANKI_URL)('version')).rejects.toThrow(
        new AnkiError('AnkiConnect sent an unexpected result for version'),
      );
    });

    test('rejects a reply that is not an AnkiConnect envelope', async () => {
      vi.stubGlobal('fetch', async () => new Response('<html>'));
      await expect(createAnkiClient(ANKI_URL)('version')).rejects.toThrow(
        new AnkiError('AnkiConnect sent an unexpected reply to version'),
      );
    });

    test('rejects an HTTP error', async () => {
      stubFetchReplyingWith({}, 403);
      await expect(createAnkiClient(ANKI_URL)('version')).rejects.toThrow(
        new AnkiError('AnkiConnect answered 403 to version'),
      );
    });
  });

  describe('when Anki is closed', () => {
    test('rejects saying so', async () => {
      vi.stubGlobal('fetch', async () => {
        throw new TypeError('fetch failed');
      });
      await expect(createAnkiClient(ANKI_URL)('version')).rejects.toThrow(
        new AnkiError("Can't reach AnkiConnect at http://127.0.0.1:8765. Is Anki open?"),
      );
    });
  });

  describe('when the action is not allowlisted', () => {
    test('rejects without sending anything', async () => {
      const fetch = stubFetchReplyingWith({ result: null, error: null });
      const anki = createAnkiClient(ANKI_URL);
      // @ts-expect-error The types refuse it too.
      await expect(anki('deleteNotes', { notes: [1751686072898] })).rejects.toThrow(
        new AnkiError('AnkiConnect action not allowed: deleteNotes'),
      );
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
