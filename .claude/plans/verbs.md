# Verbs: a preposition for each meaning

## Context

A verb's preposition belongs to one of its meanings, not to the verb. שָׁמַר אֶת means "keep",
and שָׁמַר עַל means "look after". דִּבֵּר takes עִם for who you talk with and עַל for what you
talk about.

The editor and the deck already hold it that way. Each `Meaning` in `src/lib/card/definitions.ts`
carries a `PrepositionChoice`, chosen by the human in `MeaningPrepositions.svelte` and written into
`Definitions` as a pill (the format is in that file's header). A verb's `Production answer` is the
infinitive alone. Anki's templates and Styling draw the pill, dashed with a `?` on the Production
front and filled in on every back, and ללכת is saved this way (`notes-info-lalechet.json`).

What is left is Claude filling those lines, and everything downstream of them seeing each
preposition. The dictionary names a preposition for only 104 of 2,286 verb lemmas, per entry
rather than per meaning, so Claude has to suggest most of them.

## The rules the remaining PRs follow

- A meaning whose roles take different prepositions gets a line per role: "to talk with" עִם,
  then "to talk about" עַל.
- את counts as a preposition, so a blank always asks which preposition, never whether there is
  one. None is only for a meaning that never takes an object.
- Each preposition is shown in an example of its own meaning.
- Variants stay for irregular forms only, like אֵלֵךְ.
- A second note only for a different verb with the same spelling: לְסַפֵּר "tell" and לִסְפֹּר
  "count". `Reading context` tells them apart.

*Rejected: several prepositions on one line, because the English would have to be split around
each one, in the inputs, the HTML and Claude's answer.*
*Rejected: one note per preposition, because two Reading cards would show the same לשמור.*
*Rejected: a variant for a preposition that changes the meaning, because a variant is a bare card
for an unusual form, and these meanings are as central as the first one.*

## The app changes, as PRs

Claude sees a verb's meanings the same way in all three prompts below: one per line, each ending
in its unpointed preposition in brackets, like `- to look after [על]` or `- to sleep [none]`. One
function builds those lines, so PR 1 adds it and PRs 2 and 3 reuse it.

### PR 1: Claude suggests a verb's meanings with their prepositions

- `src/lib/server/ai/meanings.ts` with `POST /api/ai/meanings`, shaped like `suggest.ts` and its
  route, through `askForStructured`.
- Sent: the word, its pointed form, Wiktionary's glosses for the picked entry, its prepositions,
  and the lines the human has written so far, with any preposition already chosen. The answer is
  lines, each `{ english, preposition }`, the preposition a `z.enum` of `GOVERNED_PREPOSITIONS`
  and `none`.
- The system prompt quotes `MEANING_PREPOSITION_HELP`, as `suggest.ts` quotes `FIELD_HELP`, so
  Claude follows the rules the human reads. Then:
  - Answer the preposition that comes before the meaning's object, as a native speaker of
    today's Israel uses it. For a direct object that is אֶת, even though את drops before an
    indefinite one.
  - An infinitive or a ש clause after the verb isn't an object: for רצה, "to want" takes את, from
    רוצה את הספר, even though רוצה לאכול has none.
  - Keep the human's lines, their wording and their order, and any preposition they chose. Split
    a line in place when its roles take different prepositions.
  - After them, add a meaning only when a different preposition gives it and a beginner would
    meet it, like "to look after" עַל beside "to keep" אֶת. Add none when the lines cover them.
  - With no lines yet, write the common meanings from Wiktionary's glosses, most common first,
    leaving out ones marked archaic, obsolete or rare.
  - Write each meaning as the deck does: English starting "to", short, with commas between
    shades of one sense ("to walk, go"), and the English preposition when it tells roles apart
    ("to talk with").
- Guards: the English passes `isPlainLine`, which moves out of `suggest.ts`, and has no Hebrew
  letters. A line that fails is dropped.
- UI: a Suggest button in `MeaningPrepositions.svelte` shows Claude's lines beside the human's.
  "Use these" replaces `definitions` with them, prepositions and all, so the chips follow. The
  human edits from there, and the check in PR 3 looks at the result again before saving.
- Tests: the prompt, the guards, and the route through a fake `ClaudeMessages`. A real fixture
  for שמר is captured only with the human's go-ahead.

### PR 2: examples use each line's preposition

- `SuggestRequest` (`src/lib/api/ai.ts`) sends a verb's lines with their prepositions, and
  `suggestionRequest` writes them in the bracketed form.
- The examples rule in `suggestionRequest` gains, for a verb:
  - Each meaning with a preposition gets its own sentence, using the verb with that preposition
    before an object. Meanings with different prepositions never share one, though two shades
    with the same preposition still may.
  - For את, give the object the definite article or a name, so את appears: ראיתי את הסרט, not
    ראיתי סרט.
  - ל, ב and מ join the next word, as in הלכתי לים.
  - This can need more sentences than `MAX_EXAMPLES`. **Open:** raise the cap for a verb, or
    keep it and cover the first meanings only.
- The fields' Suggest waits until every line's preposition is chosen: `suggestBlocker`, in
  `src/lib/card/suggestions.ts`, says "Choose a preposition for each meaning first."

### PR 3: the review check sees each preposition

- `fieldTexts` in `src/lib/server/ai/check.ts` sends `Definitions` through `ankiFieldHtmlToText`,
  which today runs each pill into its English (`to look after עַל`). For a verb, send the
  bracketed lines instead, read with `definitionsFromHtml`.
- The prompt's "How the note is studied" says what the brackets are, and that the Production card
  blanks each preposition for the learner to recall.
- "Look for these" gains:
  - A meaning paired with a preposition the verb doesn't take in that sense.
  - An example that uses the verb with a preposition that doesn't match the meaning its English
    gives.
- "Leave these alone" gains:
  - A preposition that fits where another would too. The learner chooses the one they want to
    practice.
  - An example with no את because its object is indefinite.
  - A meaning with no example. The learner chooses the examples.

### PR 4: an example's conjugated verb is recognized

- `examplesWithoutWord` warns that an example doesn't use the word, and `examplesToAnkiFieldHtml`
  bolds the word, both through `usageRanges` in `src/lib/hebrew/usage.ts`. For a verb it matches
  the infinitive, the three forms for "he", and any word holding the root's letters in order
  with only ו or י between them.
- That misses most conjugations of a weak root, so a correct example is warned about and saved
  without bold:
  - a root ending in ה, where the ה turns to י or ת or drops: `קניתי`, `קנו` and `קנתה` for
    `לקנות`, and the same for `לרצות`, `לראות`, `לשתות`, `לעשות`, `להיות`;
  - a hollow root: `קמתי` for `לקום`, `גרנו` for `לגור`;
  - a root that drops its first letter: `אלך` for `ללכת`, `אשב` for `לשבת`, `נתתי` for `לתת`.
- The Suggest prompt asks for "another person or tense" (`OTHER_FORMS.verb` in
  `src/lib/server/ai/suggest.ts`), so Claude's own examples are the ones that trip it.
- **Open:** how to recognize them.
  - Match against the entry's whole conjugation table. The index already files each entry under
    every form in it (`keyForms` in `src/lib/server/dictionary/source.ts`), so the server can say
    which words of an example lead to the picked verb. Exact, but it needs the dictionary, and
    a note loaded from Anki has no picked entry until its word is looked up.
  - Loosen the root match, so a final ה may be י, ת or ו. Pure and small, and it covers the
    largest class, but it bolds `קוראים` in an example for `לראות`, and does nothing for the
    hollow and first-letter roots.
- *Rejected: leaving it, because the warning then fires on the examples the tool itself asks
  for, which teaches the human to ignore it.*

### PR 5: a verb gets a Reading context

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
2026-11-26). They are keyed by their past, and only אמר has a `Part of speech`. Then reset
reviews for the deck.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte
  file until it's clean. No test reaches the network or a real Anki.
- By hand under `npm run dev`, and only with the human's go-ahead for Claude calls: for שמר,
  Suggest offers "to keep" אֶת and "to guard, look after" עַל, and "Use these" fills the lines and
  chips. Its examples then use שומר את and שומר על. Nothing is added to Anki without the human
  clicking Add to deck.
