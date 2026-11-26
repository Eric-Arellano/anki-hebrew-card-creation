# Verbs: a preposition for each meaning

## Context

A verb's preposition belongs to one of its meanings, not to the verb. שָׁמַר אֶת means "keep",
and שָׁמַר עַל means "look after". דִּבֵּר takes עִם for who you talk with and עַל for what you
talk about. Today a verb note's Production card checks a typed `Production answer` of the
infinitive plus one preposition (`לחכות ל`). Its front lists every meaning, so that answer is
wrong for any meaning that takes another preposition. A noun's gender, which the Production
answer drills through טוב, is a single fact about the whole word, so it fits in that slot.

What the deck holds (read through AnkiConnect, 2026-11-26):

- 12 verbs. אמר was saved by the app. The other 11 are from before it: כתב, ישב, דיבר, למד,
  עמד, חשב, קרא, בא, הלך, רצה, ראה. They are keyed by their past, with no `Part of speech` and
  a blank `Production answer`. Two already number their meanings (קרא, הלך).
- Variants are a prompt and a bare answer for an unusual form (אָבוֹת טוֹבִים, נָשִׁים), with no
  typing and no examples.
- The card templates and Styling exist only in Anki, not in this repo.

The human will reset reviews for the whole deck once it is updated, so changing templates now
costs nothing. They always create and edit notes in the app. The dictionary names a preposition
for only 104 of 2,286 verb lemmas, per entry rather than per meaning, so Claude has to suggest
most of them.

## The deck

**One note per verb, meaning one conjugation table. Each line of `Definitions` carries at most
one preposition. The Production card types the bare infinitive.**

- Reading and Listening show the bare infinitive, and their backs list every meaning with its
  preposition. That is the recognition being drilled: see or hear לשמור, and know what it can
  mean. Forvo's audio is of the bare infinitive.
- Production's front blanks each preposition, and its back reveals it. The typed answer is
  graded on the verb alone, and the human checks the preposition themselves.
- A meaning whose roles take different prepositions gets a line per role: "to talk with" עִם,
  then "to talk about" עַל.
- את counts as a preposition, so a blank always asks which preposition, never whether there is
  one. A line with no preposition has no blank. "to help" לְ־ and "to see" אֶת both show a blank
  on the front, and the contrast between them is what's worth drilling.
- Examples: one per line, each using that line's preposition.
- Variants stay for irregular forms only, like אֵלֵךְ.
- A second note only for a different verb with the same spelling: לְסַפֵּר "tell" and לִסְפֹּר
  "count". `Reading context` tells them apart.

