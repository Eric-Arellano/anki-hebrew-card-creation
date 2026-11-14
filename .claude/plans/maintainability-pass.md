# Maintainability pass

## Context

The UI revamp landed fast, and it left names and folders describing the editor as it used to be.
`components/forms/` renders the Grammar section, `NoteFields` renders one field group,
`ExistingNotesPanel` and `DictionaryPanel` are no longer panels, and `card/change.ts` sits beside
`anki/changes.ts` with an unrelated job. The README's Status and Claude sections predate most of
the features, and its privacy statements are close to the code but not exact. Pure logic about
Claude's suggestions grew inside three components, where only DOM tests reach it.

This pass changes no behaviour except in PR 2, which makes `FORVO_DOWNLOADS` load from `.env`
like `ANTHROPIC_API_KEY` does. Each PR is a prefactor: a reviewer should be able to read it as
"moved, renamed, or said more exactly" and nothing else.

It starts from `main` once `change-markers-lists` (the revamp's last PR, which deletes
`ui-revamp.md`) has merged, since that branch edits `card/change.ts`, `ChangedFrom` and the
inputs that PR 3 and PR 6 rename. Two pieces of work are still to come: the Claude correctness
check and the verb revamp (`~/.claude/plans/so-in-theory-that-unified-squid.md`, not adopted yet).
Neither should wait on this pass, and the order among these PRs is loose after PR 1. When the verb
plan is adopted, its paths need updating for PR 4 and PR 6. The plan says `forms/VerbInputs.svelte`,
`ui/ChoiceChips.svelte`, `fields/SuggestButton.svelte`, and `suggestBlocker` in `CardEditor.svelte`.

## Decisions

- **Use `git mv` for every move and rename, in a commit of its own before any edits**, so blame
  and `git log --follow` survive and the review diff shows only the import churn.
- **Component directories follow the sections `CardEditor` renders:** Word, Grammar, Media, and the
  field-group sections (Hints and examples, Unusual variants, Notes). A widget that two sections
  share goes in `ui/`. `ImagesInput` stays in `media/` even though Unusual variants imports it
  too: the Media section is where images are attached.
  *Rejected: a `hints/` directory for `ExamplesInput`, `SameMeaningNotes` and `SuggestButton`,
  because `fields/` already means "the field-group sections", and splitting it again buys nothing.*
- **The AnkiConnect allowlist stays spelled out in `AGENTS.md`.** It is a rule the agent follows
  from `curl` too, so it needs to be readable where the rules are. The two enforcing copies,
  `server/anki/client.ts` and `.claude/hooks/anki-guard.sh`, each get a comment naming the other
  two, so changing the list means changing all three.
  *Rejected: replacing the list with a pointer to `client.ts`, because the hook has to stay
  independent of app code, and a rule you have to open another file to read gets skipped.*
- **Suggestions logic moves to one module, `card/suggestions.ts`.** That covers what blocks asking,
  the request built from the draft, which blanks a reply fills, and whether a field still holds
  Claude's unread text. This is the code the verb plan's PR 3 extends, so giving it unit tests now
  makes that PR cheaper.
- Considered, not done:
  - **Splitting `card/prefill.ts` per part of speech.** The one switch reads fine, and the verb
    revamp will reshape the verb arm anyway.
  - **Moving the `Attachment` types out of `media/` so `card/` doesn't import from it.** The
    imports are type-only, which keeps `card/` pure.
  - **Unifying the five routes' rules for required query parameters.** Their rules really differ
    (`lookup` accepts an empty word), and unifying them would change behaviour.
  - **A shared component for the choice-card list** in the deck check and the dictionary
    entries. Two uses that may diverge are not enough to justify one.

## PR 1: README and AGENTS.md say what the code does

Docs only.

