import { describe, expect, test, vi } from 'vitest';
import { fakeAnki, unreachable } from '../../../../../tests/fake-anki.ts';
import fieldNames from '../../../../../tests/fixtures/anki/model-field-names-hebrew.json' with {
  type: 'json',
};
import { GET } from './+server.ts';

const connection = vi.hoisted(() => ({ anki: undefined as unknown }));
vi.mock('#lib/server/anki-connection.ts', () => connection);

describe('GET /api/anki/status', () => {
  test('reports a connected Anki', async () => {
    connection.anki = fakeAnki({
      version: () => 6,
      deckNames: () => ['עברית'],
      modelNames: () => ['Hebrew'],
      modelFieldNames: () => fieldNames,
    }).anki;
    const response = await GET({} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      kind: 'connected',
      ankiConnectVersion: 6,
      deckFound: true,
      noteType: {
        found: true,
        liveFieldNames: fieldNames,
        drift: { missingFromAnki: [], unexpectedInAnki: [] },
      },
    });
  });

  test('answers 200 with the error when Anki is closed', async () => {
    connection.anki = fakeAnki({
      version: unreachable,
      deckNames: unreachable,
      modelNames: unreachable,
    }).anki;
    const response = await GET({} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      kind: 'error',
      message: "Can't reach AnkiConnect at http://127.0.0.1:8765. Is Anki open?",
    });
  });
});
