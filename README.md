# Anki Hebrew Card Creation

A local helper for making Hebrew Anki cards. You type a word, and it does the rote part: lookup
links, the pointed forms, the plural and gender fields, and a check for whether the word is
already in your deck. Then it opens Anki's own Add window, pre-filled. You finish the note there
and click Add. The tool never adds, edits or deletes a note itself.

It is built for one note type and one deck, but every field name and format lives in config, so
it can be adapted.

**Status:** early. The page is a placeholder for now.

## Requirements

- [Anki](https://apps.ankiweb.net/) desktop, running while you use the tool.
- The [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on.
- [Node.js](https://nodejs.org/) 24 or newer.

## Setup and running

```sh
npm install
npm run dev      # http://127.0.0.1:5173
```

Or build it once and run that:

```sh
npm run build
npm start        # http://127.0.0.1:3000
```

If you have set an API key in AnkiConnect, copy `.env.example` to `.env` and fill it in.

The server only listens on `127.0.0.1`. Don't expose it: anything that can reach it can open Add
windows in your Anki.

## What it sends over the network

- **To AnkiConnect, on your machine:** read-only queries about your decks, note types and notes,
  plus the calls that open the Add and Browse windows.
- **To Wiktionary:** a HEAD request for a word's page, so a missing page is flagged before you
  click its link. Nothing else is fetched from any third-party site. Other links (Pealim, Forvo,
  image search) are only opened when you click them.

## The dictionary

Offline lookups come from [kaikki.org](https://kaikki.org/)'s machine-readable extract of
English Wiktionary's Hebrew entries. Download it yourself into `data/`, which git ignores.

## Licenses

The code is [MIT](LICENSE). Wiktionary's content, including the dictionary extract and any test
fixtures taken from it, is [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and
keeps that license.
