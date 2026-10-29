# Hebrew card helper

## Context

I make Hebrew Anki cards by hand. That works, and some of the making is how the words stick. Much
of it is rote, though:
- looking a word up in three places;
- typing טוֹבָה again;
- copying a plural from Wiktionary into the right field with the right label.

This plan builds a local helper that does the rote part and hands a pre-filled note to Anki's own
Add window. I finish the note there and click Add. The target is about 80% of cards; the rest stay
manual. This plan replaces the brief from the web chat that started the project. Apart from the hard
rules in `AGENTS.md`, nothing else in the repo restates it.

Facts gathered on 2026-10-27, through read-only AnkiConnect calls and a handful of HEAD requests,
that shape the design:

- **Anki.** AnkiConnect v6 runs on `127.0.0.1:8765` with no API key. The deck is `עברית`, with no
  niqqud. The note type is `Hebrew`, which has 103 notes and no tags. No other note type is in the
  deck.
- **The note type's fields, in order:**
  `Hebrew`, `Pointed`, `Production answer`, `Definitions`, `Production context`,
  `Reading context`, `Images`, `Audio`, `Gender`, `Forms`, `Binyan`, `Root`, `Variant 1 prompt`,
  `Variant 1 answer`, `Variant 2 prompt`, `Variant 2 answer`, `Examples`, `Notes`.
- **The card templates** are Reading, Production, Listening, Variant 1 and Variant 2.
  - Production asks me to type `{{type:Production answer}}`, so that field must be plain unpointed
    text.
  - `Gender` becomes a CSS class (`g-m`, `g-f`, `g-mf`) that colours the answer side.
  - A variant card only exists when its answer field is filled.
- **Only כלב, חתול and דג follow the current conventions.** The other 100 notes predate them, and I
  update them as I go, so the three are the sample, not the deck. Old verb notes hold the past 3ms
  (`דיבר`) in `Hebrew` and `דִּבֵּר (פיעל)` in `Pointed`.
- **HEAD requests.**
  - Wiktionary answers 200 for a page that exists and 404 for one that doesn't.
  - Forvo answers 403 to anything that isn't a browser, whether the word exists or not.
  - Pealim's search page answers 200 for any query.
- **The repo** is MIT and will be public. It has CI, the agent setup, and `AGENTS.md` with the
  hard rules from § Decisions. Behind the editor (§ The editor) sit `src/lib/note-type.ts`, the
  allowlisted AnkiConnect client, the request guard and four endpoints (`/api/anki/status`,
  `/api/anki/existing`, `/api/anki/browse`, `/api/anki/add`). The editor already works end to end
  for words that are neither nouns nor verbs; nouns and verbs wait on their own composition.
- **SvelteKit 3** postdates most of what an agent recalls. `$lib` is gone: `#lib` is a subpath
  import in `package.json`, imported with its `.ts` extension, and Node resolves it too, so
  `scripts/` can use it. The `$env/*` modules are deprecated: a variable is declared in
  `src/env.ts` and imported from `$app/env/private`.

## Decisions

### Deterministic, and I always click Add

- **No LLM or AI calls at runtime.** The tool is deterministic.
- **The tool never creates, edits or deletes a note.** The AnkiConnect client accepts only `version`,
  `deckNames`, `modelNames`, `modelFieldNames`, `findNotes`, `notesInfo`, `guiAddCards` and
  `guiBrowse`.
  - The allowlist is the `results` object in `src/lib/server/anki.ts`, which also validates each
    reply with zod. The client is a function, `anki(action, params)`, so the types refuse any
    other action, and a runtime check refuses one from an untyped caller.
  - The payload is `{action, version: 6, params}`, plus `key` when one is configured.
  - Every failure, from Anki being closed to a malformed reply, is an `AnkiError`, which the
    routes answer with 502. Routes import the one live client from
    `src/lib/server/anki-connection.ts`.
