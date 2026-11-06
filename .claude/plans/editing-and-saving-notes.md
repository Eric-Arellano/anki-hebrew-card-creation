# Editing and saving notes

## Context

The app finds a word's notes but can only open them in Anki's Browse, and a new note still ends
with a click in Anki's Add window. Here both move into the app: the editor loads an existing note,
and saves a new or edited one itself. Anki stays the place to review cards and to delete a note.

This reverses a hard rule, "Nothing here creates, edits or deletes a note; I click Add myself." The
human still makes every write, by clicking Save in the app.

The design is for the deck this is heading to, where a loaded note is usually right. Old notes get
no special handling: they load like any other, and the human cleans up what's wrong.

The flow: type a word, click its note under "Already in the deck", change what needs changing, ⌘↵,
read what will change, ⌘↵.

Two facts about today's deck (103 notes, read 2026-11-01) still shape the work:

- **Every note is missing a required input.** All 103 have a blank `Part of speech`, 45 blank
  `Definitions` and 4 no image, so each one's first save asks the human to finish it.
- **Images:** 105 across 99 notes, in six wrappers, and most with an `alt`. 89 are `.jpg`; the rest
  are `.png` (9), `.jpeg` (4), `.webp` (2) and `.JPG` (1).

## Loading a note

`draftFromNote` turns a note's raw fields into everything the editor holds. It is composition run
backwards, so each reader sits beside the writer it undoes, and a change to one shows up next to the
other.

- **Every value shows as the note holds it, right or wrong.** A text input takes the field's text,
  and a textarea its HTML with `<br>` back as new lines. Nothing checks a value for an old format, so
  a `Pointed` of `[ms] חָבֵר<br>[fs] חֲבֵרָה` loads as `[ms] חָבֵר [fs] חֲבֵרָה`, and stays as it was unless
  the human changes it. The word's dictionary entries are on screen too, because a loaded note has
  no `picked`, for when they'd rather replace it.
- **A value the chips don't offer is an error, not a quiet blank.** `Part of speech`, `Gender`,
  `Binyan` and a verb's preposition stay unchosen, with error text under the chips naming what the
  note holds, until the human chooses. They are required, so `missingInputs` already blocks the save.
  A mistyped `Root` already behaves this way through `ifMistypedRoot`, and needs nothing new.
- **A `Pointed` that doesn't spell `Hebrew` gets a warning, but no block.** It's one comparison of
  `toDefectiveKey`s, which knows nothing of any format, and it applies to new notes too, where it
  catches a typo. On the deck it flags all 42 notes in an old format and none of the other 61. It
  can't block, because 197 of the dictionary's 13,469 pointed lemmas (1.5%) fail it, some of them
  correctly spelled, like `קראטה` and `קָרָטֶה`, and the human would have no way past.
- **`Definitions` splits on `<br>`,** one row a line, and drops the `1. ` numbering.
- **`Forms` fills every slot its labels fit,** across noun, adjective and verb, since the draft keeps
  each part of speech's inputs anyway.
- **A verb's preposition and a noun's `pluralOnly` come from `Production answer`,** the only place
  either is stored: whatever follows the word. A blank ending leaves the preposition unchosen, and
  an unrecognized one counts as a value the chips don't offer.
- **Required inputs are the same as for a new note.** `missingInputs` and the image-or-opt-out check
  gate every save, with nothing specific to edits. "No image for this word" has no field to live in,
  so it is ticked again each time.
- **A stored file stays a name.** Attachments become `{ kind: 'new', filename, blob }` or
  `{ kind: 'stored', filename }`. A stored one previews from `GET /api/anki/media/[filename]`, and
  only new ones go through `storeMedia`.
- **A variant prompt splits into its text and images** with `splitImages`, the one reader of image HTML.
- **Loading is a remount.** `{#key card}` already gives each card a fresh editor, so `+page.svelte`
  passes the note as a seed. It replaces the draft, so it asks first when anything beyond the word
  has been typed.
- **Each note in `ExistingNotesPanel` becomes a button that loads it,** and the panel leaves out the
  note being edited, which would otherwise report itself as already in the deck.

*Rejected: recognizing the old `[ms]` and `(פעל)` formats, to parse them or keep them out of the
inputs, because the deck is headed to one format, and the 42 notes that hold them are the human's to
clean up. A dictionary pick usually replaces one in a click.*
*Rejected: fetching stored files into blobs, because `STORABLE_FILENAME` refuses 16 of the deck's
images by extension, and re-sending unchanged bytes achieves nothing.*

