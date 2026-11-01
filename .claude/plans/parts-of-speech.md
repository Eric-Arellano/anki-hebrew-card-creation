# Parts of speech

## Context

The editor knows three parts of speech: noun, verb and other. Everything else lands in Other, so
an adjective's four forms are typed by hand (the `Forms` help literally says to), while Wiktionary
has them. An adverb also sees `Forms` and variants, though it never changes form.

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
- **Phrases keep Unusual variants,** with help about wording that changes with who you address.
  Adverbs hide them.
- **Several values stay choices,** per the Never guess rule, including every cell of a preposition.

*Rejected for now: a noun's construct form, because it is mostly predictable and adds a line to
every noun card. Storing the pattern (משקל), because it is advanced for a beginner. Variant
suggestions beyond plurals.*

## What each part of speech shows

| | Inputs beyond the word | Production answer | `Forms` | Variants |
|---|---|---|---|---|
| Noun | gender, forms, optional root | `כלב טוב` | composed | yes |
| Verb | preposition, binyan, root, principal parts | `לדבר עם` | composed | yes |
| Adjective | three forms, optional root | word | composed | yes |
| Adverb | none | word | none | no |
| Preposition | ten suffixed forms | word, no trailing maqaf | composed | yes |
| Phrase | none | word | none | yes |
| Other | none | word | typed | yes |

Hints, `Examples` and `Notes` stay on every part of speech.

Wiktionary maps as: `adj` → adjective, `adv` → adverb, `prep` → preposition; `phrase`, `proverb`,
`prep_phrase`, `adv_phrase` and `intj` → phrase; everything else → other. Interjections join
phrases because `תודה` and `בבקשה` are things you say and don't inflect. No `prep_phrase` entry has
an inflection table, so nothing is lost by treating those as phrases.

## Help text

Examples below are checked against Wiktionary where they name its entries. Please still skim them.

