# UI revamp: sections, links in context, and a distinct edit mode

## Context

The editor grew one feature at a time, and it shows. I audited it in the running app (worktree
dev server on :5174) against the real deck, using שולחן as a new word, כלב as a complete note and
the legacy שולחן note:

- **No section headers above the note fields.** Word, deck matches, dictionary, links and media
  run together with no breaks. Below them the field groups use a faint grey left-column `h3`,
  which reads as a different design.
- **Picking a dictionary entry fills inputs off screen.** Media sits between the Word block and
  the forms, so the forms that just filled are below the fold.
- **The Suggest row floats.** It's a plain button between the plural hint and "Disambiguation
  hints". It fills Examples and both hints, but Examples sits two groups further down, past the
  variants.
- **The links are ordered by when they were added, not by how useful they are.** Wiktionary
  comes first even though its data is already preloaded. Forvo sits far from Audio, and the image
  searches sit far from Images.
- **Edit mode looks like new mode.** The only difference is a small blue banner. The word input
  still takes focus. For a complete note, "Fill in the blanks from Wiktionary" takes up the whole
  top of the page. Nothing marks a value as changed until the review step, which shows raw HTML.
- **Most edits are upgrades of legacy notes.** 77 of the 104 notes have no Part of speech. They
  hold Hebrew, Pointed (often `[ms] שֻׁלְחָן<br>[mp] …`), Images and Audio, and about half have
  Definitions. For these notes, picking the Wiktionary entry is the main thing to do. For a
  complete note it's noise.

Goal: clear sections in workflow order, links beside what they feed, and an edit mode that
separates *upgrading a legacy note* from *tweaking a complete one*, marking each changed value
against what Anki holds.

**Verbs are in flux** (see `~/.claude/plans/so-in-theory-that-unified-squid.md`, still being
modelled). `VerbInputs.svelte` keeps its layout and only gets the shared marker props, and the
space under the preposition chips stays free for the help text that plan proposes.

## Target layout

Each section is a card with an `h2`, an optional one-line description, and actions aligned right.
They come in workflow order, with the sticky save bar below:

1. **Word**: Hebrew word, meanings, "Already in your deck", and the dictionary picker. The
   Wiktionary link moves onto the dictionary entry.
2. **Grammar** (Pealim link in the header): part of speech, the inputs for that part of speech,
   pointed word and forms, root, the irregular-plural hint, and the `Grammar` field group
   (Other forms, for prepositions and other).
3. **Media**: Images, with the image searches inside the box (one chip per meaning, plus the
   Hebrew word) and the "No image" checkbox. Audio, with the Forvo link inside the box.
4. **Hints and examples**: "Suggest with Claude" in the header, then the two hints, then
   Examples.
5. **Unusual variants**: each prompt's image search moves into its own Images box.
6. **Notes**.

Sections 4–6 still appear only once a part of speech is chosen, as they do today.

The shell is in place. `ui/Section.svelte` is the card: a `title`, an optional `description`
and an `actions` snippet that sits right of the `h2`. CardEditor renders Word, Grammar and Media
itself, then one Section per remaining entry of `shownGroups`, with `GROUP_HELP` as its
description. `fields/NoteFields.svelte` takes one group's `fields`, rendered through CardEditor's
`noteFields` snippet, and the `Grammar` group's fields render inside the Grammar section under
`WordForms`. `FIELD_GROUPS` in `src/lib/note-type.ts` is `Grammar`, `Hints and examples`,
`Unusual variants`, `Notes`, a UI grouping only. Since a Section is labelled by its heading, the
Notes section and the Notes textarea share an accessible name, so the test harness's `noteField`
looks only at textareas and fieldsets.

## PRs (a stack on `ui-revamp`; ask before pushing)

### PR 1: Claude's section header