- **The hand-off always asks first.** `guiAddCards` opens Anki's Add window, pre-filled. Calling it
  again replaces that window and discards anything I typed there, so every hand-off confirms first
  and says so. Cmd+Enter only opens that confirmation, with focus on its button, so a second
  key press is still a deliberate one. `/api/anki/add` takes `{fields}` and refuses any field
  name `note-type.ts` doesn't know; the deck, note type and tags come from it, never the browser.
- **Missing or ambiguous data leaves a field blank or shows choices; it is never guessed.**
  Homographs are never auto-picked.

### All TypeScript, on SvelteKit

- **Shape:** SvelteKit with Svelte 5 runes, built with `@sveltejs/adapter-node`. Server routes call
  AnkiConnect themselves, so there is no CORS to configure. Don't suggest adding `null` to
  AnkiConnect's `webCorsOriginList`. The routes also query SQLite through Node's built-in
  `node:sqlite`, so nothing needs native compilation.
- **One language:** the pure Hebrew logic in `src/lib/hebrew/` is shared by the UI, the server and
  the index script. Node ≥ 24 runs `.ts` scripts directly, so anything a script imports stays
  clear of `$app/*`; `#lib` is fine there.
- **Tooling:** npm, Biome, svelte-check and vitest.
- **Approved dependencies:** `svelte`, `@sveltejs/kit`, `@sveltejs/adapter-node`,
  `@sveltejs/vite-plugin-svelte`, `vite`, `typescript`, `svelte-check`, `@biomejs/biome`,
  `vitest`, `zod`, `@testing-library/svelte` and `jsdom`. Anything else asks first. First-party
  code is preferred when it is simple to write. All of them are installed.
- **Open:** `node:sqlite` needs `@types/node` to typecheck, since `$app/tsconfig` loads only
  SvelteKit's types. It isn't on the list, so ask before PR 5.
- *Considered, not done: porting foodservice-insights' `test-rigor`, `prune-comments`,
  `writing-docs` and `svelte-file-editor`. Port them once there is enough code to need them; the
  core of `writing-docs` is already in `AGENTS.md`.*

*Rejected: a Python server (uv, ruff, ty, pytest, Justfile) with a Svelte UI, because that is two
toolchains, and the composition logic would live on one side or be written twice.* *Rejected: the
brief's stdlib `http.server` and one vanilla HTML page, because a dozen derived fields, each one
overridable, want components.*

### Local only, and safe to publish

- **Binding.** The server binds `127.0.0.1` in both dev and `start`. adapter-node defaults to
  `0.0.0.0`, so the `start` script sets `HOST`.
- **Request checks.** `src/lib/server/request-guard.ts`, run from `hooks.server.ts`, answers 403
  to any Host other than `127.0.0.1` or `localhost`, which blocks DNS rebinding. On every path, it
  also refuses any method but GET and HEAD unless the body is JSON and the Origin is this server.
  Without these checks, any website I visit could open Add windows through this server.
  The AnkiConnect URL in `src/lib/server/anki-connection.ts` must be loopback too.
- **Ignored files.** `data/`, `*.sqlite` and build output are
  gitignored.
- **Paths.** No absolute home path appears in code.
- **Wiktionary data is CC BY-SA 4.0, not MIT.** The fixtures carry an attribution README, and the
  README says so. Turn on GitHub secret scanning and push protection when the repo goes public.

### Offline where possible, a HEAD request where it helps

The dictionary is offline (§ Dictionary). Beyond that, the tool only builds links I click, plus
one kind of request: a HEAD to tell me a link is a 404 before I click it.

- **Only Wiktionary is checked** (§ Context). Pealim's search page can't fail, and Forvo's 403 is
  bot protection, which we don't work around. Google Images never needs checking.
- **One module talks to third-party sites.** That is `src/lib/server/linkcheck.ts`:
  - HEAD only, for templates marked `check: true`;
  - a User-Agent naming the project and its repo URL, because Wikimedia's policy asks for one;
  - an in-memory cache;
  - one request in flight per host, with a minimum interval between requests;
  - a timeout.
  404 and 410 mean missing, 2xx and 3xx mean found, and anything else means unknown.