- **README:**
  - Delete **Status**: the intro and Requirements already say what it does.
  - Rewrite **Claude**, which runs on past 100 columns and mixes setup with button mechanics.
    One sentence on what Claude does (suggests examples and hints, and checks a note before
    each add or save, which you can save past), then the key setup. Say that suggestions and
    checks need the dictionary index too: `lookUpHomographs` is a 503 without it.
  - **What it reads**: Forvo lists the folder's names, and reads only the files that look like
    Forvo downloads. It does not "only read the names of" those files (see `readdir` in
    `server/forvo-downloads.ts`).
  - **What it sends**:
    - The AnkiConnect bullet gains media reads (`retrieveMediaFile`).
    - The Anthropic bullet adds the part of speech, and the dictionary's definitions of other
      entries spelled the same (`server/ai/homographs.ts`). Fix the same overclaim in
      `server/ai/client.ts:1-2`.
  - Button names: "Add to deck" and "Save changes", as `SaveBar.svelte` labels them.
- **AGENTS.md:**
  - Hard rules:
    - "Never reach a third-party site" becomes "The app never reaches…", since the agent's own
      WebFetch and the Svelte MCP server are allowed.
    - Button names, as in the README.
    - Point at the two enforcing copies of the allowlist (Decisions).
  - Where code goes:
    - Add a line for the top-level `src/lib/*.ts` files: pure editor copy and config with no
      narrower home, which the server's prompts may read too (`field-help.ts`).
    - `server/` also reaches Anthropic.
  - Testing philosophy: add "a fake `ClaudeMessages`" beside the fake AnkiConnect client.
- `client.ts` and `anki-guard.sh` header comments name the other copies of the allowlist.

## PR 2: Read `FORVO_DOWNLOADS` like `ANTHROPIC_API_KEY`, and let `npm start` read `.env`

- **Declare `FORVO_DOWNLOADS` in `src/env.ts`**, optional, with Downloads as the default. Read it
  through `$app/env/private` in `server/forvo-downloads.ts` instead of `process.env`, which
  `vite dev` doesn't fill from `.env`, so today a `.env` line is silently ignored. Look up
  `defineEnvVars`' optional/default form with the Svelte MCP server rather than recalling it.
- **Mock `$app/env/private` once, in `tests/setup.ts`**, with both variables, and drop the five
  per-file `vi.mock`s (`server/ai/{client,check,suggest}.test.ts` and the two AI route tests).
  Confirm that a `vi.mock` in a setup file applies to every test file. If it doesn't, keep the
  per-file mocks and add one for the Forvo tests.
- `start` becomes `node --env-file-if-exists=.env build`, keeping `HOST` and `BODY_SIZE_LIMIT`.
  Drop the README's "`npm start` doesn't read `.env`" caveat, and say `FORVO_DOWNLOADS` goes in
  `.env` too.

## PR 3: Rename the `lib/` modules whose names collide or mislead

Moves and renames, then import updates. No logic changes.

- `card/change.ts` → `card/changed-from.ts`, after `ui/ChangedFrom.svelte`, which renders its
  `Change`. Today it reads as a sibling of `anki/changes.ts`.
- `anki/changes.ts` → `anki/changed-fields.ts`, after its one export, `changedFields`, the save
  diff.
- `anki/status.ts` (`fieldOrder`, `ankiStatusProblem`) folds into `api/anki.ts` beside the
  `AnkiStatus` it reads. Its only importer is `CardEditor.svelte`. It isn't one of Anki's formats,
  and it shares a basename with `server/anki/status.ts`, which does the opposite job. The test
  moves into a new `api/anki.test.ts`.
- `hebrew/tov.ts` → `card/parts-of-speech/tov.ts` (and its test). It holds deck conventions
  ("the deck's convention gives an `mf` noun the masculine"), not facts about Hebrew text. Its
  importers are `noun.ts` and `checks/plural-hints.ts`.
- Unexport the types nothing else imports:
  - `Size` (`media/image.ts`)
  - `TextRange` (`hebrew/usage.ts`)
  - `PluralHint` (`checks/plural-hints.ts`)
  - `NoteTypeStatus` (`api/anki.ts`)
  - `DictionaryAdjective` and `DictionaryVerb` (`api/dictionary.ts`)
  - `ShownFieldGroup` (`note-type.ts`)
  - `TextPart` (`field-help.ts`)
  - `Link` (`links.ts`)

  Re-grep each one first.

