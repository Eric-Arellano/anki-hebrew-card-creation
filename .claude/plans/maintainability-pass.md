# Maintainability pass

## Context

The UI revamp landed fast. Its component directories now follow the editor's sections, but pure
logic about Claude's suggestions grew inside three components, where only DOM tests reach it, and
the list rows, the `held` props and the tests' fixtures and fakes are copied where they should be
shared.

This pass changes no behaviour. Each PR is a prefactor: a reviewer should be able to read it as
"moved, renamed, or said more exactly" and nothing else.

Two pieces of work are still to come: the Claude correctness check and the verb revamp
(`~/.claude/plans/so-in-theory-that-unified-squid.md`, not adopted yet). Neither should wait on
this pass, and the order among these PRs is loose. When the verb plan is adopted, its paths need
updating: it says `forms/VerbInputs.svelte` and `ui/ChoiceChips.svelte`, which are now
`grammar/VerbInputs.svelte` and `grammar/ChoiceChips.svelte`, and after PR 1 its
`fields/SuggestButton.svelte` and `suggestBlocker` in `CardEditor.svelte` move as well.

## Decisions

- **Use `git mv` for every move and rename, in a commit of its own before any edits**, so blame
  and `git log --follow` survive and the review diff shows only the import churn.
- **Component directories follow the sections `CardEditor` renders:** `word/`, `grammar/`,
  `media/`, `fields/` for the field-group sections, and `save/`. A widget that two sections share
  goes in `ui/`. A new module goes where that rule puts it.
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

## PR 1: Claude's suggestions, as pure functions with unit tests

A new `card/suggestions.ts`, with `card/suggestions.test.ts`:

- `suggestBlocker(draft)` and `suggestRequest(draft)` from `CardEditor.svelte`. The first is the
  branching that is tested only through the DOM today; the second is the inline `SuggestRequest`.
- `filledBlanks(suggestions, edits, examples)` from `SuggestButton.svelte`'s `ask`: which hints
  and examples a reply fills, given that typing during the call wins.
- `isUnreadSuggestion(field, suggested, edits, examples)` from `fields/FieldGroup.svelte`.

The components keep the state and the calls. Their DOM tests stay as integration tests, but drop
any case that the unit tests now cover exhaustively.

## PR 2: One list-row algebra for meanings and examples, and one `Held` type

- `restoreThrough` and `remove` are identical in `word/DefinitionsInput.svelte` and
  `fields/ExamplesInput.svelte`, comments included. Make them generic, beside `removedRows` in
  `card/changed-from.ts`, with tests for the edge cases each branches on: the last row is
  cleared, not removed, and a restore index lies past the end.
- **A `Held<T>` type** (`T | undefined`, documented once as what Anki holds while editing a note)
  replaces the nine copies of that comment on `held` props. `save/SaveBar`'s and `CardEditor`'s `held`
  is a whole `LoadedNote`, a different thing: rename it `heldNote` there.

## PR 3: Shared fixtures for the editor's tests

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

## PR 4: Shared fakes for the server's tests

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
