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
  (hifil), `huf'al` (hof'al, hufal, hofal), `hitpa'el` (hitpael), and the dictionary's codes, `pa`,
  `nif`, `pi`, `pu`, `hif`, `huf` and `hit`. No alias may name two binyanim. The editor's binyan
  input is a dropdown of `BINYANIM`, so nothing typed needs them before then.
- **The dictionary's prepositions map onto `PREPOSITIONS`** once stripped of points and maqaf:
  `לְ־` and `ל־` are ל, and `אֵת` and "direct" are את. One outside the list, like `אֶל`, suggests
  nothing.
- **The dictionary paths:** `data/kaikki.org-dictionary-Hebrew.jsonl`, indexed into
  `data/hebrew.sqlite`.

### Verb conventions

- **Verbs use the infinitive everywhere:** `Hebrew` is `לדבר` and `Pointed` is `לְדַבֵּר`. The
  dictionary's verb lemma is the past 3ms, so prefill has to find the infinitive (§ Dictionary).
- **A verb's inputs are a binyan, a root and a preposition** (`VerbDraft` in `card/verb.ts`), and
  they write `Binyan`, `Root` and the production answer, so those fields are never shown. The
  binyan, root and preposition are all required, and none starts chosen. את counts as a
  preposition and the production answer keeps it (`לראות את`); "None" is only for a verb with no
  object, like ללכת. The root is kept as typed
  and `formatRoot` (`src/lib/hebrew/root.ts`) joins it with maqafs, so prefill can write the
  dictionary's root, joined or not, straight in.
- **Open:** what a verb's `Forms` holds. It stays hidden for verbs until that's decided;
  § Dictionary lists what the file offers for it.

### Dictionary: kaikki.org's Wiktionary extract, indexed into SQLite

kaikki.org publishes English Wiktionary as JSONL, extracted by wiktextract. I download the Hebrew
file into `data/`; it is only ever streamed, never loaded whole. It is CC BY-SA 4.0, not MIT, so
fixtures from it carry an attribution README.

What the file holds, from the 2026-10-25 extract; `tests/fixtures/kaikki/hebrew.jsonl` has real
lines for each claim:

- **One line per entry**: a title, a `pos` and an etymology. All 18,182 lines are `lang_code`
  `he`. Homographs are separate lines with the same `word`, and `etymology_number`, absent on a
  page with one etymology, groups them: ספר has six.
- **Titles are ktiv male**: `דיבר`, `שולחן`, `חיכה`. A haser spelling gets its own entry, whose
  sense has `alt_of` pointing at the male title and the tags `alt-of` and `misspelling`: `שלחן` →
  `שולחן`, and the verb `דבר` → `דיבר`. Where the two spellings agree, as in `כלב`, there's one entry.
- **The pointed headword** is the `forms[]` entry tagged `canonical`. The `he-noun` or `he-verb`
  head template holds it too, as `wv` when it spells the title, or `dwv` when it's the haser
  spelling of a male title (`שולחן` / `שֻׁלְחָן`).
- **Gender** is the head template's `g`, plus `g2` for a noun that takes both (`רוח`, 43 nouns).
  The values are `m` and `f`, with `-p` for a plural-only noun (`מוניטין`) and `-d` for a
  dual-only one (`משקפיים`). The gender chips can't show `-p` or `-d`, so those leave the
  chips blank.
- **Noun forms** are the `forms[]` entries without a `source`, from the head template, tagged
  `indefinite`+`plural`, `dual` or, for the feminine counterpart, just `feminine`. A `wv` entry
  gives each one only pointed; a `dwv` entry gives the male spelling and then the pointed one
  (`שולחנות`, `שֻׁלְחָנוֹת`). Entries with `source: declension` or `conjugation` are the inflection
  table: mostly possessed forms, 53,000 of them.
- **Only 56% of nouns list a plural** (4,192 of 7,508), and a second plural (`pl2`) means choices.
  **The feminine plural is almost never on the masculine** (11 of 575 nouns with a feminine
  counterpart): it is the plural of the feminine's own entry, the one whose `m` names this noun.
  `חתולה` has two entries, and only `חֲתוּלָה` names `חָתוּל`. Prefill fills it only after the index
  makes that second lookup.
- **Some plurals have their own form-of entry** (`ערים`, `שולחנות`, `עיניים`), whose `form_of[].word`
  is sometimes pointed (`עִיר`). A pointed target is what tells `עִיר` (city) from `עַיִר` (donkey
  foal). A bare title can't, so it offers both.
- **Verb lemmas are the past 3ms (`דִּבֵּר`), not the infinitive my cards use.** The binyan is the
  `he-verb` template's first argument, which is never spelled like a name: `pa`, `nif`, `pi`, `pu`,
  `hif`, `huf`, `hit`, with `hitpu'al` twice and `nitpa'el` once. These codes join the aliases.
- **The infinitive** is the head template's `inf`/`infdwv` (tagged `infinitive`) for only 77
  verbs. For the rest, it's the infinitive row of the `he-conj` table, which wiktextract fails to
  tag: a `forms[]` entry with `source: conjugation`, tagged `error-unrecognized-form`, and the
  only such entry that starts with ל. 1,960 of 2,125 conjugated verbs have one. Most of the others
  are pu'al and huf'al, which have no infinitive (`-`), so the input is left blank. A verb may list
  two infinitives (`לַחֲדֹר`, `לַחְדֹּר`), which become choices. The unpointed infinitive is listed
  when the title is male (`לספור`). Otherwise it's the pointed form's `links` target (`לדבר#Hebrew`):
  the source's own spelling, not one derived from the pointed form.
- **The infinitive's own entry (`לדבר`) has no `form_of`**, only a gloss, "To-infinitive of
  דיבר". It finds its lemma through the lemma's keys, never by following that gloss.
- **The root** is maqaf-joined in the `he-rootbox` etymology template (`שׁ־נ־ה`; about 1,400 nouns
  and 600 verbs), and unjoined in the `he-conj` template's second argument (`שׁמשׁ`). Both may
  carry shin and sin dots, which a stored root drops.
- **Categories sit on the wrong entry.** kaikki gives an etymology section's categories to just
  one of its entries: the construct-form `אב` carries the father entry's root and "plurals ending
  in ־ות" categories, and the father entry has neither. A root category ("Hebrew terms belonging to
  the root …", on 6,000 entries) agrees with the templates 98% of the time; the rest only add a
  sense label (`ע־ב־ר (pregnancy)`). So a category belongs to every entry with the same title and
  `etymology_number`, and is used only when the entry has no template root. The other categories
  are mostly housekeeping (`Pages with entries`).
- **Governing prepositions appear, rarely.** They're in `raw_glosses`, never `glosses`:
  `to wait, wait for [with לְ־ ‘for’]` and `[with ב־ (b'-) ‘in’]`. Only 104 of 2,515 verb lemmas
  have one, spelled pointed or not, with or without a maqaf (`לְ־`, `ל־`, `עַל`, `על`), and now and
  then as `אֵת` or "direct". At most, that's a suggested preposition chip, never one picked for
  me.
- **Glosses** are `senses[].glosses`. Form-of and alt-of senses have generated ones ("defective
  spelling of …"), which the panel skips.
- For a verb's `Forms` (still **Open**, below), the file offers the head template's future 3ms
  (`fut`) and passive counterpart (`pass`), and every cell of the conjugation table, pointed.
- **Open:** kaikki.org marks this postprocessed file deprecated and "will be removed". The
  fallback is to filter the 24.8 GB all-language raw extract for `lang_code == "he"`, and the raw
  format differs, so the parser would need checking against it.

**The index.** `scripts/build-index.ts` keeps `lang_code == "he"` and writes, through Node's
built-in `node:sqlite`:
- `entries`: word, POS, etymology number, pointed headword, genders (`-p` and `-d` kept as they
  are), root, binyan, pointed plurals, the pointed feminine counterpart and, on a feminine, the
  masculine it names (`m`), the infinitives pointed and unpointed, any governing preposition,
  glosses, and `form_of`/`alt_of` targets as written, pointed or not;
- `keys`: a normalized key and a defective key per entry, covering the headword *and* every
  `forms[]` entry that is a word (not `romanization`, `class`, `table-tags`,
  `inflection-template` or `-`), so typing a plural, an infinitive or a conjugated form finds the
  lemma. The defective key removes internal ו and י, because ktiv male and ktiv haser spell words
  differently; it joins `src/lib/hebrew/normalize.ts`;
- `meta`: the source file's size and mtime and the schema version, so the UI can say when the
  index is stale.

**Lookup:** an exact key first, following `form_of`/`alt_of` to the lemma; then the defective
key, labelled "possible match". An `alt_of` target is a male title. A pointed `form_of` target
narrows the lemmas with that title to the one whose pointed headword matches it (`עִיר`, not
`עַיִר`); a bare one leaves them all as candidates. Every candidate shows its pointed headword,
POS, first gloss and root, and none is picked for me.

**Prefill, after I pick,** fills the inputs, never the fields they compose. Where the entry has
two values, they become choices; where it has none, the input stays blank:
- the pointed word. For a verb, that's the pointed infinitive, and the unpointed `Hebrew` takes
  the source's own unpointed infinitive. A pu'al or huf'al verb has none, so both stay blank;
- the gender chips, left blank for `-p` and `-d`, and the pointed plural and feminine;
- the feminine plural, from the feminine's own entry whose `m` names this noun, not from this one;
- the root, from the entry's templates, or else from a root category on its etymology section,
  with any shin and sin dots dropped;
- the binyan, converted through the aliases; a binyan no alias names stays blank;
- a preposition from the glosses' `[with …]`, offered as a suggested chip, never selected for me.
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
  SvelteKit's types. Ask before PR 1.
- Every worktree gets its own `data/`: `.worktreeinclude` lists it, for worktrunk's `post-start`
  hook and for Claude Code desktop. Each copy builds its own index, so worktrees can't race on one
  SQLite file. *Rejected: one shared copy symlinked from the main worktree, because rebuilding the
  index in one worktree would change it under the others.*

### Not yet: Forvo audio pickup

I download Forvo audio by hand. Forvo's API forbids caching audio, so it isn't used. The idea, to
build only once I ask: after I click the Forvo link, watch Downloads (`os.homedir()`, overridable)
for a new `pronunciation_he_<word>.mp3`, show it for me to confirm, and attach it through
`guiAddCards`' `audio` parameter.


## PR 1 — the index and lookup

- `scripts/build-index.ts`, `npm run build-index`, and `src/lib/server/dictionary.ts`.
- Tests that build an index from `tests/fixtures/kaikki/hebrew.jsonl`, as from the real file:
  homographs, a plural finding its lemma (and `עָרִים` finding only `עִיר`, not `עַיִר`), an
  infinitive finding its lemma, the male/haser fallback, a root from a category on a sibling
  entry (`אב`), the infinitive and its unpointed spelling, a pu'al with none (`דובר`), the
  binyan code, the preposition in `raw_glosses` (`חיכה`, `השתמש`), and the feminine plural reached
  from the masculine (`כלב` → `כלבה`, and `חתול` → only the `חתולה` that names it).
- README: how to build the index, after the download steps already there.

## PR 2 — lookup in the editor

- `/api/lookup`, with its reply type and call in `src/lib/api.ts`, and a candidate picker;
  prefill after I pick; the glosses panel; the suggested preposition chip.
- The binyan aliases in `src/lib/hebrew/binyan.ts`, tested on every alias.
- The irregular-plural hint (`src/lib/hebrew/plural.ts`), tested on flagged `עיר`/`ערים`,
  `אב`/`אבות`, `שנה`/`שנים`, `עין`/`עיניים`, `שולחן`/`שולחנות`, and unflagged `כלב`/`כלבים`,
  `דלת`/`דלתות`.
- The deck check finds lemma matches, and the Wiktionary chip points at the lemma and shows
  whether it has an entry.
- Without an index, the editor still works.
- **Delete this plan,** unless I've asked for § Not yet: Forvo audio pickup by then.

## Verification

- **PR 2, by hand:** run `npm run dev` with Anki open and drive `http://127.0.0.1:5173`
  (Playwright MCP works). The hand-off payload for the word the PR touches, captured in the
  browser without reaching Anki, matches a real note field by field. Only I try the real
  hand-off; an agent asks first.
- **PR 1:** `npm run build-index` on the real file, then spot-check its tests' lookups in the UI.