| | Production context | Examples | Variant prompt → answer |
|---|---|---|---|
| Noun | “time” could be זמן or פעם; for פעם, “an occasion, not a duration” | unchanged | unchanged |
| Verb | unchanged | “אני הולך הביתה (I'm going home)” | unchanged |
| Adjective | “old” could be זקן or ישן; for זקן, “a person, not a thing” | “בית גדול (a big house)”, “העיר גדולה (the city is big)” | “other (feminine)” → “אַחֶרֶת” |
| Adverb | “more” could be יותר or עוד; for יותר, “comparing, as in ‘more expensive’” | “הוא רץ מהר (he runs fast)” | none |
| Preposition | “at” could be ב or אצל; for אצל, “at a person's home” | “הספר על השולחן (the book is on the table)” | “with me” → “אִתִּי” |
| Phrase | “how are you?” could be מה שלומך or מה נשמע; for מה נשמע, “casual” | “תודה! בבקשה! (Thanks! You're welcome!)” | “welcome (to a woman)” → “בְּרוּכָה הַבָּאָה” |
| Other | unchanged | unchanged | unchanged |

Adjectives also get their own `Reading context` help: ישן could be “old” or “sleeping”, so for
“old” write “בית ישן”.

The line under the chips, each with pointed examples: a noun has a gender and usually a plural; a
verb goes by its infinitive; an adjective agrees with its noun; an adverb says how, when or where
and never changes; a preposition takes pronoun endings; a phrase is said as a whole; Other is
everything else.

## PR 1 — Adverbs and phrases

- `src/lib/note-type.ts`: add both to `PARTS_OF_SPEECH`. Variant fields leave out adverb. Their
  `help` is already a per-part-of-speech record, so add phrase entries and leave adverb out.
- `partOfSpeechOf` in `src/lib/server/dictionary/convert.ts` gets the new mapping.
- `src/lib/card/inputs.ts`, `compose.ts`, `prefill.ts`, `src/lib/api/dictionary.ts`: the `'other'`
  cases cover any part of speech with no inputs of its own.
- `CardEditor.svelte`: add the labels, and show a one-line `PART_OF_SPEECH_HELP` under the chips.
  Extract the “quoted example” markup that `NoteFields.svelte` builds from `quotedParts` so both can
  use it.
- Per-POS help (below), plus a `note-type.test.ts` check that a field with per-POS help has one
  for every part of speech in its `shownFor`.

## PR 2 — Prefactor: shared `Forms` formatting

Move `formsHtml` from `src/lib/card/noun.ts` to `src/lib/card/forms.ts`, taking labelled lines.

## PR 3 — Adjectives

- `src/lib/server/dictionary/source.ts`: a new `masculinePlurals` fact. `feminines` and
  `femininePlurals` already match. Bump `INDEX_SCHEMA_VERSION`.
- `DictionaryAdjective`, `src/lib/card/adjective.ts`, `AdjectiveInputs.svelte`, and prefill and undo
  through `onlyValue`/`choicesAmong`. About two-thirds of adjective entries give all three forms.
- `Forms` composes as a noun's does: `f: …<br>m.pl: …<br>f.pl: …`.
- Fixtures: real lines for גדול, אחר (irregular feminine) and ישראלי (two masculine plurals).
- `Forms` help for Other moves to a number example.

## PR 4 — Prepositions

- `source.ts`: a `suffixedForms` fact from rows with `source: 'inflection'`, keyed by person from
  the tags, pointed forms only. The common prepositions have all ten; 35 of 184 entries have a
  table. Bump the schema version.
- `src/lib/hebrew/preposition.ts` gains the person type. Its `Preposition` means what a verb
  governs, so the new draft key is `suffixed`.
- `src/lib/card/preposition-forms.ts` and `PrepositionInputs.svelte`: a grid of five rows by
  singular and plural, each cell taking choices. A **Use first choices** button fills them in one
  click, since ל־ has a choice in every cell and Wiktionary tends to list the everyday form first.
  The click is the human's choice, so it keeps the Never guess rule.
- `Forms`, one line per person: `me: לִי`, `you: לְךָ, לָךְ`, `him, her: לוֹ, לָהּ`, `us: לָנוּ`,
  `you pl: לָכֶם, לָכֶן`, `them: לָהֶם, לָהֶן`. Blank cells are left out.
- Production answer drops a trailing maqaf, through a helper in `src/lib/hebrew/`, so `ל־` is typed
  as `ל`, the way verbs already write it. `Hebrew` and `Pointed` keep the dictionary's spelling.
- Fixtures: real lines for ל־, עם and של.

## PR 5 — `Part of speech` field

**Needs you first:** add the field in Anki, before `Gender`. Until then the drift check correctly
blocks the hand-off.

- `FIELDS` gets `partOfSpeech` with `shownFor: []`, and `composeFields` writes `inputs.partOfSpeech`.
- Re-fetch `tests/fixtures/anki/` with `modelFieldNames` and `notesInfo`.

## PR 6 — Prefactor: root becomes a shared input

Move `root` from `VerbDraft` to `CardInputsDraft`, and extract `RootInput.svelte` with its “Writes
the root as…” hint. Verbs behave exactly as before.

## PR 7 — Roots on nouns and adjectives

- `RootInput` joins both forms, prefilled from `candidate.roots`, with choices when there are
  several. Wiktionary gives one for roughly 40–50% of them; the rest are often loanwords.
- Blank is fine; a non-blank root that isn't only letters still blocks.
- `undoPrefill` restores it. The card templates already show `Root` when it is filled.

## PR 8 — Same-root panel

- `searchByFieldEqualing` in `src/lib/anki/search.ts`, and `findNotesWithRoot` beside
  `findExistingNotes` in `src/lib/server/anki/existing-notes.ts`, using `findNotes` and `notesInfo`.
- A new `/api/anki/same-root` route, shaped like `/api/anki/existing`.
- A panel listing other notes in the deck with that root, reusing `ExistingNotesPanel`'s list and
  its Browse link. The maqafs make this search awkward to type in Anki, so this is where roots pay
  off.

## PR 9 — Verb principal parts

- `source.ts`: `presents` and `futures` from conjugation rows tagged exactly
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
- By hand in the running app, without handing off to real Anki unless you agree: גדול, מהר, עם,
  ל־, מה נשמע, תודה, כתובת and לדבר.
- Hold off re-entering the deck until PR 5, ideally PR 7, so those notes carry both new fields.
