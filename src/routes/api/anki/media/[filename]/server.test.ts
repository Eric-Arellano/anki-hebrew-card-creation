import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import { _readMedia } from './+server.ts';

const BYTES = 'not really an image';

function ankiHolding(data: string | false) {
  return fakeAnki({ retrieveMediaFile: () => data });
}

describe('_readMedia', () => {
  test('answers with the bytes, as a file no other site may load or run', async () => {
    const { anki, calls } = ankiHolding(btoa(BYTES));
    const response = await _readMedia(anki, 'cat2-1024x676.jpg');
    expect(await response.text()).toBe(BYTES);
    expect(Object.fromEntries(response.headers)).toEqual({
      'cache-control': 'no-store',
      'content-security-policy': 'sandbox',
      'content-type': 'image/jpeg',
      'cross-origin-resource-policy': 'same-origin',
      'x-content-type-options': 'nosniff',
    });
    expect(calls).toEqual([
      { action: 'retrieveMediaFile', params: { filename: 'cat2-1024x676.jpg' } },
    ]);
  });

  test.each([
    ['Synagogue_Plzen_087.JPG', 'image/jpeg'],
    ['a.jpeg', 'image/jpeg'],
    ['a.png', 'image/png'],
    ['a.webp', 'image/webp'],
    ['pronunciation_he_דג.mp3', 'audio/mpeg'],
  ])('serves %s as %s', async (filename, contentType) => {
    const response = await _readMedia(ankiHolding(btoa(BYTES)).anki, filename);
    expect(response.headers.get('content-type')).toBe(contentType);
  });

  describe('when the file is of a kind the deck does not hold', () => {
    test.each([
      ['an SVG, which can run script', 'a.svg'],
      ['an HTML file', 'a.html'],
      ['a name that only contains an allowed extension', 'a.jpg.html'],
      ['an extension and no name', '.jpg'],
      ['no extension', 'jpg'],
      ['a path', '../a.jpg'],
      ['a Windows path', '..\\a.jpg'],
      ['an extension Object.prototype has', 'a.constructor'],
    ])('answers 400 to %s without calling Anki', async (_, filename) => {
      const { anki, calls } = ankiHolding(btoa(BYTES));
      await expect(_readMedia(anki, filename)).rejects.toSatisfy((error) =>
        isHttpError(error, 400),
      );
      expect(calls).toEqual([]);
    });
  });

  describe('when the media folder has no such file', () => {
    test('answers 404', async () => {
      await expect(_readMedia(ankiHolding(false).anki, 'a.jpg')).rejects.toSatisfy((error) =>
        isHttpError(error, 404),
      );
    });
  });

  describe('when Anki is closed', () => {
    test('answers 502', async () => {
      await expect(_readMedia(closedAnki, 'a.jpg')).rejects.toSatisfy((error) =>
        isHttpError(error, 502),
      );
    });
  });
});
