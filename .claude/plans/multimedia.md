# Multimedia

## Context

The goal is to run the deck from this app, with Anki's window at most a final click. Media is the
one thing the editor can't do: it leaves `Images` and `Audio` blank, and the human pastes them into
Anki's Add window. A follow-up plan will update existing notes, and it builds on this one.

Here the editor gains images and audio for new notes: it shows them, and stores them so Anki loads
them. The human still finds the media, and still clicks Add.

What the deck holds (103 notes, read 2026-11-01):

- **Images:** 93 notes have one, 6 have two, none has more. Two more sit inside `Variant 1 prompt`,
  and no other field has any.
- **Audio:** 93 notes have exactly one `[sound:…]`, each `pronunciation_he_<word>.mp3`, about 23 KB.
- **Templates:** `{{Audio}}` is the whole Listening front, so a note without audio gets no Listening
  card. `{{#Variant 1 answer}}` gates the variant card, so a prompt may be only an image, but an
  image on a variant with no answer never shows.

## Storing media

The human brings bytes to the editor, which previews them. At hand-off the server stores each file
with `storeMediaFile`, the editor composes the fields from the names Anki returns, and `guiAddCards`
opens the Add window as it does today.

- **Two new AnkiConnect actions, which changes a hard rule.** `storeMediaFile` joins in PR 1 and
  `retrieveMediaFile` in PR 6. Nothing still creates, edits or deletes a note. Each PR updates the
  AGENTS.md rule, `client.ts` and `anki-guard.sh`.
- **`storeMediaFile` is typed as `{ filename, data, deleteExisting: false }` and nothing else.** The
  add-on defaults to replacing, so a second recording under one name would silently change another
  note's audio. With `false`, identical bytes return the same name and different bytes get a new
  one, like the deck's `pronunciation_he_מכונית-adf6a331….mp3`. Fields must therefore use the name
  Anki returns, never the one requested. `url` stays out because it has Anki fetch a third-party
  site on the tool's behalf.
- **Files are stored at hand-off, not on attach.** Until then they are blobs in the browser, gone on
  reload like the rest of the draft, so an abandoned draft leaves nothing in Anki. Handing off twice
  is harmless, since the same bytes keep the same name. Only what reaches the note is stored, which
  leaves out a hidden variant's images.
- **Bytes travel as base64 inside JSON,** because `request-guard.ts` refuses every other content
  type, and that refusal is part of what keeps the web out. adapter-node also refuses bodies over
  512K, but only under `npm start`: `vite dev` and `vite preview` never enforce it. So `start` sets
  `BODY_SIZE_LIMIT=8M`, well under AnkiConnect's own 16 MiB.
- **The app owns the field HTML:** a `<div><img src="…"></div>` per image, and `[sound:…]`, all in
  `src/lib/anki/media.ts`. `alt` is dropped: the deck's are page titles that no card shows.
- **Several images, one sound.** `Images` holds a list, with no cap. `Audio` holds at most one, as
  in every note today.

*Rejected: `guiAddCards`' `audio` and `picture` parameters, the earlier idea here, because they
replace by default, only append to a field, and send every file in one request. Storing first also
leaves a plain field string that `addNote` and `updateNoteFields` can take too.*
*Rejected: writing into `collection.media`, because it hard-codes a profile path and bypasses Anki.*
*Rejected: multipart, as `cfa-web-app` uploads, because a cross-site form can send it, so the guard
would have to loosen.*

## Getting media in

- **One intake for every source.** Paste, drop and the file picker feed one function, so a new
  source needs no code. Google, DuckDuckGo and Image Playground differ only in how the bytes arrive.
- **Paste is the main path,** because Copy Image is what the human does today. An image pasted
  anywhere on the page goes to the variant prompt holding focus, otherwise to `Images`. A paste with
  no image behaves as usual.
