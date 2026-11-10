// Our `/api/forvo/` endpoints: what each answers, and the browser's one way to call each. The reply
// types live here rather than beside the server code that builds them, so the browser never
// imports from `#lib/server/`.
import { getBlob, getJson } from '#lib/api/http.ts';

/** A pronunciation in Downloads, and the name to store it under, without a browser's ` (1)`. */
export type ForvoDownload = { filename: string; storeAs: string };

export type ForvoDownloads =
  | { kind: 'found'; downloads: ForvoDownload[] }
  | { kind: 'unreadable'; message: string };

/** The pronunciations of `word` in Downloads. */
export function fetchForvoDownloads(word: string): Promise<ForvoDownloads> {
  return getJson(`/api/forvo/downloads?word=${encodeURIComponent(word)}`);
}

export function forvoDownloadUrl(filename: string): string {
  return `/api/forvo/downloads/file?filename=${encodeURIComponent(filename)}`;
}

/** The download's bytes, as a file named for storing. */
export async function fetchForvoDownload({ filename, storeAs }: ForvoDownload): Promise<File> {
  const blob = await getBlob(forvoDownloadUrl(filename));
  return new File([blob], storeAs, { type: 'audio/mpeg' });
}
