# Verbs: a preposition for each meaning

## Context

A verb's preposition belongs to one of its meanings, not to the verb. שָׁמַר אֶת means "keep",
and שָׁמַר עַל means "look after". דִּבֵּר takes עִם for who you talk with and עַל for what you
talk about.

The editor and the deck already hold it that way. Each `Meaning` in `src/lib/card/definitions.ts`
carries a `PrepositionChoice`, chosen by the human in `VerbMeaningPrepositions.svelte` and written
into `Definitions` as a pill (the format is in that file's header). A verb's `Production answer` is
the infinitive alone. Anki's templates and Styling draw the pill, dashed with a `?` on the Production
front and filled in on every back, and ללכת is saved this way (`notes-info-lalechet.json`).

Claude suggests the lines. Suggest meanings with Claude, in `ClaudeVerbMeanings.svelte`, asks
`POST /api/ai/verb-meanings` (`src/lib/server/ai/verb-meanings.ts`) with the human's lines and the
picked entry's definitions, since the dictionary names a preposition for only 104 of 2,286 verb
lemmas, per entry rather than per meaning. Claude answers the whole list, saying which line each
meaning keeps or splits, and the human takes any part of it
(`src/lib/card/verb-meaning-suggestions.ts`). The check below still reads the result again before
saving.

Suggest shows each preposition in an example of its own meaning (`VERB_EXAMPLES` in
`src/lib/server/ai/suggest.ts`), and waits until every line has one chosen. The review check
(`src/lib/server/ai/check.ts`) judges each meaning's preposition and whether an example's matches
its meaning.

Claude sees a verb's meanings the same way in every prompt: numbered, each ending in its unpointed
preposition in brackets, like `1. to look after [על]` or `2. to sleep [none]`, from
`verbMeaningLines` in `src/lib/server/ai/verb-meanings.ts`. What counts as a meaning's preposition
is `PREPOSITION_RULES` in that module, each rule one Claude broke in trials without it, and the
check quotes it, so it never faults what Suggest proposed. `evals/claude/cases.ts` holds verb
notes for the check that plant a wrong preposition, or hold what it should leave alone.

What is left is the Reading context.

## The rules the remaining PRs follow

- A meaning whose roles take different prepositions gets a line per role: "to talk with" עִם,
  then "to talk about" עַל.
- את counts as a preposition, so a blank always asks which preposition, never whether there is
  one. None is only for a meaning that never takes an object.
- Each preposition is shown in an example of its own meaning.
- Variants stay for forms the infinitive and past don't predict, never for a preposition
  (`verb-past-and-infinitive.md`).
- A second note only for a different verb with the same spelling: לְסַפֵּר "tell" and לִסְפֹּר
  "count". `Reading context` tells them apart.

*Rejected: several prepositions on one line, because the English would have to be split around
each one, in the inputs, the HTML and Claude's answer.*
*Rejected: one note per preposition, because two Reading cards would show the same לשמור.*
*Rejected: a variant for a preposition that changes the meaning, because a variant is a bare card
for an unusual form, and these meanings are as central as the first one.*

## The app changes, as PRs

### PR 1: a verb gets a Reading context

- `homographsOf` in `src/lib/server/ai/homographs.ts` takes the entries titled with the note's
  spelling. A verb's entry is titled with its past, so an infinitive finds none, and Suggest
  never offers a verb a Reading context, nor can the check judge one.
- Match a verb by its infinitive's unpointed spelling as well as by title, so `לפנות` finds both
  `לִפְנוֹת`, "to turn", and `לְפַנּוֹת`, "to clear".
- Small in reach: under 1% of infinitives share their spelling with another entry, which is why
  the deck goes by the infinitive (`src/lib/card/prefill.ts`). The dictionary also can't know a
  preposition joined to a noun, like `לַסֵּפֶר`, "to the book", beside `לְסַפֵּר`.

## After the PRs, by the human

Re-save the 11 verbs left in the app as infinitives, with a binyan and a preposition per
meaning: אמר, כתב, ישב, דיבר, למד, עמד, חשב, קרא, בא, רצה, ראה (read through AnkiConnect,
2026-11-26). They are keyed by their past, and only אמר has a `Part of speech`. Suggest meanings
drafts each one's lines. Wait for `verb-past-and-infinitive.md` too, which changes what every
verb saves, so each is re-saved once; ללכת joins them then, and אמר becomes להגיד. Whichever
plan is left carries this step. Then reset reviews for the deck.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte
  file until it's clean. No test reaches the network or a real Anki.
