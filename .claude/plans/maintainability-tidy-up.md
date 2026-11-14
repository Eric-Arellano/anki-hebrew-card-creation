# Maintainability tidy-up

## Context

PRs #64–#71 added a lot in a short time: opening, saving and adding notes, the same-root and
same-meaning deck checks, and the examples warning. #72 then added the Claude client. Before
`ai-suggestions-and-note-checks.md` builds on the editor, this pass reread every source file under
`src/`, `scripts/` and `tests/` for maintainability debt: file organization, names, data
structures and docs.

What's left is one move in the editor's component tests, so its adding and saving tests sit
together before the AI plan's review step extends both. The PR is the top layer of a gh-stack
stack.

## PR 1 — Keep the editor's adding and saving tests together

Tests move; none change. `CardEditor.test.ts` (513 lines) holds `describe('adding to the deck')`,
while `CardEditor.saving.test.ts` holds `describe('saving a loaded note')`. Both drive the same
SaveBar.

- Move `adding to the deck` and its `dagFields`/`addButton` helpers into
  `CardEditor.saving.test.ts`, as a sibling `describe` under `CardEditor`. Drop the imports
  `CardEditor.test.ts` no longer uses.
- The test count stays the same: compare `npm test`'s summary before and after.
- This PR deletes this plan.

## Verification

- `npm run lint && npm run check && npm test`, with any flake named in the report. Before
  committing, read `git status` and the diff for secrets, home paths and anything from `data/`.
- The branch is `group-save-bar-tests`. Submit it with `gh stack submit --auto`, and check with
  `gh stack view --json`.