## Saving

- **A save writes only what it changes, and keeps everything else as Anki holds it.**
  `changedFields(held, next)` drops every field that still reads the same: its text compared under
  NFC, with `&nbsp;` and `<br>` as spaces and runs of space collapsed, and its image names in order,
  both through `splitImages`. `updateNoteFields` gets only what's left, so `alt` text, wrappers and
  the line breaks of a `Pointed` the human left alone all survive. With nothing left, Save is
  disabled.
- **An edit shows what it will change, then asks.** The first ⌘↵ lists each changed field, before
  and after, and the second writes. This is the last look the Add window used to give, and where
  anything the inputs couldn't hold gets caught, like a `Forms` line with a label no input has. A new
  note skips it, since it overwrites nothing.
- **The hidden-field rule stands.** A field hidden for the chosen part of speech gets only what
  composition gives it, so marking a note with a variant as an adverb blanks that variant. The
  review lists it.
- **A note changed since it loaded is refused.** The editor holds `notesInfo`'s `mod` and sends it
  back. The server compares it just before writing and answers 409, and the bar offers Load again.
  Anki edits and syncs change `mod`; reviewing a card doesn't.
- **Every write answers with the note as Anki now holds it,** which becomes the new `held`. The
  editor never assumes what Anki kept.
- **A new note is added at once, and the editor becomes an edit of it.** A second Save updates that
  note, rather than adding a duplicate. It keeps what the Add window allowed: fixing something right
  after the hand-off.
- **Duplicates ask, once.** `addNote` goes first with `allowDuplicate: false`. Anki's refusal becomes
  a 409 and an "Add anyway" button, which resends with `true`. The deck will hold homographs: the
  field help's own example is ספר.
- **Media still goes first.** The bar stores new attachments before the write, and a failure stops
  it, as `HandOffBar` does today.

## What the add-on does

Read from the installed add-on's `legacy.py`, `services.py` and `gui.py`. It's a rewrite of
AnkiConnect behind the same action names, so upstream's docs aren't a safe guide.

- **`updateNoteFields` runs `col.update_note`, with undo policy `single`,** so Anki's Undo should
  take back the latest save. It leaves tags, deck and scheduling alone.
- **A note open in any editor refuses the write,** Browse included, with `editorConflict`: "Close
  the affected editor before this API write, even if its content is saved." "Browse in Anki" can
  cause that, and the message reaches the human as it stands.
- **`notesInfo` answers `[{}]` for a missing note,** which `noteInfoSchema` would turn into a 502.
  So `readNote` runs `findNotes` for `note:Hebrew nid:…` first and answers 404 on nothing, which
  also confines loading and saving to this note type.
- **Filling `Audio` or a variant answer should add a card on save.** Blanking one leaves an empty
  card, for Tools → Empty Cards in Anki, since nothing here deletes.

## The hard rule

- **`updateNoteFields` and `addNote` join the allowlist, and `guiAddCards` leaves it.** `guiBrowse`
  stays, because deleting a note and seeing its rendered cards still happen in Anki.
- **Agents still can't write.** `anki-guard.sh` keeps denying both actions, now with a reason of
  their own, so only the app's Save sends them. AGENTS.md extends "without asking" to clicking Save
  in a running app against the real Anki.
- **Nothing else joins.** `deleteNotes` and every tag, deck and scheduling action stay out.

*Rejected: `updateNote`, because it can also rewrite tags. The `audio` and `picture` parameters stay
out for the reason `storeMediaFile`'s `url` does.*

## PR 1 — Read a note back

Pure functions, with nothing calling them yet.

- `draftFromNote` in `src/lib/card/from-note.ts`, with the readers beside `formsHtml`,
  `composeNounFields`, `composeVerbFields` and `composeAdjectiveFields`. It also returns each value
  no chip offers.
- `splitImages` in `src/lib/anki/media.ts`, tested on every wrapper the deck has: `<img>`,
  `<div><img></div>`, `<img><br><img>`, nested `div`s and an image after a variant's text.
- `ankiFieldHtmlToTextarea` in `src/lib/anki/html.ts`.
- `changedFields`, tested on the deck's six image wrappers, both variant prompts and a `Pointed`
  with line breaks.
- The round trip: for each part of speech, `composeFields` output loads and composes back with no
  changed fields.
