import { existsSync, statSync } from 'node:fs';

export type DictionaryPaths = { source: string; index: string };

// Relative to the project root, where every npm script runs. The human downloads the source; the
// index is built from it by `npm run build-index`.
export const DICTIONARY_PATHS: DictionaryPaths = {
  source: 'data/kaikki.org-dictionary-Hebrew.jsonl',
  index: 'data/hebrew.sqlite',
};

/** What tells one download of the source from the next, or `undefined` while there is none. */
export function sourceStamp(source: string): string | undefined {
  if (!existsSync(source)) return undefined;
  const { size, mtimeMs } = statSync(source);
  return `${size} ${mtimeMs}`;
}
