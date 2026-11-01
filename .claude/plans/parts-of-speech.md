# Parts of speech

## Context

The editor knows noun, verb, adjective, adverb, phrase and other. Prepositions still land in Other,
so their suffixed forms are typed by hand, while Wiktionary has them.

The goal is a form that fits the word, with less typing. Each new input is filled from Wiktionary,
and each part of speech gets its own help. Storing the part of speech also prepares for editing
existing notes: with seven of them, the app can no longer infer one from `Gender` and `Binyan`.

Builds on dictionary lookup, prefill and plural hints, which have landed. No new dependencies, and
no new AnkiConnect actions.

## Decisions

- **Seven parts of speech:** Noun, Verb, Adjective, Adverb, Preposition, Phrase, Other. Lookup
  picks one from the dictionary entry, so the human rarely chooses.
- **`Part of speech` is a hidden field,** not a tag. It is composed, like `Production answer`.
  *Rejected: a `pos::` tag, because the app reads and drift-checks fields; a saved search gives the
  same one-click filter.*
- **Roots go on nouns and adjectives too,** optional there and still required for verbs. These are
  the three kinds Hebrew builds from a root and a pattern. Adverbs have a root in Wiktionary only
  about 12% of the time and phrases almost never, so neither shows it.
- **Several values stay choices,** per the Never guess rule, including every cell of a preposition.
- **A new part of speech announces its own gaps.** `PlainPartOfSpeech` in `note-type.ts` names its
  members, so adding to `PARTS_OF_SPEECH` breaks the switches over it until each case exists, and
  the `FIELD_HELP` test fails until the variants, `productionContext`, `readingContext` and
  `examples` have its help.
  `PARTS_OF_SPEECH_WITH_VARIANTS` includes it without asking.

*Rejected for now: a noun's construct form, because it is mostly predictable and adds a line to
every noun card. Storing the pattern (משקל), because it is advanced for a beginner. Variant
suggestions beyond plurals.*

## What each part of speech shows

| | Inputs beyond the word | Production answer | `Forms` | Variants |
|---|---|---|---|---|
| Adjective | three forms, optional root | word | composed | yes |
| Noun | gender, forms, optional root | `כלב טוב` | composed | yes |
| Preposition | ten suffixed forms | word, no trailing maqaf | composed | yes |
| Verb | preposition, binyan, root, principal parts | `לדבר עם` | composed | yes |

`partOfSpeechOf` maps `prep` → preposition. No `prep_phrase` entry has an inflection table, so
nothing is lost by those staying phrases.

## Help text

Examples below are checked against Wiktionary where they name its entries. Please still skim them.

In `field-help.ts`, write Hebrew of several words “in quotes”, which keeps it on one line. In an
example, end the Hebrew without punctuation before the English: in the left-to-right fields, a `!`
there jumps to the wrong side.

| | Production context | Examples | Variant prompt → answer |
|---|---|---|---|
| Preposition | “at” could be ב or אצל; for אצל, “at a person's home” | “הספר על השולחן (the book is on the table)” | “with me” → “אִתִּי” |

`Reading context` help can reuse `BOOK_READING_CONTEXT`. `PART_OF_SPEECH_HELP`, the line under the
chips, says with pointed examples that a preposition takes pronoun endings.

## PR 1 — Prepositions

- `source-forms.ts`: a `suffixedForms` fact from rows with `source: 'inflection'`, keyed by person
  from the tags, pointed forms only. The common prepositions have all ten; 35 of 184 entries have a
  table. Bump the schema version.
- `src/lib/hebrew/preposition.ts` gains the person type.
- `src/lib/card/preposition.ts`, under draft key `preposition`, and `PrepositionInputs.svelte`: a grid of five rows by
  singular and plural, each cell taking choices. A **Use first choices** button fills them in one
  click, since ל־ has a choice in every cell and Wiktionary tends to list the everyday form first.
  The click is the human's choice, so it keeps the Never guess rule.
- `Forms`, one line per person: `me: לִי`, `you: לְךָ, לָךְ`, `him, her: לוֹ, לָהּ`, `us: לָנוּ`,
  `you pl: לָכֶם, לָכֶן`, `them: לָהֶם, לָהֶן`. Blank cells are left out.
- Production answer drops a trailing maqaf, through a helper in `src/lib/hebrew/`, so `ל־` is typed
  as `ל`, the way verbs already write it. `Hebrew` and `Pointed` keep the dictionary's spelling.
- Fixtures: real lines for ל־, עם and של.

## PR 2 — `Part of speech` field

**Needs you first:** add the field in Anki, before `Gender`. Until then the drift check correctly
blocks the hand-off.

- `FIELDS` gets `partOfSpeech` with `shownFor: []`, and `composeFields` writes `inputs.partOfSpeech`.
- Re-fetch `tests/fixtures/anki/` with `modelFieldNames` and `notesInfo`.

## PR 3 — Roots on nouns and adjectives

- `RootInput` joins both forms, gaining a `required` prop, prefilled from `candidate.roots`, with choices when there are
  several. Wiktionary gives one for roughly 40–50% of them; the rest are often loanwords.
- Blank is fine; a non-blank root that isn't only letters still blocks.
- `AdjectiveInputs` serves as both draft and complete inputs today, so the formatted root needs a
  place beside it, as `VerbInputs` has one.
- `undoPrefill` restores it. The card templates already show `Root` when it is filled.

## PR 4 — Same-root panel

- `searchByFieldEqualing` in `src/lib/anki/search.ts`, and `findNotesWithRoot` beside
  `findExistingNotes` in `src/lib/server/anki/existing-notes.ts`, using `findNotes` and `notesInfo`.
- A new `/api/anki/same-root` route, shaped like `/api/anki/existing`.
- A panel listing other notes in the deck with that root, first extracting `ExistingNotesPanel`'s
  list and its Browse link so both can use them. The maqafs make this search awkward to type in Anki, so this is where roots pay
  off.

## PR 5 — Verb principal parts

- `source-forms.ts`: `presents` and `futures` from conjugation rows tagged exactly
  `masculine present singular` and `future masculine singular third-person`. About 95% of verbs give
  one of each and almost all the rest several. Past is the entry's pointed lemma. Bump the schema
  version.
- Three optional pointed inputs in `VerbInputs.svelte`; `Forms` composes as
  `past: דִּבֵּר<br>pres: מְדַבֵּר<br>fut: יְדַבֵּר`.
- Remove the `**Open:**` on a verb's `Forms` in `note-type.ts`.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, `svelte-autofixer` on each Svelte file until
  clean, and `npm run build-index` where the schema version changes.
- Each PR adds tests for its conversion, prefill, undo and composition, and `CardEditor.test.ts`
  covers which inputs and groups appear.
- By hand in the running app, without handing off to real Anki unless you agree: גדול, עם, ל־,
  כתובת and לדבר.
- Hold off re-entering the deck until PR 2, ideally PR 3, so those notes carry both new fields.