- **Images are re-encoded in the browser:** drawn to a canvas with the long edge capped (1000 px to
  start), then saved as JPEG over white, since transparent clip art would otherwise turn black. Copy
  Image tends to hand over a PNG whatever the original was, and media syncs to the phone. Decoding
  doubles as validation: what the browser can't decode is refused with a message. The name is
  `paste-<sha1>.jpg`, Anki's own convention.
- **A drop that carries only a URL is refused,** with a prompt to copy the image instead. Dragging
  from a web page can do this, and the tool never fetches.
- **Variant prompts take images through the same widget,** on the two fields `searchesImages` marks.
  The images stay apart from the textarea's text and follow it at hand-off, under the rule that a
  hidden field gets nothing from the human.
- **Audio has the same intake,** so any source works. Forvo just has a shortcut, below.

*Rejected: `sharp`, as `cfa-web-app` uses, because canvas does this with no dependency.*
*Rejected: WebP output, because a canvas that can't encode it silently gives PNG.*

### Forvo pickup

After the human downloads a pronunciation, the editor finds it in Downloads. It looks when the word
changes and whenever the tab regains focus, and only while the note has no audio.

- **Match on `toComparisonKey`,** after turning `_` back into spaces and dropping a browser's
  ` (1)`. That matches 93 of the deck's 93 filenames to their note's `Hebrew`. Three of them are
  pointed (`מָלוֹן`), so a plain string comparison would miss them.
- **One match attaches itself,** shown with a player and a remove button. Several become choices,
  per Never guess. None shows nothing, and drop still works.
- **A found file becomes an ordinary attachment.** The browser fetches it from this server, so
  everything after that is PR 4's code. It is stored under its name without the browser's suffix.
- **The server reads one directory and never writes to it.** It lists names matching the pattern
  and serves only a name from that list, so no request path ever reaches the filesystem. The
  directory is `Downloads` under `os.homedir()`, overridable by an environment variable. macOS can
  refuse a process access to Downloads, so `EPERM` becomes a message rather than a failure.

*Rejected: `fs.watch` with an event stream, because the human has to come back to this tab anyway.
A focus check finds the file just as soon, with no long-lived process, and a partial download is
never seen because `.crdownload` doesn't match.*
*Rejected: checking from the server whether Forvo has the word, because Forvo answers 403 to
anything that isn't a browser.*

## Sites' terms

The line: automate what happens after the human's download, never the download. The tool keeps
making no third-party request, and handles only bytes the human brought to it.

