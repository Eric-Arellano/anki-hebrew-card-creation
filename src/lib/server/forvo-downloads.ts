// Finds the pronunciations the human downloaded from Forvo. It reads one directory and never
// writes to it, and it serves only a name from that directory's own listing, so no request path
// ever reaches the filesystem.
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ForvoDownload, ForvoDownloads } from '#lib/api/forvo.ts';
import { toComparisonKey } from '#lib/hebrew/normalize.ts';

export const DOWNLOADS_DIRECTORY = process.env.FORVO_DOWNLOADS ?? join(homedir(), 'Downloads');

// Forvo names a download `pronunciation_he_<word>.mp3`, with `_` for each space, and a browser
// saving a name again adds ` (1)`. A download still in progress, `….mp3.crdownload`, never matches.
const FORVO_FILENAME = /^(pronunciation_he_(.+?))(?: \(\d+\))?\.mp3$/;

/** `filename` as a download of `word`, or `undefined` if it is anything else. */
export function forvoDownloadOf(filename: string, word: string): ForvoDownload | undefined {
  const [, stem, spelled] = FORVO_FILENAME.exec(filename) ?? [];
  if (stem === undefined || spelled === undefined) return undefined;
  // A few of Forvo's words are pointed, like `מָלוֹן`, and macOS may hand back either Unicode form.
  if (toComparisonKey(spelled.replaceAll('_', ' ')) !== toComparisonKey(word)) return undefined;
  return { filename, storeAs: `${stem}.mp3` };
}

type Listing = { kind: 'listed'; filenames: string[] } | { kind: 'unreadable'; message: string };

async function forvoFilenamesIn(directory: string): Promise<Listing> {
  try {
    const filenames = await readdir(directory);
    return { kind: 'listed', filenames: filenames.filter((name) => FORVO_FILENAME.test(name)) };
  } catch (cause) {
    const code = (cause as NodeJS.ErrnoException).code;
    // macOS asks before a process reads Downloads, and refuses quietly once denied.
    if (code === 'EPERM' || code === 'EACCES') {
      return {
        kind: 'unreadable',
        message: `Can't read ${directory}. Allow your terminal to in System Settings, under Privacy & Security, then Files and Folders.`,
      };
    }
    if (code === 'ENOENT') {
      return {
        kind: 'unreadable',
        message: `${directory} doesn't exist. Set FORVO_DOWNLOADS to where your browser saves downloads.`,
      };
    }
    throw cause;
  }
}

/** The downloads of `word` in `directory`, in name order. */
export async function findForvoDownloads(directory: string, word: string): Promise<ForvoDownloads> {
  const listing = await forvoFilenamesIn(directory);
  if (listing.kind === 'unreadable') return listing;
  return {
    kind: 'found',
    downloads: listing.filenames.toSorted().flatMap((name) => forvoDownloadOf(name, word) ?? []),
  };
}

export type ForvoFile =
  | { kind: 'read'; bytes: Uint8Array<ArrayBuffer> }
  | { kind: 'not-listed' }
  | { kind: 'unreadable'; message: string };

/** The bytes of `filename`, only if `directory` lists it as a Forvo download. */
export async function readForvoDownload(directory: string, filename: string): Promise<ForvoFile> {
  const listing = await forvoFilenamesIn(directory);
  if (listing.kind === 'unreadable') return listing;
  if (!listing.filenames.includes(filename)) return { kind: 'not-listed' };
  return { kind: 'read', bytes: await readFile(join(directory, filename)) };
}
