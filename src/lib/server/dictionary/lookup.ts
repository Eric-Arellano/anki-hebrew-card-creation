import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { DictionaryCandidate, DictionaryLookup } from '#lib/api/dictionary.ts';
import { toBinyan } from '#lib/hebrew/binyan.ts';
import {
  hasNiqqud,
  isSamePointedText,
  toDefectiveKey,
  toLookupKey,
} from '#lib/hebrew/normalize.ts';
import type { Preposition } from '#lib/hebrew/preposition.ts';
import { governedPreposition, nounGender, partOfSpeechOf } from './convert.ts';
import { type DictionaryPaths, INDEX_SCHEMA_VERSION, sourceStamp } from './files.ts';
import type { EntryFacts } from './source.ts';

/** The index is missing or was built by older code; the message says how to fix it. */
export class DictionaryUnavailableError extends Error {
  override name = 'DictionaryUnavailableError';
}

const BUILD_COMMAND = 'npm run build-index';

// A form shared by many words, like a common possessive, shouldn't list them all.
const MAX_CANDIDATES = 12;

// Following form-of and alt-of targets this deep finds every lemma in the dictionary; a cycle in
// the data must not loop.
const MAX_TARGET_DEPTH = 3;

type EntryRow = { id: number; word: string; pos: string; pointed: string | null; is_lemma: number };

type Entry = EntryRow & { facts: EntryFacts };

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

function toEntry(row: Record<string, unknown>): Entry {
  return {
    id: Number(row.id),
    word: String(row.word),
    pos: String(row.pos),
    pointed: row.pointed === null ? null : String(row.pointed),
    is_lemma: Number(row.is_lemma),
    facts: JSON.parse(String(row.facts)) as EntryFacts,
  };
}

// Entries filed under `key` by their title come first, in the dictionary's order.
function entriesWithKey(db: DatabaseSync, column: 'key' | 'defective_key', key: string): Entry[] {
  return db
    .prepare(
      `SELECT entries.* FROM keys JOIN entries ON entries.id = keys.entry_id
       WHERE keys.${column} = ? GROUP BY entries.id ORDER BY MAX(keys.is_title) DESC, entries.id`,
    )
    .all(key)
    .map(toEntry);
}

// By the title's key, which a title with a maqaf or a direction control differs from.
function entriesTitled(db: DatabaseSync, title: string): Entry[] {
  return db
    .prepare(
      `SELECT entries.* FROM keys JOIN entries ON entries.id = keys.entry_id
       WHERE keys.key = ? AND keys.is_title = 1 ORDER BY entries.id`,
    )
    .all(toLookupKey(title))
    .map(toEntry);
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

function toCandidate(db: DatabaseSync, lemma: Entry): DictionaryCandidate {
  const { facts } = lemma;
  const shared = {
    id: lemma.id,
    title: lemma.word,
    pointed: lemma.pointed ?? undefined,
    pos: lemma.pos,
    glosses: facts.glosses,
    roots: facts.roots,
  };
  const partOfSpeech = partOfSpeechOf(lemma.pos);
  switch (partOfSpeech) {
    case 'noun':
      return {
        ...shared,
        partOfSpeech,
        noun: {
          gender: nounGender(facts.genders),
          // A noun used in pairs, like `עַיִן`, may list only its dual.
          plurals: facts.plurals.length > 0 ? facts.plurals : facts.duals,
          feminines: facts.feminines,
          femininePlurals: [...facts.femininePlurals, ...counterpartPlurals(db, lemma)].filter(
            (plural, index, all) =>
              all.findIndex((other) => isSamePointedText(other, plural)) === index,
          ),
        },
      };
    case 'verb':
      return {
        ...shared,
        partOfSpeech,
        verb: {
          binyan: facts.binyanCode === undefined ? undefined : toBinyan(facts.binyanCode),
          infinitives: facts.infinitives,
          prepositions: [
            ...new Set(
              facts.prepositions.flatMap((text): Preposition[] => {
                const preposition = governedPreposition(text);
                return preposition === undefined ? [] : [preposition];
              }),
            ),
          ],
        },
      };
    case 'other':
      return { ...shared, partOfSpeech };
  }
}

function toCandidates(db: DatabaseSync, lemmas: readonly Entry[]): DictionaryCandidate[] {
  return lemmas.slice(0, MAX_CANDIDATES).map((lemma) => toCandidate(db, lemma));
}

// A masculine noun almost never lists its feminine counterpart's plural: that is on the
// feminine's own entry, the one whose `m` names this noun. `חתולה` has two entries, and only
// `חֲתוּלָה` names `חָתוּל`.
function counterpartPlurals(db: DatabaseSync, masculine: Entry): string[] {
  const { pointed } = masculine;
  if (pointed === null) return [];
  return masculine.facts.feminines.flatMap((feminine) =>
    entriesWithKey(db, 'key', toLookupKey(feminine))
      .filter(
        (entry) =>
          entry.pos === 'noun' &&
          entry.facts.masculines.some((named) => isSamePointedText(named, pointed)),
      )
      .flatMap((entry) => entry.facts.plurals),
  );
}
