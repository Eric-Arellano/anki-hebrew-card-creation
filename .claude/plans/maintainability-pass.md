# Maintainability pass

## Context

The UI revamp landed fast, and it left names and folders describing the editor as it used to be.
`components/forms/` renders the Grammar section, `NoteFields` renders one field group,
`ExistingNotesPanel` and `DictionaryPanel` are no longer panels, and `card/change.ts` sits beside
`anki/changes.ts` with an unrelated job. Pure logic about Claude's suggestions grew inside three
components, where only DOM tests reach it.

This pass changes no behaviour. Each PR is a prefactor: a reviewer should be able to read it as
"moved, renamed, or said more exactly" and nothing else.

Two pieces of work are still to come: the Claude correctness check and the verb revamp
(`~/.claude/plans/so-in-theory-that-unified-squid.md`, not adopted yet). Neither should wait on
this pass, and the order among these PRs is loose. When the verb plan is adopted, its paths need
updating for PR 2 and PR 4. The plan says `forms/VerbInputs.svelte`, `ui/ChoiceChips.svelte`,
`fields/SuggestButton.svelte`, and `suggestBlocker` in `CardEditor.svelte`.

## Decisions

- **Use `git mv` for every move and rename, in a commit of its own before any edits**, so blame
  and `git log --follow` survive and the review diff shows only the import churn.
- **Component directories follow the sections `CardEditor` renders:** Word, Grammar, Media, and the
  field-group sections (Hints and examples, Unusual variants, Notes). A widget that two sections
  share goes in `ui/`. `ImagesInput` stays in `media/` even though Unusual variants imports it
  too: the Media section is where images are attached.
  *Rejected: a `hints/` directory for `ExamplesInput`, `SameMeaningNotes` and `SuggestButton`,
  because `fields/` already means "the field-group sections", and splitting it again buys nothing.*
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

## PR 1: Rename the `lib/` modules whose names collide or mislead

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

## PR 2: One home for the server's HTTP errors, and a clearer dictionary index

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

## PR 3: Move form gathering out of `card/examples.ts`

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

## PR 4: Component directories follow the editor's sections

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

## PR 5: Claude's suggestions, as pure functions with unit tests

A new `card/suggestions.ts`, with `card/suggestions.test.ts`:

- `suggestBlocker(draft)` and `suggestRequest(draft)` from `CardEditor.svelte`. The first is the
  branching that is tested only through the DOM today; the second is the inline `SuggestRequest`.
- `filledBlanks(suggestions, edits, examples)` from `SuggestButton.svelte`'s `ask`: which hints
  and examples a reply fills, given that typing during the call wins.
- `isUnreadSuggestion(field, suggested, edits, examples)` from `FieldGroup.svelte` (PR 4).

The components keep the state and the calls. Their DOM tests stay as integration tests, but drop
any case that the unit tests now cover exhaustively.

## PR 6: One list-row algebra for meanings and examples, and one `Held` type

- `restoreThrough` and `remove` are identical in `word/DefinitionsInput.svelte` and
  `fields/ExamplesInput.svelte`, comments included. Make them generic, beside `removedRows` in
  `card/changed-from.ts`, with tests for the edge cases each branches on: the last row is
  cleared, not removed, and a restore index lies past the end.
- **A `Held<T>` type** (`T | undefined`, documented once as what Anki holds while editing a note)
  replaces the nine copies of that comment on `held` props. `SaveBar`'s and `CardEditor`'s `held`
  is a whole `LoadedNote`, a different thing: rename it `heldNote` there.

## PR 7: Shared fixtures for the editor's tests

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

## PR 8: Shared fakes for the server's tests

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
- PRs 1–4: after the move, `grep -rn` for each old module and component name across `src/`,
  `tests/`, `scripts/`, `AGENTS.md` and `README.md` comes back empty.
- PR 4, by hand: `npm run dev` and look at a new word and an opened note. Every section renders
  as before. Nothing is clicked that writes to Anki or calls Claude.