- **No open proxy.** The browser sends a link id and a word, and the server builds the URL from
  `LINKS` with `buildLinkUrl` in `src/lib/links.ts`, the same function the editor's link buttons
  use, so the URL checked is the URL I click.
- **Tests never reach the network.** `tests/setup.ts` replaces `fetch` with one that rejects
  unless a test stubs its own with `vi.stubGlobal`.
- **Once the index exists,** it answers the Wiktionary check, and no request goes out.
- **Agents never download the dictionary.** I put it in `data/`.

### The note type is code

- **Code, not config.** The tool is built for one deck and one note type, so their names, each
  field's Anki name and the parts of speech it is shown for live in `src/lib/note-type.ts`.
  Every later format (טוֹב forms, gender values, forms labels, the root separator, binyan
  aliases, prepositions, link-check settings, dictionary paths) lands as a typed constant in the
  module that implements it, not up front. Link templates live in `src/lib/links.ts`.
  *Rejected: a `config.json` validated with zod, because it split each field across JSON and TS
  and needed a schema to recover what types give for free.*
- **Drift check.** On load, the server compares `FIELD_NAMES` with the live `modelFieldNames`.
  The UI names any field that has drifted, and the hand-off stays disabled until
  `note-type.ts` and Anki match. `ankiStatusProblem` in `src/lib/anki/status.ts` turns a status
  into the one reason the hand-off is blocked, which the banner shows too.
