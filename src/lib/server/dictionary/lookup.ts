import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { DictionaryLookup } from '#lib/api/dictionary.ts';
import {
  hasNiqqud,
  isSamePointedText,
  toDefectiveKey,
  toLookupKey,
} from '#lib/hebrew/normalize.ts';
import { toCandidates } from '#lib/server/dictionary/candidate.ts';
import { type Entry, entriesTitled, entriesWithKey } from '#lib/server/dictionary/entries.ts';
import {
  type DictionaryPaths,
  INDEX_SCHEMA_VERSION,
  sourceStamp,
} from '#lib/server/dictionary/files.ts';

/** The index is missing or was built by older code; the message says how to fix it. */
export class DictionaryUnavailableError extends Error {
  override name = 'DictionaryUnavailableError';
}

const BUILD_COMMAND = 'npm run build-index';

// Following form-of and alt-of targets this deep finds every lemma in the dictionary; a cycle in
// the data must not loop.
const MAX_TARGET_DEPTH = 3;

/** What `read` returns, given the index at `paths.index`, which it then closes. */
export function withDictionary<T>(
  paths: DictionaryPaths,
  read: (db: DatabaseSync, staleIndex: boolean) => T,
): T {
  if (!existsSync(paths.index)) {
    throw new DictionaryUnavailableError(`There's no dictionary index yet. Run ${BUILD_COMMAND}.`);
  }
  const db = new DatabaseSync(paths.index, { readOnly: true });
  try {
    const meta = new Map(
      db
        .prepare('SELECT name, value FROM meta')
        .all()
        .map((row) => [String(row.name), String(row.value)]),
    );
    if (meta.get('schema_version') !== INDEX_SCHEMA_VERSION) {
      throw new DictionaryUnavailableError(
        `The dictionary index was built by an older version of this tool. Run ${BUILD_COMMAND}.`,
      );
    }
    // A missing source isn't stale: the human may have deleted the large file once indexed.
    const stamp = sourceStamp(paths.source);
    return read(db, stamp !== undefined && stamp !== meta.get('source_stamp'));
  } finally {
    db.close();
  }
}

/**
 * The lemmas `word` may be: those with a spelling whose key is `word`'s, following a plural or
 * another form to its lemma; else, labelled possible, those whose defective key is `word`'s.
 */
export function lookUp(db: DatabaseSync, word: string, staleIndex: boolean): DictionaryLookup {
  const key = toLookupKey(word);
  const titleHasEntry = key !== '' && entriesTitled(db, key).length > 0;
  const reply = { titleHasEntry, staleIndex };
  if (key === '') return { ...reply, match: 'exact', candidates: [] };

  const exact = lemmasOf(db, entriesWithKey(db, 'key', key));
  if (exact.length > 0) return { ...reply, match: 'exact', candidates: toCandidates(db, exact) };
  const possible = lemmasOf(db, entriesWithKey(db, 'defective_key', toDefectiveKey(word)));
  return { ...reply, match: 'possible', candidates: toCandidates(db, possible) };
}

// The entries that are lemmas, then the lemmas their form-of and alt-of targets lead to, so that
// `בית`'s own homographs come before what its abbreviations stand for.
function lemmasOf(db: DatabaseSync, entries: readonly Entry[], depth = 0): Entry[] {
  const targets =
    depth < MAX_TARGET_DEPTH
      ? entries.flatMap((entry) =>
          [...entry.facts.formOf, ...entry.facts.altOf].flatMap((target) =>
            entriesForTarget(db, target),
          ),
        )
      : [];
  const lemmas = [
    ...entries.filter((entry) => entry.is_lemma),
    ...(targets.length > 0 ? lemmasOf(db, targets, depth + 1) : []),
  ];
  return lemmas.filter(
    (lemma, index) => lemmas.findIndex((other) => other.id === lemma.id) === index,
  );
}

// An alt-of target is a ktiv male title. A form-of target may be pointed, which tells `עִיר`
// (city) from `עַיִר` (donkey foal), both titled `עיר`; a bare one leaves every entry so titled.
function entriesForTarget(db: DatabaseSync, target: string): Entry[] {
  const titled = entriesTitled(db, target);
  if (!hasNiqqud(target)) return titled;
  const pointedAlike = titled.filter(
    (entry) => entry.pointed !== null && isSamePointedText(entry.pointed, target),
  );
  return pointedAlike.length > 0 ? pointedAlike : titled;
}
