# Maintainability tidy-up

## Context

PRs #64–#71 added a lot in a short time: opening, saving and adding notes, the same-root and
same-meaning deck checks, and the examples warning. #72 then added the Claude client. Before
`ai-suggestions-and-note-checks.md` builds on the editor, this pass reread every source file under
`src/`, `scripts/` and `tests/` for maintainability debt: file organization, names, data
structures and docs.

The code is in good shape. AGENTS.md's conventions hold almost everywhere: directory import rules,
`describe` naming, comments on the thing they explain, discriminated unions. So this is a short
list of fixes and one reorganization: splitting `src/lib/card/`, whose 13 modules are more than a
reader can hold at once.

The PRs land as one gh-stack stack, bottom to top. Each is reviewable on its own, but the split
moves files the tidy-up edits, so they go in this order.

## Decisions

- **`card/` splits by what a module does.** Its own directory keeps the draft's lifecycle:
  `inputs`, `draft`, `prefill`, `compose`, `to-note` and `from-note`. Two subdirectories take the
  rest:
  - `card/parts-of-speech/`: a part of speech's own inputs, from `noun`, `verb` and `adjective`,
    and the `forms` field format all three write.
  - `card/checks/`: `examples`, `plural-hints` and `meanings`. Each inspects the draft or the
    deck and tells the human something, and none fills a field on its own.

  The split changes no import rule: everything under `card/` stays pure. Within the moved files,
  imports across subdirectories use `#lib/card/…`. A test keeps its relative import of the module
  beside it.
  *Rejected: mirroring `components/` (`forms/`, `fields/`), because `meanings` serves the server
  as well as a section.*
- **Rename where one name means two things; leave names that only seem a little off.** Fix the
  two places where one name means two different things:
  - `draft` means both `CardDraft` and its `CardInputsDraft`.
  - `VARIANT_ANSWERS` means both note-type's prompt→answer map and PluralHints' own list.

  Leave `prefillDraft`, `fieldsWith` and the `choices`/`offered` prop names as they are: each is
  consistent within its own module.
- **No prefactors for the AI plan's Suggest and check PRs.** NoteFields will gain a badge and
  findings, and SaveBar's review will cover new notes. How to split them is a decision for those
  PRs. *Rejected: extracting a `NoteField.svelte` or a review component now, because the shape
  isn't known yet.* The one exception is renaming CardEditor's `status` to `ankiStatus`. That's
  worth doing anyway, and it stops an AI status from making `status` ambiguous.
- Considered, not done:
  - Sharing the three copies of the `focus` attachment, and `pointed || unpointed`: they're
    three lines each, and WET is fine here.
  - Moving `anki/status.ts` next to its type in `api/anki.ts`: arguable either way.
  - Rewriting `prefillBlanks`, whose `keep` closure fills `offered` as it goes: it works, and
    the tests cover it.

## PR 1 — Tidy names, comments and imports

No change in behaviour. Each item below is a small edit:

1. **`src/lib/server/anki/client.ts` `ActionParams`.** The comment on `updateNoteFields` mixes
   two notes. The first is `storeMediaFile`'s ("The add-on replaces an existing file by default…
   Its `url` stays out because…"). The second is `updateNoteFields`' own ("Only the fields named
   change. Its `audio` and `picture` stay out…"). Move the first above `storeMediaFile`.
2. **`src/lib/components/forms/PluralHints.svelte`.** Drop its local `VARIANT_ANSWERS`, which
   shadows the export of the same name in `note-type.ts` but has a different shape. Derive the
   list from that export instead, so a third variant would follow automatically.
3. **`src/lib/components/CardEditor.svelte`.** Rename `status` to `ankiStatus`. It sits beside
   `ankiProblem` already. `ConnectionStatus`'s prop keeps the name `status`.
4. **`emptyDraft` → `emptyInputsDraft`** in `src/lib/card/inputs.ts`. It returns a
   `CardInputsDraft`, while its neighbour `emptyCardDraft` returns a `CardDraft`.
5. **`WordForms.svelte`'s `draft` prop → `inputs`.** It holds a `CardInputsDraft`, while in
   CardEditor `draft` is the whole `CardDraft`.
6. **Export `filledDefinitions`** from `card/inputs.ts`, and use it for CardEditor's `meanings`,
   which re-implements it inline.
7. **`fieldHtml(note, field)`** in `src/lib/server/anki/notes.ts`, beside `fieldText`, which
   then uses it. `same-meaning-notes.ts` uses it in place of
   `note.fields[FIELDS.definitions.name]?.value ?? ''`.
8. **`src/lib/server/dictionary/*.ts`.** These are the only modules that import with `./x.ts`.
   Switch them to `#lib/server/dictionary/x.ts`, as everything else does, so a grep for a module
   finds all its importers.
9. **`src/lib/api/{anki,dictionary,forvo}.ts` headers.** Drop the second sentence, "The reply
   types live here rather than beside the server code…". It's repeated in all three, and AGENTS.md
   "Where code goes" already says it once. Keep the first sentence, which names the routes.
   `api/ai.ts` already does this.

Run `svelte-autofixer` on `CardEditor.svelte`, `WordForms.svelte` and `PluralHints.svelte` until
it reports nothing.

## PR 2 — Split `card/` by what a module does

Moves only, plus import paths, laid out as in Decisions. Use `git mv`, so each file's history
follows it.

- `parts-of-speech/`: `noun.ts`, `verb.ts`, `adjective.ts`, `forms.ts` and `forms.test.ts`.
- `checks/`: `examples`, `plural-hints` and `meanings`, each with its test.
- Update every importer. The importers are under `card/`, `components/` and
  `server/anki/same-meaning-notes.ts`.
- AGENTS.md "Where code goes": the `card/` line only says it "turns the editor's inputs into
  fields". Reword it to cover what `card/` holds, its two subdirectories included, without
  listing files. Keep "It stays pure, with no DOM and no `fetch`."

## PR 3 — Keep the editor's adding and saving tests together

Tests move; none change. `CardEditor.test.ts` (513 lines) holds `describe('adding to the deck')`,
while `CardEditor.saving.test.ts` holds `describe('saving a loaded note')`. Both drive the same
SaveBar, and the AI plan's review step will extend both.

- Move `adding to the deck` and its `dagFields`/`addButton` helpers into
  `CardEditor.saving.test.ts`, as a sibling `describe` under `CardEditor`. Drop the imports
  `CardEditor.test.ts` no longer uses.
- The test count stays the same: compare `npm test`'s summary before and after.
- This PR deletes this plan.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, with any flake named in the report.
  Before committing, read `git status` and the diff for secrets, home paths and anything from
  `data/`.
- PRs 1 and 2: the CardEditor component tests render every component they touch. Also
  smoke-test under `npm run dev` with the Playwright MCP. Load the page, type כלב, pick the noun
  and check that the form inputs and the deck check render. This only makes read-only
  AnkiConnect calls. Never click Add to deck or Save, and never click Suggest.
- Each PR is one layer of the stack: `tidy-names-and-imports`, `split-card-directory`, then
  `group-save-bar-tests`. Submit them with `gh stack submit --auto`, and check with
  `gh stack view --json`.
