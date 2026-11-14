# UI revamp: a distinct edit mode

## Context

The editor grew one feature at a time, and it shows. I audited it in the running app (worktree
dev server on :5174) against the real deck, using שולחן as a new word, כלב as a complete note and
the legacy שולחן note. Sections and links are fixed; what remains is edit mode:

- **Edit mode looks like new mode.** The only difference is a small blue banner. The word input
  still takes focus. For a complete note, "Fill in the blanks from Wiktionary" takes up the whole
  top of the page. Nothing marks a value as changed until the review step, which shows raw HTML.
- **The Wiktionary picker crowds a complete note.** For a note with no part of speech yet (77 of
  the 104 today, legacy notes being upgraded), picking the entry is the main thing to do. For a
  complete note it's probably noise.

Goal: an edit mode that looks like one, keeps the picker out of the way unless the note needs it,
and marks each changed value against what Anki holds.

*Rejected: a legacy mode with its own notice, because the legacy notes are nearly all upgraded
and the code would outlive them.* The picker opens by whether the note has a part of speech yet,
which stays meaningful after the cleanup.

**Verbs are in flux** (see `~/.claude/plans/so-in-theory-that-unified-squid.md`, still being
modelled). `VerbInputs.svelte` keeps its layout and only gets the shared marker props, and the
space under the preposition chips stays free for the help text that plan proposes.

## Layout

The editor is a column of `ui/Section.svelte` cards, each with an `h2`, an optional
`description` and an `actions` snippet right of the heading, in workflow order above the sticky
save bar: **Word** (word, meanings, "Already in your deck", the dictionary picker), **Grammar**
(Pealim in its header; part of speech, its inputs, and the `Grammar` field group), **Media**,
then, once a part of speech is chosen, one Section per remaining `FIELD_GROUPS` entry: **Hints
and examples** (Suggest with Claude in its header), **Unusual variants** and **Notes**.
`fields/NoteFields.svelte` renders one group's `fields`, through CardEditor's `noteFields`
snippet.

Each lookup link sits beside what it feeds. `media/ImagesInput.svelte` takes a `links` snippet
for its "Search images" row: a chip per filled meaning and one for the Hebrew word, or a variant
prompt's own search, each labelled by the text it searches. Forvo is in `AudioInput`'s header.
`word/DictionaryPanel.svelte` owns the Wiktionary link and its "no entry" note, on the picked
entry or in the picker's heading, so collapsing the picker must leave the link reachable.

Since a Section is labelled by its heading, the Notes section and the Notes textarea share an
accessible name, so the test harness's `noteField` looks only at textareas and fieldsets.

## PRs (a stack on `ui-revamp`; ask before pushing)

### PR 1: edit-mode framing

- The header states the mode. New mode shows "New word". Edit mode shows "Editing כֶּלֶב" with a
  "Start a new word" button, which replaces the blue banner. `<title>` follows the mode in
  `+page.svelte`, or in CardEditor through `svelte:head`.
- `DictionaryPanel` in edit mode wraps the candidates in `<details>`, with the summary "Fill blanks
  from Wiktionary (N entries)". It starts open when the loaded note has no part of speech yet
  (`start.inputs.partOfSpeech === undefined`), since picking an entry is how it gets one, and
  closed otherwise. New mode is unchanged. If a complete note's picker keeps getting opened,
  open it always.
- The word input takes focus only in new mode.
- `ExistingNotesPanel` copy: in new mode, "Already in your deck: edit it instead?". In edit mode,
  "Also in your deck with this spelling". The dictionary heading in new mode reads "Start from
  Wiktionary: which word is it?".
- Tests: update the copy in `CardEditor.dictionary.test.ts` and `CardEditor.test.ts`. Add tests
  for `details` open or closed by whether the note has a part of speech, and focus by mode.

### PR 2: change markers against what Anki holds

- `CardEditor`: a `baseline: CardDraft` state. It starts as `start`, and is set to
  `$state.snapshot(draft)` in `onsaved`, so markers clear after a save, including the first save
  after an Add. Markers show only while `held !== undefined`. `replacesDraft` compares against
  `baseline` too (`changedBeyondWord` in `src/lib/card/draft.ts`).
- New `ui/ChangedFrom.svelte`: an accent left edge on the wrapped input, plus one of three
  lines:
  - **Added**, when the baseline was blank.
  - **Was “…” · Restore**, when the value changed.
  - **Cleared. Was “…” · Restore**, when the value is now blank.

  Values are wrapped in `<bdi>`, and compared NFC-normalized through `src/lib/hebrew/normalize.ts`
  (`isSamePointedText`).
- Wire `was` (and a restore callback) into:
  - `ui/TextInput.svelte`, which covers pointed, the forms and the root.
  - `ui/ChoiceChips.svelte`, for part of speech, gender and preposition.
  - The binyan `<select>` in `VerbInputs` (marker only, no layout change).
  - `word/DefinitionsInput.svelte`, compared as a whole list.
  - NoteFields textareas.
  - Examples, compared as a list with the old rows shown compactly.
  - Images, prompt images and audio, compared by attachment filenames ("Was: 1 image").

  Thread the matching baseline slice down through `WordForms` → `NounInputs` /
  `AdjectiveInputs` / `VerbInputs`. Export `isSameValue` from `draft.ts` for the list and media
  comparisons.
- `SaveBar.svelte`: in edit mode, show the `changes` it already computes as a live "Will change:
  Forms, Examples" line. In review, show before and after on red-50 and green-50 grounds. They
  still show raw HTML, keeping the existing reason for that.
- This PR may split into 2a (baseline, TextInput, textareas and the SaveBar line) and 2b (chips,
  definitions, examples and media) if it gets large.
- Tests:
  - A loaded note's changed plural shows "Was" with its old value, and Restore puts it back.
  - A blank field filled from a Wiktionary pick shows "Added".
  - Markers clear after a save.
  - A new note shows no markers.
  - The save bar lists the changed fields.
  - Unit tests for any new pure helper.

## Reuse

- `changedFields` (`src/lib/anki/changes.ts`), already computed in SaveBar, for the live list.
- `isSamePointedText` and `toComparisonKey` (`src/lib/hebrew/normalize.ts`) for comparing values.
- `isSameValue` and `changedBeyondWord` (`src/lib/card/draft.ts`).
- `shownFieldGroups` (`src/lib/note-type.ts`), which is unchanged and drives the sections.

## Verification

For each PR:

- `npm run lint && npm run check && npm test`.
- `svelte-autofixer` on every Svelte file touched, until it reports nothing.
- Look up any rune or API in the Svelte MCP docs rather than recalling it.

In the running app (:5174, served from this worktree, with HMR), take Playwright screenshots in
`.playwright-mcp/` (git-ignored) of:

- a complete note in edit mode (כלב), with the dictionary collapsed, after changing the plural to
  show the marker and using Restore;
- a legacy note (the old שולחן), with the picker open, after picking the entry to show "Added"
  markers.

Don't click Suggest, Check, Add or Save without asking.

At the end, with permission before **each** action, add up to 3 new words. Candidates: לילה, a
masculine noun with an ־ות plural (exercises the variant hint); מהר, an adverb; and an adjective
not yet in the deck (check with `findNotes` first, since גדול is already a legacy note). Avoid
verbs while they're in flux. Optionally Save one legacy-note upgrade, such as
גדול. Each Add or Save runs Claude's check. Afterwards, list the noteIds to delete in Anki.

Before committing, read `git status` and the diff for secrets, home paths and `data/`.
