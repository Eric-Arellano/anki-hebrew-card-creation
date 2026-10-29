# Hebrew card helper

## Context

I make Hebrew Anki cards by hand. Some of the making is how the words stick, but much of it is
rote: looking a word up in three places, typing טוֹבָה again, copying a plural from Wiktionary into
the right field with the right label. This tool does the rote part and hands a pre-filled note to
Anki's own Add window, where I finish it and click Add. The target is about 80% of cards.

The editor already works end to end for every part of speech. What's left is the offline
dictionary, and prefilling the editor from it. Facts that shape that work:

- **Only כלב, חתול and דג follow the current card conventions.** The other notes predate them, so
  the three are the sample, not the deck. Old verb notes hold the past 3ms (`דיבר`) in `Hebrew` and
  `דִּבֵּר (פיעל)` in `Pointed`.
- **The Production card asks me to type `{{type:Production answer}}`,** so that field is plain
  unpointed text, written by composition and never shown in the editor.
- **A variant card exists only when its answer field is filled.**
- **SvelteKit 3 postdates most of what an agent recalls.** `$lib` is gone: `#lib` is a subpath
  import, imported with its `.ts` extension, and Node resolves it too, so `scripts/` can use it.
  The `$env/*` modules are deprecated: a variable is declared in `src/env.ts` and imported from
  `$app/env/private`.

## Decisions

### No live link checks; the index answers instead

The Wiktionary chip will show whether the word has a Hebrew entry, answered from the index (§
Dictionary). The tool sends nothing to any third-party site; it only builds links I click.

*Rejected: HEAD requests to Wiktionary through a throttled `linkcheck.ts`, because the index
answers the same question offline and more precisely: a page can exist for a word with no Hebrew
section. Pealim and Forvo can't be checked anyway: Pealim's search answers 200 for anything, and
Forvo answers 403 to anything that isn't a browser.*

### Formats are typed constants in the module that uses them

The note type lives in `src/lib/note-type.ts`; each other format lands as a typed constant beside
the code that implements it, not up front. `BINYANIM` is in `src/lib/hebrew/binyan.ts` and
`PREPOSITIONS` in `src/lib/card/verb.ts`. Still to land, with their features:

