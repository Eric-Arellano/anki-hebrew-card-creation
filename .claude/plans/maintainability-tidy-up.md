# Maintainability tidy-up

## Context

PRs #64–#71 added a lot in a short time: opening, saving and adding notes, the same-root and
same-meaning deck checks, and the examples warning. #72 then added the Claude client. Before
`ai-suggestions-and-note-checks.md` builds on the editor, this pass reread every source file under
`src/`, `scripts/` and `tests/` for maintainability debt: file organization, names, data
structures and docs.

The code is in good shape. AGENTS.md's conventions hold almost everywhere: directory import rules,
`describe` naming, comments on the thing they explain, discriminated unions. What's left is one
reorganization: splitting `src/lib/card/`, whose 13 modules are more than a reader can hold at
once. After that, one test file moves so the editor's adding and saving tests sit together.

The PRs land as one gh-stack stack, bottom to top.

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

## PR 1 — Split `card/` by what a module does

Moves only, plus import paths, laid out as in Decisions. Use `git mv`, so each file's history
follows it.

- `parts-of-speech/`: `noun.ts`, `verb.ts`, `adjective.ts`, `forms.ts` and `forms.test.ts`.
- `checks/`: `examples`, `plural-hints` and `meanings`, each with its test.
- Update every importer. The importers are under `card/`, `components/` and
  `server/anki/same-meaning-notes.ts`.
- AGENTS.md "Where code goes": the `card/` line only says it "turns the editor's inputs into
  fields". Reword it to cover what `card/` holds, its two subdirectories included, without
  listing files. Keep "It stays pure, with no DOM and no `fetch`."
- Run `svelte-autofixer` on each Svelte file whose imports change, until it reports nothing.

## PR 2 — Keep the editor's adding and saving tests together

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
- PR 1: the CardEditor component tests render every component it touches. Also smoke-test
  under `npm run dev` with the Playwright MCP. Load the page, type כלב, pick the noun
  and check that the form inputs and the deck check render. This only makes read-only
  AnkiConnect calls. Never click Add to deck or Save, and never click Suggest.
- Each PR is one layer of the stack: `split-card-directory`, then `group-save-bar-tests`.
  Submit them with `gh stack submit --auto`, and check with `gh stack view --json`.
