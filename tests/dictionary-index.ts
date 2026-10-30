import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex } from '#lib/server/dictionary/build.ts';
import type { DictionaryPaths } from '#lib/server/dictionary/files.ts';

export const DICTIONARY_FIXTURE = fileURLToPath(
  new URL('./fixtures/kaikki/hebrew.jsonl', import.meta.url),
);

/** An index built from the fixture dictionary, as from the real one, in a directory of its own. */
export async function buildFixtureIndex(): Promise<DictionaryPaths & { remove: () => void }> {
  const directory = mkdtempSync(join(tmpdir(), 'hebrew-index-'));
  const paths = {
    source: join(directory, 'hebrew.jsonl'),
    index: join(directory, 'hebrew.sqlite'),
  };
  copyFileSync(DICTIONARY_FIXTURE, paths.source);
  await buildIndex(paths);
  return { ...paths, remove: () => rmSync(directory, { recursive: true }) };
}