- **The aliases that convert to a binyan**, joining `binyan.ts` with the prefill that first needs
  them: `pa'al` (paal, qal, kal), `nif'al` (nifal), `pi'el` (piel), `pu'al` (pual), `hif'il`
  (hifil), `huf'al` (hof'al, hufal, hofal), `hitpa'el` (hitpael). No alias may name two binyanim.
  The editor's binyan input is a dropdown of `BINYANIM`, so nothing typed needs them before then.
- **The dictionary paths:** `data/kaikki.org-dictionary-Hebrew.jsonl`, indexed into
  `data/hebrew.sqlite`.

### Verb conventions

- **Verbs use the infinitive everywhere:** `Hebrew` is `לדבר` and `Pointed` is `לְדַבֵּר`. The
  dictionary's verb lemma is the past 3ms, so prefill has to find the infinitive (§ Dictionary).
- **A verb's inputs are a binyan, a root and a preposition** (`VerbDraft` in `card/verb.ts`), and
  they write `Binyan`, `Root` and the production answer, so those fields are never shown. The
  binyan and root are required; the preposition starts as "את or none". The root is kept as typed
  and `formatRoot` (`src/lib/hebrew/root.ts`) joins it with maqafs, so prefill can write a
  category's `ח־ב־ר` straight in.
- **Open:** what a verb's `Forms` holds. It stays hidden for verbs until the dictionary
  inspection decides it.

### Dictionary: kaikki.org's Wiktionary extract, indexed into SQLite

kaikki.org publishes English Wiktionary as JSONL, extracted by wiktextract. I download the Hebrew
file into `data/`; it is only ever streamed, never loaded whole. It is CC BY-SA 4.0, not MIT, so
fixtures from it carry an attribution README.

What I've seen in it, all to be verified before writing the parser:

- `word` is the unpointed title, `lang_code` is `he`, and there's a `pos`.
- `head_templates[].expansion` carries the pointed headword (`בְּלִי • (b'lí) …`), and each `forms[]`
  entry has `form` and `tags`.
- Categories carry facts (`Hebrew masculine nouns`, `Hebrew terms belonging to the root ח־ב־ר`).
  Some flag gaps, such as missing plurals, so expect incomplete coverage.
- Where the binyan lives, and how reliably, is unknown.
- **Verb lemmas are the past 3ms (`דִּבֵּר`), not the infinitive my cards use.** The infinitive comes
  from `forms[]` or the head template, or the field is left blank.

**The index.** `scripts/build-index.ts` keeps `lang_code == "he"` and writes, through Node's
built-in `node:sqlite`:
- `entries`: word, POS, pointed headword, genders, root, binyan, pointed plurals, infinitive,
  glosses and `form_of`/`alt_of` targets;
- `keys`: a normalized key and a defective key per entry, covering the headword *and* every
  `forms[]` entry, so typing a plural or an infinitive finds the lemma. The defective key removes
  internal ו and י, because ktiv male and ktiv haser spell words differently; it joins
  `src/lib/hebrew/normalize.ts`;
- `meta`: the source file's size and mtime and the schema version, so the UI can say when the
  index is stale.

**Lookup:** an exact key first, following `form_of`/`alt_of` to the lemma; then the defective
key, labelled "possible match". Every candidate shows its pointed headword, POS, first gloss and
root, and none is picked for me.

**Prefill, after I pick,** fills the inputs, never the fields they compose:
- the pointed word (for verbs, the pointed infinitive);
- the gender chips and the pointed plural, feminine and feminine-plural inputs;
- the root, and the binyan converted through the aliases; a binyan no alias names stays blank.
- Glosses go in a read-only panel. **Open:** whether `Definitions` is ever prefilled from them,
  since I write my own; it starts off.
- The deck check also searches the lemma's title, which finds old past-tense verb notes, and the
  Wiktionary link points at the lemma's page.

**Irregular-plural hint.** The tool suggests a variant card and I decide. It flags:
- a masculine noun whose plural ends in ות, or a feminine noun whose plural ends in ים, which also
  catches duals like `עֵינַיִם`;
- a plural that doesn't start with the singular's stem, once a feminine singular's final ה or ת is
  dropped and final letters are normalized (ך→כ ם→מ ן→נ ף→פ ץ→צ). This catches `עִיר` → `עָרִים`.

Both sides are compared stripped and defective, so `שולחן` against `שֻׁלְחָנוֹת` doesn't raise a false
alarm. The hint offers "Use as Variant N": the pointed plural plus `טוֹבִים` or `טוֹבוֹת`, chosen by
grammatical gender, not the suffix (`אָבוֹת טוֹבִים`, `שָׁנִים טוֹבוֹת`), with both as choices for an
`mf` noun. Those pointed forms join `src/lib/hebrew/tov.ts`.

- **Open:** `node:sqlite` needs `@types/node` to typecheck, since `$app/tsconfig` loads only
  SvelteKit's types. Ask before PR 2.
- **Open:** every worktree needs `data/`. Either copy it through `.worktreeinclude`, or let the
  dictionary path point at one shared copy.

### Not yet: Forvo audio pickup

I download Forvo audio by hand. Forvo's API forbids caching audio, so it isn't used. The idea, to
build only once I ask: after I click the Forvo link, watch Downloads (`os.homedir()`, overridable)
for a new `pronunciation_he_<word>.mp3`, show it for me to confirm, and attach it through
`guiAddCards`' `audio` parameter.

## PR 1 — inspect the dictionary

Needs the JSONL in `data/`.

- Stream the entries for `ספר` (homographs), `אב`, `שנה`, `עיר`, `שולחן`, `דיבר`/`לדבר`, and a verb
  with a governing preposition, such as `לחכות ל` or `להשתמש ב`.
- Copy the real lines into `tests/fixtures/kaikki/`, with an attribution README.
- Replace "what I've seen" in § Dictionary with what is true: where each fact lives, whether titles
  are ktiv male or haser, where the binyan is, and whether governing prepositions appear at all.
- Resolve the Open on a verb's `Forms`.

No app code, and it stops for my review.

## PR 2 — the index and lookup

- `scripts/build-index.ts`, `npm run build-index`, and `src/lib/server/dictionary.ts`.
- Tests on the fixtures: homographs, a plural finding its lemma, an infinitive finding its lemma,
  and the male/haser fallback.
- README: how to build the index.

## PR 3 — lookup in the editor

- `/api/lookup`, with its reply type and call in `src/lib/api.ts`, and a candidate picker;
  prefill after I pick; the glosses panel.
- The binyan aliases in `src/lib/hebrew/binyan.ts`, tested on every alias.
- The irregular-plural hint (`src/lib/hebrew/plural.ts`), tested on flagged `עיר`/`ערים`,
  `אב`/`אבות`, `שנה`/`שנים`, `עין`/`עיניים`, `שולחן`/`שולחנות`, and unflagged `כלב`/`כלבים`,
  `דלת`/`דלתות`.
- The deck check finds lemma matches, and the Wiktionary chip points at the lemma and shows
  whether it has an entry.
- Without an index, the editor still works.
- **Delete this plan,** unless I've asked for § Not yet: Forvo audio pickup by then.

## Verification

- **PR 3, by hand:** run `npm run dev` with Anki open and drive `http://127.0.0.1:5173`
  (Playwright MCP works). The hand-off payload for the word the PR touches, captured in the
  browser without reaching Anki, matches a real note field by field. Only I try the real
  hand-off; an agent asks first.
- **PR 2:** `npm run build-index` on the real file, then spot-check its tests' lookups in the UI.