- Capture real fixtures in `tests/fixtures/anki/`: a labelled `Pointed`, which loads as it is and
  saves unchanged, and a two-image note.

## PR 2 — Stored media in the widgets

A prefactor: nothing creates a stored attachment yet.

- `retrieveMediaFile` on the allowlist: the AGENTS.md rule, `client.ts`, and read-only in
  `anki-guard.sh`. It answers `false` for a missing file.
- `GET /api/anki/media/[filename]` serves bytes only for the extensions the deck holds, matched
  without regard to case: `.jpg`, `.jpeg`, `.png`, `.webp` and `.mp3`. The 16 images that aren't
  `.jpg` would otherwise show broken. It sets the type from the extension, with `nosniff` and a
  sandboxing CSP, because the media folder can hold anything, and an SVG or HTML file served from
  this origin could script `/api/anki/add`.
- The attachment type above, through `ImagesInput`, the audio widget and the bar's store step.

## PR 3 — Open a note in the editor

Ships with no way to save, so the human can open notes and see how they read before anything writes.

- `mod` on `noteInfoSchema`, `readNote` in `src/lib/server/anki/notes.ts`,
  `GET /api/anki/notes/[noteId]`, and `LoadedNote` in `src/lib/api/anki.ts`.
- The panel's buttons, the confirm before replacing a draft, and the seed through `+page.svelte`.
- An "Editing" banner with New word.
- Error text on `ChoiceChips`, and the `Pointed` warning, with its comparison in
  `src/lib/hebrew/normalize.ts` per the Hebrew text rules.
- The bar refuses while a note is loaded, because Open in Anki would add a duplicate.

## PR 4 — Save an edit

- `updateNoteFields` in `client.ts`, `anki-guard.sh`, and the AGENTS.md rule.
- `POST /api/anki/notes/[noteId]`, taking `{ fields, mod }`: refuse unknown fields as
  `/api/anki/add` does, 404 through `readNote`, 409 on `mod`, write, read back.
- The review step in the bar, Saved with Next word, and Load again.
- `request-guard.ts`'s header comment and the README: the server can now change notes, which raises
  the stakes of "Don't expose it".

## PR 5 — Add without the Add window

- `addNote` in `client.ts` and `POST /api/anki/notes`, answering 409 on Anki's duplicate refusal.
- "Add to deck" and "Add anyway", and the move into editing the new note.
- Remove `guiAddCards`, `/api/anki/add`, `openAddWindow` and the Replace and open step.
- `HandOffBar` and `handOffFields` get names for what they do now.
- The README's opening and network sections, the `client.ts` comment, and the rest of AGENTS.md.

## Open

- **Open:** a way to walk the unfinished notes, rather than finding each by typing its word. A blank
  `Part of speech` is the query.
- **Open:** a card preview in the app, since the Add window's Preview goes with it. Browse → Preview
  still works.
- **Open:** offer Wiktionary's recording as a link for a word Forvo lacks. About 15% of dictionary
  entries carry a Wikimedia Commons `mp3_url`, which `source.ts` doesn't read yet. It stays a link
  under Never reach a third-party site.
- **Open:** once the deck has roots, search for a note's root in `findExistingNotes`, so its word
  family lands in Related. The substring search can't find למד from תלמיד.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte file
  until clean. Route tests use `fakeAnki`, covering a missing note, another note type, a stale `mod`,
  a duplicate and an Anki failure.
- `request-guard.ts`'s logic and its tests stay unchanged.
- After PR 3, by hand and with nothing able to write: open a noun, a verb, a note with a labelled
  `Pointed`, a two-image note and כלב, and check each input, image, player and variant. The labelled
  `Pointed` shows its warning.
- Before the first real save, the human backs up the collection. Then, by hand in real Anki and only
  with the human's go-ahead, for PR 4:
  - Finish a note with a labelled `Pointed`, leaving that field alone. Browse shows only the listed
    fields changed, `Pointed` keeps its line breaks, and Preview shows the note's cards.
  - Anki's Undo takes the save back.
  - Save with the note open in Browse: refused, with the message. Close it and save again.
  - Load a note, edit it in Anki, then save: refused, and Load again shows Anki's version.
  - Add audio to a note with none: a Listening card appears. Then sync and check the phone.
- For PR 5, the same way: add a noun, then change it and save, and one note exists. Add a second note
  with the same `Hebrew`, and it needs Add anyway.
- Under `npm start`, not only `npm run dev`: save a note with new media.