## PR 4: One home for the server's HTTP errors, and a clearer dictionary index

- `server/http.ts` → `server/route-errors.ts`, so it no longer shares a name with `api/http.ts`.
  It gains `withAiErrorsAs502`, replacing the try/catch copied into
  `routes/api/ai/{check,suggest}/+server.ts`.
- **Stop calling `error()` from `server/ai/`.** `server/ai/homographs.ts` lets
  `DictionaryUnavailableError` through, and the routes map it to 503 through a
  `withDictionaryAs503` in `route-errors.ts`, which `routes/api/lookup/+server.ts` uses as well.
  `server/anki/notes.ts`'s `readNoteOr404` and `refuseUnknownFields` stay where they are: they
  are Anki-specific, and moving them is churn.
- **Tie each route's zod schema to its API type** with `satisfies z.ZodType<…>`:
  - `CheckRequest` and `SuggestRequest` from `api/ai.ts`;
  - the notes routes' bodies too, if they have types.

  Today the schemas can drift from the types silently.
- **Rename `check.ts`'s `isPlainLine` to say what it allows** (it permits `&`, while
  `suggest.ts`'s doesn't). The verb plan moves `suggest.ts`'s version into a shared module, and
  two functions with one name and different rules would be a trap.
- **Dictionary index:**
  - `INDEX_SCHEMA_VERSION` moves from `server/dictionary/files.ts` into `build.ts`, beside the
    `SCHEMA` whose changes bump it. Its comment says to bump it when the tables change, and the
    tables are in the other file.
  - `files.ts`, which then holds only `DICTIONARY_PATHS` and `sourceStamp`, becomes `paths.ts`.
  - Fix the drifted copy of the gender codes at `source.ts:68`: point at `convert.ts`, which has
    the full list.

## PR 5: Move form gathering out of `card/examples.ts`

The bottom half of `card/examples.ts` gathers a word's labelled forms: `LabeledForm`,
`labeledForms`, `formsFieldLines`, `allLabeledForms` and `wordUsage`. It is not about the
`Examples` field, and `api/ai.ts` imports `LabeledForm` "from examples". Move it into
`card/parts-of-speech/forms.ts`, beside `FormLine` and `formsByLabel`, with its tests.

That puts the two `label: form` parsers side by side:
- `formsFieldLines` splits text on `\n` and takes any label;
- `formsByLabel` splits HTML and takes only `[a-z.]+` labels.

Merge them only if the existing tests show they agree on every input each one sees. Otherwise,
add one line on each saying why they differ. Move `wordUsage`'s rationale paragraph out of its
doc comment, onto the line it explains.

## PR 6: Component directories follow the editor's sections

Renames and moves first (`git mv`), then imports and test queries.

- `forms/` → `grammar/`, and `forms/WordForms.svelte` → `grammar/GrammarInputs.svelte`. It renders
  the whole Grammar section: part of speech, pointed word, the per-part-of-speech inputs and
  plural hints.
- `ui/ChoiceChips.svelte` and `ui/UnofferedValue.svelte` → `grammar/`, since only Grammar uses
  them.
- `fields/NoteFields.svelte` → `fields/FieldGroup.svelte`. It renders one group's fields. The
  new name also ends a clash in `CardEditor.svelte`, where `NoteFields`, the `noteFields`
  imported from `card/to-note.ts` and a snippet also named `noteFields` share one file. The
  snippet becomes `fieldGroup`.
- `word/ExistingNotesPanel.svelte` → `word/DeckCheck.svelte`, the name the tests already use. Keep
  the `aria-label`.
- `word/DictionaryPanel.svelte` → `word/DictionaryEntries.svelte`.
- `SaveBar.svelte` and `ClaudeCheck.svelte` → `save/`. AGENTS.md lets only a one-component section
  stay beside `CardEditor`.
