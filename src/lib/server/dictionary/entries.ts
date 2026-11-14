import type { DatabaseSync } from 'node:sqlite';
import { toLookupKey } from '#lib/hebrew/normalize.ts';
import type { EntryFacts } from '#lib/server/dictionary/source.ts';

type EntryRow = { id: number; word: string; pos: string; pointed: string | null; is_lemma: number };

export type Entry = EntryRow & { facts: EntryFacts };

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
export function entriesWithKey(
  db: DatabaseSync,
  column: 'key' | 'defective_key',
  key: string,
): Entry[] {
  return db
    .prepare(
      `SELECT entries.* FROM keys JOIN entries ON entries.id = keys.entry_id
       WHERE keys.${column} = ? GROUP BY entries.id ORDER BY MAX(keys.is_title) DESC, entries.id`,
    )
    .all(key)
    .map(toEntry);
}

// By the title's key, which a title with a maqaf or a direction control differs from.
export function entriesTitled(db: DatabaseSync, title: string): Entry[] {
  return db
    .prepare(
      `SELECT entries.* FROM keys JOIN entries ON entries.id = keys.entry_id
       WHERE keys.key = ? AND keys.is_title = 1 ORDER BY entries.id`,
    )
    .all(toLookupKey(title))
    .map(toEntry);
}
