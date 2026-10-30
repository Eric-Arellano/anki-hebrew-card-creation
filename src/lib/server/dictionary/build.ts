// Builds the SQLite index that lookups read, from the dictionary file the human downloaded. The
// file is large, so each line is written to the index as it is read, and none is kept.
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

  // Written beside the index and renamed over it, so a lookup never reads a half-built one.
  const partial = `${index}.partial`;
  rmSync(partial, { force: true });
  const db = new DatabaseSync(partial);
  let summary: BuildSummary;
  try {
    db.exec(SCHEMA);
    db.exec('BEGIN');
    summary = await writeEntries(db, source);
    const insertMeta = db.prepare('INSERT INTO meta (name, value) VALUES (?, ?)');
    insertMeta.run('schema_version', INDEX_SCHEMA_VERSION);
    insertMeta.run('source_stamp', stamp);
    db.exec('COMMIT');
  } finally {
    db.close();
  }
  renameSync(partial, index);
  return summary;
}

function parseJson(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

// kaikki gives an etymology section's categories to just one of its entries: the construct form
// `אַב` carries the root that belongs to `אָב`, "father". So a root category counts for every entry
// in its section, which is the entries with the same title and etymology number. It is used only
// where an entry's own templates name no root, since categories agree with them 98% of the time,
// and only once every line is read, since the category may come on a later entry.
async function writeEntries(db: DatabaseSync, source: string): Promise<BuildSummary> {
  const insertEntry = db.prepare(
    'INSERT INTO entries (id, word, pos, pointed, is_lemma, facts) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertKey = db.prepare(
    'INSERT INTO keys (key, defective_key, entry_id, is_title) VALUES (?, ?, ?, ?)',
  );
  const categoryRootsBySection = new Map<string, string[]>();
  const rootless: { id: number; section: string }[] = [];
  let entries = 0;
  let unreadableLines = 0;

  for await (const line of createInterface({ input: createReadStream(source) })) {
    if (line.trim() === '') continue;
    const entry = readEntry(parseJson(line));
    if (entry === undefined) {
      unreadableLines++;
      continue;
    }
    entries++;
    const id = entries;
    insertEntry.run(
      id,
      entry.word,
      entry.pos,
      entry.pointed ?? null,
      entry.isLemma ? 1 : 0,
      JSON.stringify(entry.facts),
    );
    const titleKey = toLookupKey(entry.word);
    for (const key of new Set(entry.keyForms.map(toLookupKey))) {
      if (key === '') continue;
      insertKey.run(key, toDefectiveKey(key), id, key === titleKey ? 1 : 0);
    }

    const section = sectionOf(entry);
    const roots = categoryRootsBySection.get(section) ?? [];
    const newRoots = entry.categoryRoots.filter((root) => !roots.includes(root));
    categoryRootsBySection.set(section, [...roots, ...newRoots]);
    if (entry.facts.roots.length === 0) rootless.push({ id, section });
  }

  const setRoots = db.prepare(
    "UPDATE entries SET facts = json_set(facts, '$.roots', json(?)) WHERE id = ?",
  );
  for (const { id, section } of rootless) {
    const roots = categoryRootsBySection.get(section) ?? [];
    if (roots.length > 0) setRoots.run(JSON.stringify(roots), id);
  }
  return { entries, unreadableLines };
}

// A page with one etymology numbers none, so all its entries share the section without one.
function sectionOf(entry: SourceEntry): string {
  return `${entry.word}\n${entry.etymologyNumber ?? ''}`;
}
