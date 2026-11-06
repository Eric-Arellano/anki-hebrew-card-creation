import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isHttpError } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { _findForvoDownloads } from './+server.ts';
import { _readForvoDownload } from './file/+server.ts';

const FILENAME = 'pronunciation_he_דג.mp3';
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'forvo-route-'));
  await writeFile(join(directory, FILENAME), 'mp3 bytes');
});

afterEach(async () => {
  await rm(directory, { recursive: true });
});

function url(path: string) {
  return new URL(`http://127.0.0.1:5173/api/forvo/downloads${path}`);
}

describe('_findForvoDownloads', () => {
  test('answers with the downloads of the word', async () => {
    const response = await _findForvoDownloads(directory, url(`?word=${encodeURIComponent('דג')}`));
    expect(await response.json()).toEqual({
      kind: 'found',
      downloads: [{ filename: FILENAME, storeAs: FILENAME }],
    });
  });

  describe('without a word', () => {
    test.each(['', '?word=', '?word=%20'])('answers 400 to %j', async (query) => {
      await expect(_findForvoDownloads(directory, url(query))).rejects.toSatisfy((error) =>
        isHttpError(error, 400),
      );
    });
  });
});

describe('_readForvoDownload', () => {
  test('answers with the bytes, as audio no other site may load', async () => {
    const response = await _readForvoDownload(
      directory,
      url(`/file?filename=${encodeURIComponent(FILENAME)}`),
    );
    expect(await response.text()).toBe('mp3 bytes');
    expect(Object.fromEntries(response.headers)).toEqual({
      'cache-control': 'no-store',
      'content-type': 'audio/mpeg',
      'cross-origin-resource-policy': 'same-origin',
      'x-content-type-options': 'nosniff',
    });
  });

  describe('when the file is not a listed download', () => {
    test('answers 404', async () => {
      await expect(
        _readForvoDownload(directory, url(`/file?filename=${encodeURIComponent('../a.mp3')}`)),
      ).rejects.toSatisfy((error) => isHttpError(error, 404));
    });
  });

  describe('when the directory is unreadable', () => {
    test('answers 503', async () => {
      await expect(
        _readForvoDownload(join(directory, 'missing'), url(`/file?filename=${FILENAME}`)),
      ).rejects.toSatisfy((error) => isHttpError(error, 503));
    });
  });

  describe('without a filename', () => {
    test('answers 400', async () => {
      await expect(_readForvoDownload(directory, url('/file'))).rejects.toSatisfy((error) =>
        isHttpError(error, 400),
      );
    });
  });
});