- **Forvo.** Its [license](https://forvo.com/license/) allows non-commercial use, but says "Repeated
  and / or systematic utilization of parts of the contents of a database … is not permitted." The
  [API](https://api.forvo.com/documentation/general-information/) can't fill a note: "It is not
  allowed to cache audio pronunciations," and its links last two hours. So the human clicks
  download, one word at a time, and the tool never backfills.
- **Images.** The human copies one image for private study, as today. No search API, no scraping,
  and no results inside the app.
- **Nothing of theirs enters this public repo.** Tests build their own bytes, an exception to
  Fixtures are real data. Anki fixtures may name media files, which is all they do today.
- **The deck stays private.** Sharing it would redistribute other people's audio and images.

*Rejected: a browser extension or script that clicks Forvo's download, and scraping add-ons like
`anki-forvo-dl`, because either is the systematic use the license rules out.*

**Open:** read Forvo's [terms](https://forvo.com/terms-and-conditions/) in a browser before PR 5.
Both pages answer 403 to anything else, so the license quote above comes from a search excerpt, and
the terms themselves went unread.

## PR 1 — Store media in Anki

No UI yet.

- `storeMediaFile` on the allowlist, typed as above. AGENTS.md also adds it to the actions not to
  call against real Anki without asking, and `anki-guard.sh` prompts on it.
- `POST /api/anki/media` takes `{ filename, data }` and answers with the name Anki used. It refuses
  anything but image and audio extensions, because card webviews load from the media folder.
- `src/lib/anki/media.ts` composes the HTML, and `handOffFields` gains the stored names, keeping its
  hidden-field rule.
- `BODY_SIZE_LIMIT` in the `start` script.

## PR 2 — Images on a word

- A Media section under `LookupLinks`, with thumbnails, remove, paste, drop and pick.
- `HandOffBar` stores one file at a time, then opens the Add window. A failed store stops before the
  window opens and says so. It stops telling the human to finish the note there.
- `note-type.ts` no longer says the human pastes media, and the README describes the hand-off.
- Canvas is the one thing here jsdom lacks, so the sizing is a pure function with tests, and the
  draw itself is mocked and checked by hand.
- From `cfa-web-app`'s `file-drop-zone.svelte.ts`, take the idea of paste through
  `clipboardData.items` and `getAsFile()`, a `<label>` around a hidden input, resetting `input.value`
  so a file can be picked twice, revoking object URLs, and saying why a file was refused. Leave its
  class, context and crop dialog.

## PR 3 — Images on variants

- The widget beside each variant prompt, and the pasted-image routing by focus.
- A hint when a variant has an image but no answer, since no card would show it.
- Switching to a part of speech that hides variants keeps its images out of the hand-off.

## PR 4 — Audio by hand

- One attachment with `<audio controls>`, its filename and remove, through the same intake and
  store. Audio bytes pass through unchanged.
- A hint when a note has no audio, because it gets no Listening card, and with Anki's window on its
  way out, the editor is where that gets noticed.
- **Open:** which extensions to accept beyond `.mp3`, once checked on the phone.

## PR 5 — Find Forvo downloads

- A server module and two `GET` routes, for the names matching a word and for one file's bytes.
- The focus check, choices for several matches, and dropping found audio when the word changes.
- The key function lives in `src/lib/hebrew/`, per the Hebrew text rules.
- The README gains what the tool reads on this machine.

## PR 6 — Show the deck's own media

- `retrieveMediaFile` on the allowlist, read-only in `anki-guard.sh`. It answers `false` for a
  missing file.
- `GET /api/anki/media/[filename]` serves bytes only for an allowlist of extensions, with `nosniff`
  and a sandboxing CSP. The media folder can hold anything, and an SVG or HTML file served from this
  origin could script `/api/anki/add`.
- `mediaReferences(html)` in `src/lib/anki/media.ts`, tested on every wrapper the deck has: `<img>`,
  `<div><img></div>`, `<img><br><img>`, nested `div`s and an image after a variant's text. Capture a
  real two-image note as a fixture.
- `ExistingNotesPanel` shows each note's images and a player, so a duplicate check shows the card
  itself, and the app can see what Anki actually kept.

## What the follow-up inherits

- Field strings that `updateNoteFields` and `addNote` can take unchanged.
- `mediaReferences` and the serving route, to load a note's media into the editor. It still has to
  split a variant prompt into its text and its images.
- **Open:** whether `addNote` and `updateNoteFields` join the allowlist. That is the larger change
  to the hard rule, and this plan doesn't make it.
- **Open:** offer Wiktionary's recording as a link for a word Forvo lacks. About 15% of dictionary
  entries carry a Wikimedia Commons `mp3_url`, which `source.ts` doesn't read yet. It stays a link
  under Never reach a third-party site.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte file
  until clean.
- Hand-off tests, through `fakeAnki`: `storeMediaFile` gets `deleteExisting: false`, a field uses the
  returned name rather than the requested one, a hidden variant's images are never stored, and a
  failed store never reaches `guiAddCards`.
- `request-guard.ts` and its tests stay unchanged.
- Under `npm start`, not only `npm run dev`: attach an image whose base64 passes 512K.
- By hand in real Anki, only with the human's go-ahead: a noun with two images, audio and a variant
  with an image. The Add window shows them, Preview shows the Production front, the Listening front
  plays, Variant 1 shows its image, and Tools → Check Media reports nothing missing. Then sync and
  check the phone, and hand off the same note twice to see one set of files.
- By hand in the browser: copy from Google, DuckDuckGo and Image Playground, and drag from each.
- **Open:** what Image Playground hands over. A HEIC file won't decode in most browsers, so copy
  may be the only path for it.
