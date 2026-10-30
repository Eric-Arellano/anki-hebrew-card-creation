// `npm run build-index`: indexes the dictionary the human downloaded into data/, for lookups.
import { buildIndex } from '#lib/server/dictionary/build.ts';
import { DICTIONARY_PATHS } from '#lib/server/dictionary/files.ts';

const started = performance.now();
const { entries, unreadableLines } = await buildIndex(DICTIONARY_PATHS);
const seconds = ((performance.now() - started) / 1000).toFixed(1);
console.log(`Indexed ${entries} entries into ${DICTIONARY_PATHS.index} in ${seconds}s.`);
if (unreadableLines > 0) {
  console.warn(
    `Skipped ${unreadableLines} lines that weren't Hebrew entries in the expected shape.`,
  );
}