- `fields/SuggestButton.svelte` moves from the top of the "Hints and examples" body into that
  Section's `actions` as **Suggest with Claude**, with a violet accent that matches the badge.
  Its idle line says what it fills ("Drafts the blank hints and examples. Each stays marked
  Suggested until you edit it.") and keeps the blocker and error states it has now.
- Tests: update the button name in `CardEditor.suggest.test.ts` and `CardEditor.check.test.ts`.

### PR 2: links beside what they feed

- `media/AudioInput.svelte`: a Forvo `LinkChip` in its header, from its `word` prop. Drop "or
  download it from Forvo" from the hint.
- `media/ImagesInput.svelte`: a `links` snippet prop. CardEditor passes one search chip per
  filled meaning plus a Hebrew one. `NoteFields` passes the variant prompt's search, which comes
  off the label row.
- `word/DefinitionsInput.svelte`: remove the per-row Images (EN) chip.
- `word/DictionaryPanel.svelte`: takes over the Wiktionary link and its "no entry" note from
  `LookupLinks`. The link goes on the picked entry, or in the picker's heading when nothing is
  picked. `wiktionaryEntry` moves from CardEditor into the panel.
- The Grammar section's `actions` get the Pealim chip.
- Delete `word/LookupLinks.svelte`. In `src/lib/links.ts`, keep `LINKS` but drop the "in the order
  the editor shows them" claim, and make the image links' labels fit a "Search images" group.
  Update `PASTE_IMAGE_HELP` in `field-help.ts`.
- Tests: the `Look up` navigation assertions in `CardEditor.test.ts` and
  `CardEditor.dictionary.test.ts` become "link X inside region Y". Keep the blank-input tooltip
  tests.

### PR 3: edit-mode framing

- The header states the mode. New mode shows "New word". Edit mode shows "Editing כֶּלֶב" with a
  "Start a new word" button, which replaces the blue banner. `<title>` follows the mode in
  `+page.svelte`, or in CardEditor through `svelte:head`.
- **Legacy note**: the loaded note has no part of speech, or one no chip offers (`start.inputs.
  partOfSpeech === undefined`). It gets a notice in the Word section: "This note predates the
  current note type. Pick its Wiktionary entry to fill in the blanks, then check each field."
- `DictionaryPanel` in edit mode wraps the candidates in `<details>`. It's open for a legacy note
  and closed for a complete one, with the summary "Fill blanks from Wiktionary (N entries)". New
  mode is unchanged.
- The word input takes focus only in new mode.
- `ExistingNotesPanel` copy: in new mode, "Already in your deck: edit it instead?". In edit mode,
  "Also in your deck with this spelling". The dictionary heading in new mode reads "Start from
  Wiktionary: which word is it?".
- Tests: update the copy in `CardEditor.dictionary.test.ts` and `CardEditor.test.ts`. Add tests
  for the legacy notice, `details` open or closed by note type, and focus by mode.

### PR 4: change markers against what Anki holds

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
- This PR may split into 4a (baseline, TextInput, textareas and the SaveBar line) and 4b (chips,
  definitions, examples and media) if it gets large.
- Tests:
  - A loaded note's changed plural shows "Was" with its old value, and Restore puts it back.
  - A blank field filled from a Wiktionary pick shows "Added".
  - Markers clear after a save.
  - A new note shows no markers.
  - The save bar lists the changed fields.
  - Unit tests for any new pure helper.

## Reuse

- `LinkChip`, `buildLinkUrl` and `LINKS` (`src/lib/links.ts`) for every moved link.
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

- the empty page;
- a new word with an entry picked (שולחן);
- a complete note in edit mode (כלב), with the dictionary collapsed, after changing the plural to
  show the marker and using Restore;
- a legacy note (the old שולחן), with the notice, after picking the entry to show "Added" markers.

Don't click Suggest, Check, Add or Save without asking.

At the end, with permission before **each** action, add up to 3 new words. Candidates: לילה, a
masculine noun with an ־ות plural (exercises the variant hint); מהר, an adverb; and an adjective
not yet in the deck (check with `findNotes` first, since גדול is already a legacy note). Avoid
verbs while they're in flux. Optionally Save one legacy-note upgrade, such as גדול. Each Add or Save runs
Claude's check. Afterwards, list the noteIds to delete in Anki.

Before committing, read `git status` and the diff for secrets, home paths and `data/`.
