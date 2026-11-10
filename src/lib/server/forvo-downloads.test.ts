import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { findForvoDownloads, forvoDownloadOf, readForvoDownload } from './forvo-downloads.ts';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'forvo-downloads-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true });
});

async function download(...filenames: string[]) {
  await Promise.all(filenames.map((name) => writeFile(join(directory, name), `bytes of ${name}`)));
}

describe('forvoDownloadOf', () => {
  test('stores a download under its own name', () => {
    expect(forvoDownloadOf('pronunciation_he_דג.mp3', 'דג')).toEqual({
      filename: 'pronunciation_he_דג.mp3',
      storeAs: 'pronunciation_he_דג.mp3',
    });
  });

  test("stores a browser's second copy without its suffix", () => {
    expect(forvoDownloadOf('pronunciation_he_דג (1).mp3', 'דג')).toEqual({
      filename: 'pronunciation_he_דג (1).mp3',
      storeAs: 'pronunciation_he_דג.mp3',
    });
  });

  test('reads an underscore as a space', () => {
    expect(forvoDownloadOf('pronunciation_he_בית_ספר.mp3', 'בית ספר')?.storeAs).toBe(
      'pronunciation_he_בית_ספר.mp3',
    );
  });

  test('matches a pointed name to the word as typed', () => {
    expect(forvoDownloadOf('pronunciation_he_מָלוֹן.mp3', 'מלון')?.storeAs).toBe(
      'pronunciation_he_מָלוֹן.mp3',
    );
  });

  test('matches a decomposed name', () => {
    const decomposed = 'pronunciation_he_מָלוֹן.mp3'.normalize('NFD');
    expect(forvoDownloadOf(decomposed, 'מָלוֹן')?.filename).toBe(decomposed);
  });

  test.each([
    ['another word', 'pronunciation_he_דגל.mp3'],
    ['a download in progress', 'pronunciation_he_דג.mp3.crdownload'],
    ['another language', 'pronunciation_en_דג.mp3'],
    ['another file', 'דג.mp3'],
  ])('ignores %s', (_, filename) => {
    expect(forvoDownloadOf(filename, 'דג')).toBeUndefined();
  });
});

describe('findForvoDownloads', () => {
  test("lists the word's downloads in name order", async () => {
    await download(
      'pronunciation_he_דג (1).mp3',
      'pronunciation_he_דג.mp3',
      'pronunciation_he_דגל.mp3',
    );
    expect(await findForvoDownloads(directory, 'דג')).toEqual({
      kind: 'found',
      downloads: [
        { filename: 'pronunciation_he_דג (1).mp3', storeAs: 'pronunciation_he_דג.mp3' },
        { filename: 'pronunciation_he_דג.mp3', storeAs: 'pronunciation_he_דג.mp3' },
      ],
    });
  });

  describe('when the directory is missing', () => {
    test('says so, naming the setting', async () => {
      const missing = join(directory, 'missing');
      expect(await findForvoDownloads(missing, 'דג')).toEqual({
        kind: 'unreadable',
        message: `${missing} doesn't exist. Set FORVO_DOWNLOADS to where your browser saves downloads.`,
      });
    });
  });
});

describe('readForvoDownload', () => {
  test('reads a listed download', async () => {
    await download('pronunciation_he_דג.mp3');
    const file = await readForvoDownload(directory, 'pronunciation_he_דג.mp3');
    expect(file.kind === 'read' && Buffer.from(file.bytes).toString()).toBe(
      'bytes of pronunciation_he_דג.mp3',
    );
  });

  test.each([
    ['a file that is not a download', 'notes.txt'],
    ['a path out of the directory', '../pronunciation_he_דג.mp3'],
    ['a download that is not there', 'pronunciation_he_דגל.mp3'],
  ])('refuses %s', async (_, filename) => {
    await download('notes.txt');
    expect(await readForvoDownload(directory, filename)).toEqual({ kind: 'not-listed' });
  });
});
