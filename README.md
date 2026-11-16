# Anki Hebrew Card Creation

A local helper for making Hebrew Anki cards. You type a word, and it does the rote part: lookup
links, the pointed forms, the plural and gender fields, and a check for whether the word is
already in your deck. Paste, drop or pick images and an MP3 recording, and it stores them in Anki
when you click Add to deck. Open a note already in the deck and it saves your changes to it when
you click Save changes, after showing what will change. It writes a note only when you click, and
never deletes one; review and delete cards in Anki.

It is built for my own deck and note type, which `src/lib/note-type.ts` describes. To adapt it,
edit that file.

## Requirements

- [Anki](https://apps.ankiweb.net/) desktop, running while you use the tool.
- The [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on.
- [Node.js](https://nodejs.org/) 24 or newer.
- An Anthropic API key, set up as in [Claude](#claude).

## Setup and running

Download the dictionary, an extract of English Wiktionary's Hebrew entries: on
[kaikki.org's Hebrew page](https://kaikki.org/dictionary/Hebrew/), download the postprocessed
JSONL (about 60 MB) and save it as `data/kaikki.org-dictionary-Hebrew.jsonl`. Then index it, which
takes a few seconds; lookups fail until you do:

```sh
npm install
npm run build-index
npm run dev      # http://127.0.0.1:5173
```

Or build it once and run that:

```sh
npm run build
npm start        # http://127.0.0.1:3000
```

To pick up a newer Wiktionary, download the file again and rerun `npm run build-index`. The editor
says when the index is older than the file.

### Keep it running (macOS)

To have the built app start at login and come back if it crashes, without a terminal open, install
it as a launchd agent. Clone this folder outside `~/Documents` and `~/Desktop`, which macOS guards
and iCloud may sync. Then:

```sh
npm run build
npm run launch-agent install
```

Bookmark `http://127.0.0.1:3000`. Anki desktop must be open to add cards. The log is
`~/Library/Logs/local.anki-hebrew-card-creation.log`.

After you rebuild or edit `.env`, run `npm run launch-agent restart`. To stop it for good, run
`npm run launch-agent uninstall`. If you upgrade Node with something other than Homebrew or the
official installer, run `install` again.

### Claude

Claude suggests examples and hints, and checks a note before each add or save, which you can save
past. Both need the dictionary index too.

The server won't start without an Anthropic API key. Create one in the
[Claude Console](https://platform.claude.com/), set a monthly spend limit there, and put the key in
a `.env` file at the top of this folder, which git ignores:

```sh
ANTHROPIC_API_KEY=sk-ant-...
```

Restart the server to pick it up.

The server only listens on `127.0.0.1`. Don't expose it: anything that can reach it can change the
notes in your collection, add new ones and add files to its media folder.

## What it reads on your machine

- **The dictionary** you saved in `data/`, and the index built from it.
- **Your Downloads folder, for Forvo pronunciations.** Download a word's MP3 from Forvo, come back
  to the tab, and the editor attaches it. It lists the folder's names, reads only the files that
  look like Forvo downloads, and never writes there. Set `FORVO_DOWNLOADS` in `.env` to look in
  another folder. On macOS, the first look asks whether your terminal may read Downloads, or `node` when it
  runs at login. If you'd rather not allow it, choose or drop the MP3 instead.

## What it sends over the network

- **To AnkiConnect, on your machine:** read-only queries about your decks, note types and notes,
  and reads of their images and audio, plus the calls that add a note, save an edited one and store
  images and audio in your media folder.
- **To Anthropic, only when you ask for suggestions, a check or a save:** the word you're editing,
  its part of speech and its fields' text, and the dictionary's definitions of other entries
  spelled the same. Images, audio and the rest of your deck stay on your machine.
- **To other third-party sites:** nothing. Links to Wiktionary, Pealim, Forvo and image search are
  only opened when you click them.

## Licenses

The code is [MIT](LICENSE). Wiktionary's content, including the dictionary extract and any test
fixtures taken from it, is [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and
keeps that license.
