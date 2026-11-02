# Parts of speech

## Context

The editor knows all seven parts of speech, each note stores which one it is, nouns, verbs and
adjectives all take a root, and a verb's principal parts fill in from Wiktionary. What remains is to
put those roots to use.

The goal is a form that fits the word, with less typing. Storing the part of speech also prepares for editing existing notes: with seven of them, the app
cannot infer one from `Gender` and `Binyan`. Notes made before the field existed have it blank.

Builds on dictionary lookup, prefill and plural hints, which have landed. No new dependencies, and
no new AnkiConnect actions.

## Decisions

- **Seven parts of speech:** Noun, Verb, Adjective, Adverb, Preposition, Phrase, Other. Lookup
  picks one from the dictionary entry, so the human rarely chooses.
- **`Part of speech` is a hidden field,** not a tag. It is composed, like `Production answer`, and
  holds the lowercase `PartOfSpeech` value, as `Binyan` and `Gender` do.
  *Rejected: a `pos::` tag, because the app reads and drift-checks fields; a saved search gives the
  same one-click filter.*
- **Roots go on nouns, verbs and adjectives, and are optional on all three.** These are the kinds
  Hebrew builds from a root and a pattern. Wiktionary gives one for about 45% of nouns, 52% of
  adjectives and 96% of verbs, and the blanks include native words like כלב, so a blank `Root` says
  nothing about the word. Only a mistyped root blocks. Adverbs have a root about 16% of the time
  and phrases almost never, so neither shows it.
  *Rejected: requiring a verb's root. Nearly every verb has one, but the human shouldn't have to
  work one out for the 4% Wiktionary lacks, like פנצ׳ר, just to save a card.*
- **A root is spelled one way,** by `formatRoot`: maqafs, its last letter final and no other, and
  no shin or sin dot, so the same root is the same text. The same-root panel will therefore group
  שׁ־כ־ר, “drunk”, with שׂ־כ־ר, “wage”: a false match the human can see at a glance, which `root.ts`
  accepts so that a typed root still finds a dictionary one.
- **Several values stay choices,** per the Never guess rule. For roots that includes a blend's two,
  like רמקול's, and a Wiktionary category that disagrees with a conjugation's stem; `build.ts` says
  which source wins when.
- **A new part of speech announces its own gaps.** `PlainPartOfSpeech` in `note-type.ts` names its
  members, so adding to `PARTS_OF_SPEECH` breaks the switches over it until each case exists, and
  the `FIELD_HELP` test fails until the variants, `productionContext`, `readingContext` and
  `examples` have its help.
  `PARTS_OF_SPEECH_WITH_VARIANTS` includes it without asking.

*Rejected for now: a noun's construct form, because it is mostly predictable and adds a line to
every noun card. Storing the pattern (משקל), because it is advanced for a beginner. Variant
suggestions beyond plurals: `verb.ts` says why not for a verb.*

## What each part of speech shows

| | Inputs beyond the word | Production answer | `Forms` | Variants |
|---|---|---|---|---|
| Adjective | three forms, optional root | word | composed | yes |
| Noun | gender, forms, optional root | `כלב טוב` | composed | yes |
| Verb | preposition, binyan, optional root, principal parts | `לדבר עם` | composed | yes |

## PR 1 — Same-root panel

- `searchByFieldEqualing` in `src/lib/anki/search.ts`, and `findNotesWithRoot` beside
  `findExistingNotes` in `src/lib/server/anki/existing-notes.ts`, using `findNotes` and `notesInfo`.
- A new `/api/anki/same-root` route, shaped like `/api/anki/existing`.
- A panel listing other notes in the deck with that root, first extracting `ExistingNotesPanel`'s
  list and its Browse link so both can use them. The maqafs make this search awkward to type in
  Anki, so this is where roots pay off. A note's blank `Root` matches nothing, and a blend's note
  holds only the root the human chose.

## Verification

- `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte file until
  clean.
- Tests for the search, `findNotesWithRoot` and the route, and `CardEditor.test.ts` covers when the
  panel appears.
- By hand in the running app, without handing off to real Anki unless you agree: גדול, כתובת and
  לדבר.
