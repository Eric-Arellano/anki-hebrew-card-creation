import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { closedAnki, fakeAnki } from '#tests/fake-anki.ts';
import { _storeMedia } from './+server.ts';

const DATA = btoa('not really an mp3');

function postRequest(body: string) {
  return new Request('http://127.0.0.1:5173/api/anki/media', { method: 'POST', body });
}

describe('_storeMedia', () => {
  test('never replaces an existing file, and answers with the name Anki used', async () => {
    const storedName = 'pronunciation_he_בית-adf6a331.mp3';
    const { anki, calls } = fakeAnki({ storeMediaFile: () => storedName });
    const response = await _storeMedia(
      anki,
      postRequest(JSON.stringify({ filename: 'pronunciation_he_בית.mp3', data: DATA })),
    );
    expect(await response.json()).toEqual({ filename: storedName });
    expect(calls).toEqual([
      {
        action: 'storeMediaFile',
        params: { filename: 'pronunciation_he_בית.mp3', data: DATA, deleteExisting: false },
      },
    ]);
  });

  describe('when the body is wrong', () => {
    test.each([
      ['an SVG, which can run script', { filename: 'a.svg', data: DATA }],
      ['an HTML file', { filename: 'a.html', data: DATA }],
      ['a name that only contains an allowed extension', { filename: 'a.jpg.html', data: DATA }],
      ['an extension and no name', { filename: '.jpg', data: DATA }],
      ['a path', { filename: '../a.jpg', data: DATA }],
      ['a Windows path', { filename: '..\\a.jpg', data: DATA }],
      ['data that is not base64', { filename: 'a.jpg', data: 'a b=' }],
      ['empty data', { filename: 'a.jpg', data: '' }],
      ['no data', { filename: 'a.jpg' }],
      ['a url instead of data', { filename: 'a.jpg', url: 'https://example.com/a.jpg' }],
      ['deleteExisting', { filename: 'a.jpg', data: DATA, deleteExisting: true }],
    ])('answers 400 to %s without calling Anki', async (_, body) => {
      const { anki, calls } = fakeAnki({ storeMediaFile: () => 'a.jpg' });
      await expect(_storeMedia(anki, postRequest(JSON.stringify(body)))).rejects.toSatisfy(
        (error) => isHttpError(error, 400),
      );
      expect(calls).toEqual([]);
    });
  });

  describe('when Anki is closed', () => {
    test('answers 502', async () => {
      await expect(
        _storeMedia(closedAnki, postRequest(JSON.stringify({ filename: 'a.jpg', data: DATA }))),
      ).rejects.toSatisfy((error) => isHttpError(error, 502));
    });
  });
});