- Comments to fix while there:
  - `CardEditor.svelte:104-105` says the fields shown "depend only on the part of speech". They
    also follow Anki's field order.
  - The three copies of "The pointed word, which leads the row…" in `Noun/Verb/AdjectiveInputs`
    become one, on `GrammarInputs`, which lays out the row.
  - `DictionaryPanel.svelte:23` describes behaviour that `CardEditor.svelte`'s `pick` enacts.
    Move it there.
- Run `svelte-autofixer` on every moved file.

## PR 7: Claude's suggestions, as pure functions with unit tests

A new `card/suggestions.ts`, with `card/suggestions.test.ts`:

- `suggestBlocker(draft)` and `suggestRequest(draft)` from `CardEditor.svelte`. The first is the
  branching that is tested only through the DOM today; the second is the inline `SuggestRequest`.
- `filledBlanks(suggestions, edits, examples)` from `SuggestButton.svelte`'s `ask`: which hints
  and examples a reply fills, given that typing during the call wins.
- `isUnreadSuggestion(field, suggested, edits, examples)` from `FieldGroup.svelte` (PR 6).

The components keep the state and the calls. Their DOM tests stay as integration tests, but drop
any case that the unit tests now cover exhaustively.

## PR 8: One list-row algebra for meanings and examples, and one `Held` type

- `restoreThrough` and `remove` are identical in `word/DefinitionsInput.svelte` and
  `fields/ExamplesInput.svelte`, comments included. Make them generic, beside `removedRows` in
  `card/changed-from.ts`, with tests for the edge cases each branches on: the last row is
  cleared, not removed, and a restore index lies past the end.
- **A `Held<T>` type** (`T | undefined`, documented once as what Anki holds while editing a note)
  replaces the nine copies of that comment on `held` props. `SaveBar`'s and `CardEditor`'s `held`
  is a whole `LoadedNote`, a different thing: rename it `heldNote` there.

## PR 9: Shared fixtures for the editor's tests

- Into `CardEditor.harness.ts`:
  - the כלב noun note, now built four ways in `check`, `saving`, `changes` and `loading`;
  - the כלב `DictionaryCandidate`, copied verbatim in `changes` and `dictionary`;
  - `heldReply` (`check`, `suggest`);
  - `pressCmdEnter`, which `saving` inlines 14 times;
  - `addButton` (`images`, `saving`).
- Move the tests that landed in the wrong file:
  - "the pointed word" leaves `loading` for `parts-of-speech`;
  - the deck-check cases split across `CardEditor.test.ts` and `loading` go into one file.
- Where a file's name already carries its topic, drop the second-level `describe` that restates
  it. That brings the 4-level files (`dictionary`, `images`, `loading`, `CardEditor.test.ts`)
  back to the two-level working depth.

## PR 10: Shared fakes for the server's tests

- `tests/fake-claude.ts`: the fake `ClaudeMessages` now rebuilt in `server/ai/client.test.ts` and
  both AI route tests.
- `ankiWithNotes` (identical in `existing-notes.test.ts` and `same-meaning-notes.test.ts`) moves
  to `tests/fake-anki.ts`.
- `closedAnki`'s "Can't reach AnkiConnect" message imports the constant from `client.ts`, or
  gets one exported there, instead of copying the literal into the fake and four tests.
- "Find the fixture note by `Hebrew`" is reimplemented in five places. Use `tests/real-notes.ts`
  in all of them.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte file
  touched until it reports nothing. No test reaches the network, a real Anki or the real API.
- PRs 3–6: after the move, `grep -rn` for each old module and component name across `src/`,
  `tests/`, `scripts/`, `AGENTS.md` and `README.md` comes back empty.
- PR 2, by hand: put `FORVO_DOWNLOADS` in `.env` pointing at a folder holding a Forvo-named MP3,
  run `npm run dev`, type the word, and the editor offers it. Then run `npm run build && npm start`
  and check the server starts with the key from `.env`. Do this without clicking Add to deck,
  Save or any Claude button.
- PR 6, by hand: `npm run dev` and look at a new word and an opened note. Every section renders
  as before. Nothing is clicked that writes to Anki or calls Claude.
