# Editing and saving notes

## Context

The app finds a word's notes but can only open them in Anki's Browse, and a new note still ends
with a click in Anki's Add window. Here both move into the app: the editor loads an existing note,
and saves a new or edited one itself. Anki stays the place to review cards and to delete a note.

This reverses a hard rule, "Nothing here creates, edits or deletes a note; I click Add myself." The
human still makes every write, by clicking Save in the app.

The design is for the deck this is heading to, where a loaded note is usually right. Old notes get
no special handling: they load like any other, and the human cleans up what's wrong.

**Loading tolerates anything; saving requires everything.** The goal is a deck of only valid notes,
and the human is fixing today's violations. So any note loads, however incomplete, with each blank
or unreadable value left unchosen, but no save, of an edit or a new note, reaches Anki until every
required input is filled. The one gate is `stillNeeded`, the same check a new note passes today.

The flow: type a word, click its note under "Already in the deck", change what needs changing, ⌘↵,
read what will change, ⌘↵.

Two facts about today's deck (104 notes, read 2026-11-10) still shape the work:

- **Every note is missing a required input.** 103 have a blank `Part of speech`, 45 blank
  `Definitions` and 5 no image, so each one's first save asks the human to finish it. Every one of
  them loads through `draftFromNote` without error.
- **Images:** 105 across 99 notes, in six wrappers, and most with an `alt`. 89 are `.jpg`; the rest
  are `.png` (9), `.jpeg` (4), `.webp` (2) and `.JPG` (1).

## Loading a note

The editor already opens a note. Clicking one under "Already in the deck" fetches it from
`GET /api/anki/notes/[noteId]` as a `LoadedNote`, and `+page.svelte` remounts `CardEditor` with it
as `note`, which `draftFromNote` turns into the starting draft. What saving builds on:

- **Loading tolerates anything.** Every value shows as the note holds it, old formats included. A
  value no chip offers stays unchosen, with error text naming it, so `missingInputs` already blocks
  its save. A `Pointed` that doesn't spell `Hebrew` (`spellsWord`) only warns, because 1.5% of the
  dictionary's pointed lemmas fail that comparison, some correctly spelled, and a block would leave
  the human no way past.
- **Required inputs are the same as for a new note.** `stillNeeded` gates every save, with nothing
  specific to edits. "No image for this word" has no field to live in, so it is ticked again each
  time.
- **A stored file stays a name.** `attachmentsToStore` leaves a `StoredAttachment` out, and
  `handOffFields` writes its name as it stands.
- **The editor holds the note it edits.** `note` carries `notesInfo`'s `mod`, which the save sends
  back. `readNote` in `src/lib/server/anki/notes.ts` finds the note before reading it, so a missing
  note or one of another type is `undefined`, and the route's 404.
- **While a note is loaded, the bar refuses,** through `HandOffBar`'s `editing`, because Open in
  Anki would add a duplicate. Saving an edit replaces that refusal.

*Rejected: recognizing the old `[ms]` and `(פעל)` formats, to parse them or keep them out of the
inputs, because the deck is headed to one format, and the 42 notes that hold them are the human's to
clean up. A dictionary pick usually replaces one in a click.*
*Rejected: fetching stored files into blobs, because `STORABLE_FILENAME` refuses 16 of the deck's
images by extension, and re-sending unchanged bytes achieves nothing.*

## Saving

- **A save writes only what it changes, and keeps everything else as Anki holds it.**
  `changedFields(held, next)` in `src/lib/anki/changes.ts` drops every field that still reads the
  same: its text compared under NFC, with `&nbsp;` and `<br>` as spaces and runs of space collapsed,
  and its image names in order, both through `splitImages`. Any other markup counts, so bolding a
  word is a change, and a text input that strips a note's tags shows up in the review. `updateNoteFields` gets only what's left, so `alt` text, wrappers and
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
  That is why `readNote` runs `findNotes` first, and a save's 404 goes through it too.
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

## PR 1 — Save an edit

- `updateNoteFields` in `client.ts`, `anki-guard.sh`, and the AGENTS.md rule.
- `POST /api/anki/notes/[noteId]`, taking `{ fields, mod }`: refuse unknown fields as
  `/api/anki/add` does, 404 through `readNote`, 409 on `mod`, write, read back.
- The review step in the bar in place of the `editing` refusal, Saved with Next word, and Load
  again.
- `request-guard.ts`'s header comment and the README: the server can now change notes, which raises
  the stakes of "Don't expose it".

## PR 2 — Add without the Add window

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
- **Open:** once the deck has roots, search for a note's root in `findExistingNotes`, so its word
  family lands in Related. The substring search can't find למד from תלמיד.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte file
  until clean. Route tests use `fakeAnki`, covering a missing note, another note type, a stale `mod`,
  a duplicate and an Anki failure.
- `request-guard.ts`'s logic and its tests stay unchanged.
- Before PR 1, by hand while nothing can write yet: open a noun, a verb, a note with a labelled
  `Pointed`, a two-image note and כלב, and check each input, image, player and variant. The labelled
  `Pointed` shows its warning.
- Before the first real save, the human backs up the collection. Then, by hand in real Anki and only
  with the human's go-ahead, for PR 1:
  - Finish a note with a labelled `Pointed`, leaving that field alone. Browse shows only the listed
    fields changed, `Pointed` keeps its line breaks, and Preview shows the note's cards.
  - Anki's Undo takes the save back.
  - Save with the note open in Browse: refused, with the message. Close it and save again.
  - Load a note, edit it in Anki, then save: refused, and Load again shows Anki's version.
  - Add audio to a note with none: a Listening card appears. Then sync and check the phone.
- For PR 2, the same way: add a noun, then change it and save, and one note exists. Add a second note
  with the same `Hebrew`, and it needs Add anyway.
- Under `npm start`, not only `npm run dev`: save a note with new media.