*Rejected: the preposition in the typed answer, because one slot can't hold a preposition per
meaning, and Anki grades the string exactly.*
*Rejected: one note per preposition, because two Reading cards would show the same לשמור.*
*Rejected: a variant for a preposition that changes the meaning, because a variant is a bare card
for an unusual form, and these meanings are as central as the first one.*
*Rejected: several prepositions on one line, because the English would have to be split around
each one, in the inputs, the HTML and Claude's answer.*
*Rejected: a separate field for prepositions, because it parts each one from its meaning.*
*Rejected: parentheses, because Definitions already use them for English notes ("(computing) to
save"), so a preposition in them is easy to skim past.*

### How a line is written

```html
1. to keep, save <span class="prep"><bdi lang="he">אֶת</bdi></span><br>2. to guard, look after <span class="prep"><bdi lang="he">עַל</bdi></span>
```

Each preposition is drawn as a pill: dashed with a `?` on the Production front, and solid with the
pointed preposition on every back. The pointed form comes from a fixed table beside
`GOVERNED_PREPOSITIONS` in `src/lib/hebrew/preposition.ts`: אֶת, לְ־, בְּ־, עַל, עִם, מִ־. It is
never pointed by Claude or typed by the human. Shown standing alone, a prefix takes its citation
vowel and a maqaf, which settles the old question of how to point לְ, בְּ and מִ before a word.

A meaning that takes none ends in an empty marker instead:

```html
to go<span class="no-prep"></span>
```

Being empty, it shows nothing on any card, with or without the Styling. It lets the editor tell a
None the human chose from a preposition never chosen, as in a verb saved before this. If
something strips it, the line loads unchosen, so the human chooses again rather than the editor
guessing.

*Rejected: telling None from unchosen by what else the note holds, because a verb saved before
this can look exactly like one whose meanings all take none, so None would be asked for again on
every edit.*

### The Anki edits, by hand in Manage Note Types, before the reset

1. Production front: `<div class="defs">` becomes `<div class="defs quiz">`.
2. Production back: `{{FrontSide}}` becomes `<div class="revealed">{{FrontSide}}</div>`.
3. Reading and Listening backs: the `Production answer` div's class gains
   `pos-{{text:Part of speech}}`, beside `g-{{text:Gender}}`. Only a noun's answer is more than
   the word itself, so the Styling hides the line for the rest. A note with no part of speech
   yet keeps it.
4. Styling gains:

```css
.prep {
  display: inline-block;
  margin-inline-start: 0.35em;
  padding: 0 0.55em;
  border: 1.5px solid #a66f00;
  border-radius: 999px;
  background: #fdf3dc;
  color: #7a5200;
  font-size: 0.95em;
  line-height: 1.45;
}
.nightMode .prep { border-color: #e0b44c; background: #3a2f15; color: #f0cc76; }
.quiz .prep { border-style: dashed; background: transparent; }
.quiz .prep bdi { display: none; }
.quiz .prep::before { content: "?"; font-weight: 600; }
.revealed .quiz .prep { border-style: solid; background: #fdf3dc; }
.nightMode .revealed .quiz .prep { background: #3a2f15; }
.revealed .quiz .prep bdi { display: inline; }
.revealed .quiz .prep::before { content: none; }

.chunk.pos-verb, .chunk.pos-adjective, .chunk.pos-adverb,
.chunk.pos-preposition, .chunk.pos-phrase, .chunk.pos-other { display: none; }
```

Without these, a pill shows as plain inline Hebrew, so the app's change and the Anki edits can
land in either order.

## The app changes, as PRs

### PR 1 (prefactor): a meaning is a record

- `Definitions` (`src/lib/card/inputs.ts`) and the draft's `definitions` hold one record per line
  rather than a string, so a verb's line can carry a preposition in PR 2. No change in what
  reaches Anki.

### PR 2: each of a verb's meanings takes its own preposition

- `src/lib/card/compose.ts` writes a line's pill or none marker after its English, and
  `definitionsFromHtml` reads them back. A line with neither starts unchosen.
- A verb's `Production answer` is the word alone. `VerbInputs` and `VerbDraft` lose their
  `preposition`. `readPreposition` in `src/lib/card/from-note.ts`, and the chips in
  `VerbInputs.svelte`, go away.
- `DefinitionsInput.svelte`, for a verb only, gives each line chips for the `GOVERNED_PREPOSITIONS`
  and None. Each starts unchosen and is required. The dictionary's suggested prepositions move
  under the meanings, still per entry.
- Help (`src/lib/field-help.ts`): a line per role, את counts, and None for a meaning with no
  object.
- Tests: compose and read back for none, one and several lines, a line whose English has its own
  parentheses, and a note saved before this. Once the human saves a verb through it, capture its
  `notesInfo` as a fixture, with their go-ahead.

### PR 3: Claude suggests a verb's meanings with their prepositions

- `src/lib/server/ai/meanings.ts` with `POST /api/ai/meanings`, shaped like `suggest.ts` and its
  route, through `askForStructured`.
- Sent: the word, its pointed form, Wiktionary's glosses for the picked entry, its prepositions,
  and the lines the human has written so far. Claude answers with lines, most common first, each
  `{ english, preposition: GovernedPreposition | 'none' }`. It keeps the human's wording where
  there is some, splits a line whose roles take different prepositions, and adds a common meaning
  that a different preposition gives (שמר על beside "to keep"). The English passes
  `isPlainLine`, which moves out of `suggest.ts`, and has no Hebrew letters.
- UI: a Suggest button under a verb's meanings shows Claude's lines beside the human's. "Use
  these" replaces the lines and chooses their chips. The human edits from there, and the check
  in PR 5 looks at the result again before saving.
- Tests: the prompt, the guards, and the route through a fake `ClaudeMessages`. A real fixture
  for שמר is captured only with the human's go-ahead.

### PR 4: examples use each line's preposition

- `SuggestRequest` (`src/lib/api/ai.ts`) sends a verb's lines with their prepositions. The prompt
  asks for one example per line, each using its line's preposition.
- The fields' Suggest waits until every line's preposition is chosen: `suggestBlocker`, in
  `src/lib/card/suggestions.ts`.

### PR 5: the review check sees each preposition

- `src/lib/server/ai/check.ts` sends `Definitions` as text with each preposition marked, like
  `to look after [על]`, rather than run into the English.
- Add "a meaning takes a different preposition than the one beside it" and "an example doesn't
  use its line's preposition" to the check's list.

### PR 6: an example's conjugated verb is recognized

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

### PR 7: a verb gets a Reading context

- `homographsOf` in `src/lib/server/ai/homographs.ts` takes the entries titled with the note's
  spelling. A verb's entry is titled with its past, so an infinitive finds none, and Suggest
  never offers a verb a Reading context, nor can the check judge one.
- Match a verb by its infinitive's unpointed spelling as well as by title, so `לפנות` finds both
  `לִפְנוֹת`, "to turn", and `לְפַנּוֹת`, "to clear".
- Small in reach: under 1% of infinitives share their spelling with another entry, which is why
  the deck goes by the infinitive (`src/lib/card/prefill.ts`). The dictionary also can't know a
  preposition joined to a noun, like `לַסֵּפֶר`, "to the book", beside `לְסַפֵּר`.

## After the PRs, by the human

Re-save the 11 old verbs in the app as infinitives, with a binyan and a preposition per meaning,
then reset reviews.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte
  file until it's clean. No test reaches the network or a real Anki.
- By hand under `npm run dev`, and only with the human's go-ahead for Claude calls: for שמר,
  Suggest offers "to keep" אֶת and "to guard, look after" עַל, and "Use these" fills the lines and
  chips. The note's Production front shows two dashed pills, and its back shows them filled in.
  Nothing is added to Anki without the human clicking Add to deck.
- After the Anki edits, which so far have only run in a browser: the pills and the hidden
  `Production answer` line look right in Anki on desktop and on the phone, in day and night
  mode.
