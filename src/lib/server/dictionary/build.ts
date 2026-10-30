// Builds the SQLite index that lookups read, from the dictionary file the human downloaded. The
// file is large, so it is streamed a line at a time and never loaded whole.
import { createReadStream, renameSync, rmSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import { toDefectiveKey, toLookupKey } from '#lib/hebrew/normalize.ts';
import { type DictionaryPaths, INDEX_SCHEMA_VERSION, sourceStamp } from './files.ts';
import { readEntry, type SourceEntry } from './source.ts';

// `keys` files each entry under every spelling that should find it, twice: by its lookup key,
// and by its defective key for when ktiv male and ktiv haser disagree.
const SCHEMA = `
  CREATE TABLE entries (
    id INTEGER PRIMARY KEY,
    word TEXT NOT NULL,
    pos TEXT NOT NULL,
    pointed TEXT,
    is_lemma INTEGER NOT NULL,
    facts TEXT NOT NULL
  );
  CREATE INDEX entries_by_word ON entries (word);
  CREATE TABLE keys (
    key TEXT NOT NULL,
    defective_key TEXT NOT NULL,
    entry_id INTEGER NOT NULL REFERENCES entries (id),
    is_title INTEGER NOT NULL
  );
  CREATE INDEX keys_by_key ON keys (key);
  CREATE INDEX keys_by_defective_key ON keys (defective_key);
  CREATE TABLE meta (name TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

export type BuildSummary = { entries: number; unreadableLines: number };

export async function buildIndex({ source, index }: DictionaryPaths): Promise<BuildSummary> {
  const stamp = sourceStamp(source);
  if (stamp === undefined) throw new Error(`No dictionary at ${source}`);

  const entries: SourceEntry[] = [];
  let unreadableLines = 0;
  for await (const line of createInterface({ input: createReadStream(source) })) {
    if (line.trim() === '') continue;
    const entry = readEntry(parseJson(line));
    if (entry === undefined) unreadableLines++;
    else entries.push(entry);
  }

  // Written beside the index and renamed over it, so a lookup never reads a half-built one.
  const partial = `${index}.partial`;
  rmSync(partial, { force: true });
  const db = new DatabaseSync(partial);
  try {
    db.exec(SCHEMA);
    db.exec('BEGIN');
    writeEntries(db, entries);
    const insertMeta = db.prepare('INSERT INTO meta (name, value) VALUES (?, ?)');
    insertMeta.run('schema_version', INDEX_SCHEMA_VERSION);
    insertMeta.run('source_stamp', stamp);
    db.exec('COMMIT');
  } finally {
    db.close();
  }
  renameSync(partial, index);
  return { entries: entries.length, unreadableLines };
}

function parseJson(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

function writeEntries(db: DatabaseSync, entries: readonly SourceEntry[]) {
  const insertEntry = db.prepare(
    'INSERT INTO entries (id, word, pos, pointed, is_lemma, facts) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertKey = db.prepare(
    'INSERT INTO keys (key, defective_key, entry_id, is_title) VALUES (?, ?, ?, ?)',
  );
  const rootsBySection = categoryRootsBySection(entries);
  entries.forEach((entry, index) => {
    const id = index + 1;
    const roots =
      entry.facts.roots.length > 0
        ? entry.facts.roots
        : (rootsBySection.get(sectionOf(entry)) ?? []);
    insertEntry.run(
      id,
      entry.word,
      entry.pos,
      entry.pointed ?? null,
      entry.isLemma ? 1 : 0,
      JSON.stringify({ ...entry.facts, roots }),
    );
    const titleKey = toLookupKey(entry.word);
    for (const key of new Set(entry.keyForms.map(toLookupKey))) {
      if (key === '') continue;
      insertKey.run(key, toDefectiveKey(key), id, key === titleKey ? 1 : 0);
    }
  });
}

// kaikki gives an etymology section's categories to just one of its entries: the construct form
// `אַב` carries the root that belongs to `אָב`, "father". So a root category counts for every entry
// in its section, which is the entries with the same title and etymology number. It is used only
// where an entry's own templates name no root, since categories agree with them 98% of the time.
function categoryRootsBySection(entries: readonly SourceEntry[]): Map<string, string[]> {
  const rootsBySection = new Map<string, string[]>();
  for (const entry of entries) {
    const roots = rootsBySection.get(sectionOf(entry)) ?? [];
    const newRoots = entry.categoryRoots.filter((root) => !roots.includes(root));
    rootsBySection.set(sectionOf(entry), [...roots, ...newRoots]);
  }
  return rootsBySection;
}

// A page with one etymology numbers none, so all its entries share the section without one.
function sectionOf(entry: SourceEntry): string {
  return `${entry.word}\n${entry.etymologyNumber ?? ''}`;
}
