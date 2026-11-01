import { isHttpError } from '@sveltejs/kit';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { buildFixtureIndex } from '#tests/dictionary-index.ts';
import { _lookUp } from './+server.ts';

let index: Awaited<ReturnType<typeof buildFixtureIndex>>;

beforeAll(async () => {
  index = await buildFixtureIndex();
});

afterAll(() => index.remove());

function lookupUrl(query: string) {
  return new URL(`http://127.0.0.1:5173/api/lookup${query}`);
}

describe('_lookUp', () => {
  test('answers with the word’s candidates', async () => {
    const response = _lookUp(index, lookupUrl(`?word=${encodeURIComponent('ערים')}`));
    expect(await response.json()).toMatchObject({
      match: 'exact',
      candidates: [{ title: 'עיר', pointed: 'עִיר' }],
      titleHasEntry: true,
      staleIndex: false,
    });
  });

  describe('without a word', () => {
    test('answers 400', () => {
      expect(() => _lookUp(index, lookupUrl(''))).toThrow(
        expect.toSatisfy((error) => isHttpError(error, 400)),
      );
    });
  });

  describe('without an index', () => {
    test('answers 503 with how to build one', () => {
      expect(() =>
        _lookUp({ ...index, index: `${index.index}.missing` }, lookupUrl('?word=x')),
      ).toThrow(
        expect.toSatisfy(
          (error) =>
            isHttpError(error, 503) &&
            error.body.message === "There's no dictionary index yet. Run npm run build-index.",
        ),
      );
    });
  });
});