- **Values that land with their features** (the rest are in § Card conventions):
  - binyanim and the aliases that convert to them: `pa'al` (paal, qal, kal), `nif'al` (nifal),
    `pi'el` (piel), `pu'al` (pual), `hif'il` (hifil), `huf'al` (hof'al, hufal, hofal),
    `hitpa'el` (hitpael). No alias may name two binyanim.
  - prepositions: ל, ב, על, עם, מ, אל, אחרי, בפני, מפני.
  - link check: at least 1000 ms between requests to a host, a 5000 ms timeout.
  - dictionary: `data/kaikki.org-dictionary-Hebrew.jsonl`, indexed into `data/hebrew.sqlite`.

**Prepositions.** The list holds the prepositions a verb can govern, ordered roughly by how often.
את is left out on purpose: most verbs take a direct object, and those get no preposition at all.
A verb that governs another one, `לחכות ל` or `לפחד מ`, carries it so I learn the word with it,
and only in `Production answer`. The list is mine to edit.

### Card conventions

These come from כלב, חתול and דג, plus the decisions for verbs:

- **`Hebrew`** is what I typed. It is never derived from `Pointed`: `דִּבֵּר` strips to `דבר`, but the
  word is spelled `דיבר`.
- **`Pointed`** is the pointed singular only.
- **`Production answer`** is plain unpointed text with normal spaces: no HTML, no `&nbsp;`.
  - Nouns use `{word} {tov}`, with `טוב` for m and mf and `טובה` for f.
  - Verbs use `{word} {preposition}`, trimmed when there is no preposition: `לדבר עם`, `לדבר`.
    A verb that takes את has none: `לראות`, never `לראות את`. The preposition appears nowhere
    else on the note; `Hebrew` and `Pointed` stay the bare infinitive.
- **`Gender`** is `m`, `f` or `mf`.
- **`Forms`** is pointed, `label: form` per line, joined with `<br>`. It is `pl: דָּגִים` alone, or
  `f: כַּלְבָּה<br>m.pl: כְּלָבִים<br>f.pl: כְּלָבוֹת` once there is a feminine counterpart.
- **Variant N** has an English prompt, often with an image, and a pointed answer. כלב's Variant 1
  is *female dog* → `כַּלְבָּה`.
- **Verbs use the infinitive everywhere:** `Hebrew` is `לדבר` and `Pointed` is `לְדַבֵּר`.
  - `Binyan` is a transliteration: pa'al, nif'al, pi'el, pu'al, hif'il, huf'al, hitpa'el.
  - `Root` is joined with maqafs: `ד־ב־ר`.
- **Adjective agreement follows grammatical gender, not the plural suffix:** `אָבוֹת טוֹבִים`,
  `שָׁנִים טוֹבוֹת`, `עֵינַיִם טוֹבוֹת`.
- **Open:** what a verb's `Forms` holds. It stays blank until it is decided, after the dictionary
  inspection.

### Hebrew text handling

- **Keys.** To build a key:
  - NFC-normalize;
  - strip `[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]`, which removes points and
    cantillation but keeps the maqaf;
  - treat geresh `׳`, `'` and `’` as one character, and gershayim `״` and `"` as one;
  - collapse whitespace and `&nbsp;`.
- **Display and comparison.** Pointed strings display exactly as their source has them. Comparison
  NFC-normalizes both sides, because sources order combining marks differently.
- **Anki field values are HTML.** They are compared after `ankiFieldHtmlToText` in `src/lib/anki/html.ts`
  strips tags and decodes entities. `&nbsp;` decodes to a real NBSP, which a key collapses
  but displayed text keeps. Going the other way, composition passes what I typed through
  `textToAnkiFieldHtml`, so a `<` or `&` shows as itself.
- **Where it lives.** `toComparisonKey` and `isSamePointedText` are in `src/lib/hebrew/normalize.ts`. The defective
  key isn't written yet; it joins them with the index.

### The editor

- **One page,** `src/routes/+page.svelte`, renders `CardEditor` from `src/lib/components/`. It
  separates what I tell it, what helps me research, and what goes to Anki:
  - a header with a quiet connection status and "Check again"; only a problem gets a banner;
  - **Word:** the four inputs, all required: the Hebrew word without niqqud and with it (RTL),
    the English meaning (the `{gloss}` placeholder), and the part of speech (`noun`, `verb` or
    `other`), which starts unchosen rather than defaulted. Beneath them sit the deck check
    (`ExistingNotesPanel`), and a "Look up" row of link chips; a chip whose placeholder is blank
    is disabled, with the input to fill in its tooltip;
  - **Card:** held back until every input is filled, since each one shapes composition. Then a
    textarea per field worth editing for the part of speech (`NoteFields`), by the groups in
    `src/lib/note-type.ts`, each group in the note type's live field order, or `FIELD_NAMES`'
    order until Anki answers;
  - the hand-off bar (`HandOffBar`), which names the inputs still needed.
  Composition controls for nouns and verbs, and the copy chips, are still to come.
- **Open:** a one-line hint per field that stays free text (the contexts, variants, examples and
  notes), once PRs 1 and 2 show which fields keep a textarea.
- **Display.** Hebrew is `dir="rtl" lang="he"`, and field textareas are `dir="auto"`, all in the
  `font-hebrew` stack from `src/routes/layout.css`, which renders niqqud clearly at a large size.
  Styling is Tailwind utilities, with the shared base styles in that file. Textareas hold raw Anki HTML.
- **Composition** is `suggestFields(inputs)` in `src/lib/suggest-fields.ts`, a pure
  function from `CardInputs` (`src/lib/card-inputs.ts`) to `FieldValues`, keyed by `FIELDS` key
  so a typo can't name a field; Anki names appear only at the hand-off. It fills `Hebrew`,
  `Pointed`, and `Definitions` from the gloss I typed. That is my own wording, unlike the
  dictionary's glosses, which wait on the prefill decision below. For `other`, the production answer is
  the word itself. For a noun or a verb it stays blank until that part of speech has its own
  composition, rather than being guessed. New composition extends this function and `CardInputs`.
- **Each field has a role,** in `src/lib/note-type.ts`, which says for which parts of speech the
  editor shows it. `Hebrew` and `Pointed` are never shown, because the inputs are those fields;
  neither are `Images` and `Audio`, which I paste in Anki. `Gender` is for nouns, `Binyan` and
  `Root` for verbs, and a verb's `Forms` stays hidden while it is Open. A hidden field is sent
  with only what composition gives it, so a stale edit from another part of speech never reaches
  Anki. A field that a new input or control writes, such as the binyan dropdown, is hidden there
  the same way, rather than shown twice.
- **My edits stick.** `CardEditor` keeps an `edits` map holding only the fields I've typed in. A
  field shows its edit, else its suggestion, so recomposition never overwrites an edit. Where a
  non-blank suggestion differs from my edit, a `Use "…"` button deletes the edit; a field with
  nothing suggested gets no button, since clearing it needs none.
- **Copy chips** cover the pointed טוֹב forms and the prepositions. A click copies with a brief
  confirmation. There are no binyan chips, because the binyan dropdown writes the field itself.
- **The deck check**
  - Once typing pauses, it searches `"note:Hebrew" "Hebrew:*key*"`, then sorts the `notesInfo`
    results into exact matches (equal after normalization) and related ones (`בית` → `בית ספר`).
    In the key, a space becomes `*` and a geresh or gershayim `_`, so `&nbsp;` and ASCII quotes
    in old notes still match.
  - Searches escape `\ " * _` and quote every term, so field names with spaces work
    (`src/lib/anki/search.ts`).
  - An exact match is a warning, since I may want to update the old note instead; related
    matches alone are a neutral note, and no match is one muted line.
  - A Browse button opens the matches through `guiBrowse` with `nid:…`.
- **The endpoints the editor calls.** Their reply shapes are types in `src/lib/server/deck.ts`,
  and the browser reaches them through `src/lib/api-client.ts`.
  - `GET /api/anki/status` answers `AnkiStatus`: an error message, or the version, whether the
    deck exists, and the note type's live fields and drift.
  - `GET /api/anki/existing?word=` answers `ExistingNotes`: `exactMatches` and `relatedMatches` lists of
    `{noteId, unpointed, pointed}`, as text.
  - `POST /api/anki/browse` takes `{noteIds}` and answers 204.
  - `POST /api/anki/add` takes `{fields}`, runs `guiAddCards`, and answers 204.
- **Cmd+Enter** asks to hand off.

### Dictionary: kaikki.org's Wiktionary extract, indexed into SQLite

kaikki.org publishes English Wiktionary as JSONL, extracted by wiktextract, and has a Hebrew file.
I download it into `data/`. It is large, so it is only ever streamed (`grep`, `head`, `readline`)
and never loaded whole into context or memory.

What I've seen in it, all to be verified before writing the parser:

- `word` is the unpointed title, `lang_code` is `he`, and there's a `pos`.
- `head_templates[].expansion` carries the pointed headword (`בְּלִי • (b'lí) …`), and each `forms[]`
  entry has `form` and `tags`.
- Categories carry facts (`Hebrew masculine nouns`, `Hebrew feminine nouns`, `Hebrew terms belonging
  to the root ח־ב־ר`). Some flag gaps, such as missing plurals, so expect incomplete coverage.
- Where the binyan lives, and how reliably, is unknown.
- **Verb lemmas are the past 3ms (`דִּבֵּר`), not the infinitive my cards use.** The infinitive comes
  from `forms[]` or the head template, or the field is left blank.

**The index.** `scripts/build-index.ts` keeps `lang_code == "he"` and writes three tables:
- `entries`: word, POS, pointed headword, genders, root, binyan, pointed plurals, infinitive,
  glosses and `form_of`/`alt_of` targets;
- `keys`: a normalized key and a defective key for each entry. Keys cover the headword *and* every
  `forms[]` entry, so typing a plural or an infinitive finds the lemma;
- `meta`: the source file's size and mtime and the schema version, so the UI can say when the index
  is stale.

**Lookup, in order:**
1. An exact key, following `form_of`/`alt_of` to the lemma.
2. A match on the defective key, labelled "possible match". Internal ו and י are removed on both
   sides, because ktiv male and ktiv haser spell words differently.
3. Every candidate is shown with its pointed headword, POS, first gloss and root. None is picked
   for me.

**Prefill, after I pick:**
- `Pointed`: for verbs, the pointed infinitive.
- `Gender`, plus root and binyan converted to my formats through the binyan aliases.
- `Forms` and the production answer.
- Glosses go in a read-only panel. **Open:** whether `Definitions` is ever prefilled
  from them, since I write my own; it starts off.
- The deck check also searches the lemma's title, which finds old past-tense verb notes.
- The Wiktionary link points at the lemma's page.

**Irregular-plural hint.** The tool suggests a variant card and I decide. It flags:
- a masculine noun whose plural ends in ות, or a feminine noun whose plural ends in ים, which also
  catches duals like `עֵינַיִם`;
- a plural that doesn't start with the singular's stem, once a feminine singular's final ה or ת is
  dropped and final letters are normalized (ך→כ ם→מ ן→נ ף→פ ץ→צ). This catches `עִיר` → `עָרִים`.

Both sides come from the pointed forms, stripped and made defective, so a male-spelled input
(`שולחן` against `שֻׁלְחָנוֹת`) doesn't raise a false alarm. The hint offers "Use as Variant N": the
pointed plural plus `טוֹבִים` or `טוֹבוֹת`.

**Open:** every worktree needs `data/`. Either copy it through `.worktreeinclude`, or let the dictionary
path point at one shared copy.

### Testing

- **Pure logic carries most tests:**
  - normalization and defective keys;
  - טוֹב selection by gender and number;
  - composition, checked field by field against the three real notes;
  - root and binyan conversion;
  - Anki search escaping;
  - the irregular-plural heuristic and lookup.
- **Server tests** run AnkiConnect through `fakeAnki` in `tests/fake-anki.ts`, which answers only
  the actions a test hands it and records every call. A route's `+server.ts` exports a `_`-prefixed
  function that takes the client as an argument, and its test calls that with a fake, so
  no test mocks a module. The link checker runs against a mocked `fetch`.
- **Anki fixtures** in `tests/fixtures/anki/` are replies from my real AnkiConnect: `notesInfo`
  for כלב, חתול and דג and for the `בית` notes, and the note type's field names. Renaming a field in
  `note-type.ts` means re-recording them.
- **Component tests** use `@testing-library/svelte` and jsdom. A test file opts into jsdom with a
  `// @vitest-environment jsdom` comment, and `svelteTesting()` in `vite.config.ts` resolves
  Svelte's browser build and unmounts after each test. `CardEditor.test.ts` stubs `fetch` with a
  small fake of our own server that records every request. It covers the confirm step coming
  before the hand-off and my edits surviving recomposition. New editor behaviour gets its tests
  there.
- **Fixtures are real JSONL lines** copied after inspection and never invented. They cover:
  - `ספר` (homographs);
  - `אב`/`אבות`, `שנה`/`שנים`, `עיר`/`ערים`;
  - `שולחן`;
  - `דיבר`/`לדבר`;
  - a verb with a governing preposition.
- **No test reaches real Anki or the network.**

### Out of scope

- LLMs.
- Fetching or scraping third-party pages, apart from the HEAD checks.
- Adding a note without me clicking Add, or changing or deleting one.
- AnkiMobile: desktop Anki only, and I sync to my phone.
- Downloading images: I paste those into Anki myself.

### Not yet: Forvo audio pickup

I download Forvo audio by hand, with a paid account. Forvo's API forbids caching audio, so it isn't
used. The idea, to build only once I ask:
1. After I click the Forvo link, watch Downloads (`os.homedir()`, overridable) for a new `.mp3`
   that appears after the click. Forvo names them `pronunciation_he_<word>.mp3`, as the existing
   `Audio` fields show.
2. Show the file for me to confirm.
3. Attach it through `guiAddCards`' `audio` parameter (`path`, `filename`, `fields: ["Audio"]`).

## PR 1 — nouns

- **Composition:**
  - a gender selector;
  - the production answer;
  - a Forms builder with plural, feminine and feminine-plural inputs, which writes either the
    `pl:` shape or the `f:`/`m.pl:`/`f.pl:` shape;
  - "Use feminine as Variant 1", which fills the answer with the pointed feminine and the prompt
    with `female {gloss}`.
- **Copy chips** for the טוֹב forms and the prepositions.
- **Modules:** `src/lib/hebrew/tov.ts`, plus the noun branch of `suggestFields` and the new
  inputs on `CardInputs` in `src/lib/card-inputs.ts`. The gender selector reuses
  `ui/ChoiceChips`, as the verb's preposition choice will.
- **Tests:** composition against the כלב, חתול and דג notes, and agreement for `אָבוֹת`, `שָׁנִים`
  and `עֵינַיִם`.

## PR 2 — verbs

- A binyan dropdown.
- A root input that accepts `דבר`, `ד.ב.ר`, `ד-ב-ר`, `ד ב ר` or `ד־ב־ר` and writes `ד־ב־ר`.
- Choosing a preposition.
- The verb production answer.
- Tests for root and binyan conversion, including the aliases.

## PR 3 — link checks

- **`src/lib/server/linkcheck.ts` and `/api/links/check`**, with a badge on the Wiktionary button once
  typing pauses.
- **Tests** with a mocked `fetch`:
  - 200, 404, 403 and a timeout;
  - the cache;
  - throttling;
  - an unknown link id.

**Then a pause.** I use the tool on real cards, and what I learn folds into this plan before PR 4.

## PR 4 — inspect the dictionary

This PR needs the JSONL in `data/`.

- Stream the entries for:
  - `ספר`, `אב`, `שנה`, `עיר`, `שולחן`;
  - `דיבר`/`לדבר`;
  - a verb with a governing preposition, such as `לחכות ל` or `להשתמש ב`.
- Copy the real lines into `tests/fixtures/kaikki/`, with an attribution README.
- Fold what the data shows into § Dictionary, replacing what I've seen with what is true:
  - where each fact lives;
  - whether page titles are ktiv male or haser;
  - where the binyan is;
  - whether governing prepositions appear at all.
- Resolve the Open on a verb's `Forms`.

No app code, and it stops for my review.

## PR 5 — the index and lookup

- **`scripts/build-index.ts` and `npm run build-index`,** and `src/lib/server/dictionary.ts`
  (§ Dictionary).
- **Tests on the fixtures:**
  - homographs;
  - a plural finding its lemma;
  - an infinitive finding its lemma;
  - the male/haser fallback.
- **README:** how to build the index.

## PR 6 — lookup in the editor

- **Lookup:** `/api/lookup` and a candidate picker.
- **Prefill and hints:**
  - prefill after I pick a candidate;
  - the irregular-plural hint (`src/lib/hebrew/plural.ts`);
  - the glosses panel.
- **Lemma awareness:** The deck check also finds lemma matches, and the Wiktionary link points
  at the lemma, checked offline.
- **Without an index,** the editor still works.
- **Heuristic tests:**
  - flagged: `עיר`/`ערים`, `אב`/`אבות`, `שנה`/`שנים`, `עין`/`עיניים`, `שולחן`/`שולחנות`;
  - not flagged: `כלב`/`כלבים`, `דלת`/`דלתות`.
- **Delete this plan,** unless I've asked for § Not yet: Forvo audio pickup by then.

## Verification

- **Every PR:** run `npm run lint && npm run check && npm test` and get CI green. Then run
  `git status` and read the diff for secrets, absolute home paths and anything from `data/`.
- **PRs 1 to 3 and 6, by hand:**
  - Run `npm run dev` with Anki open and drive `http://127.0.0.1:5173` (Playwright MCP works).
  - The status banner is green.
  - `כלב` finds its note as an exact match, and a nonsense word finds nothing.
  - The fields composed for כלב, חתול and דג match the real notes, field by field.
- **The hand-off,** where `guiAddCards` opens the Add window, is tried by me. An agent tries it
  only after asking.
- **PR 5:** `npm run build-index` on the real file, then spot-check the lookups from its tests in
  the UI.
