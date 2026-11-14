# Examples: one row per sentence, better sentences, the word in bold

## Context

Claude now writes `Examples` (branch `ai-suggest-examples`), and three things hold it back:

- **The content.** The help and the prompt ask for short phrases like “כרטיס רכבת (train ticket)”,
  always in the dictionary form, with no punctuation. Since Claude writes them, a full, punctuated
  sentence is better: simple, but one a native speaker would really say, with the word in a
  different form each time (with ה/ב/ל…, plural, another person or tense), so the card shows how
  the word is used.
- **More than one meaning.** Nothing makes the examples cover each sense in `Definitions`.
- **The input.** Examples is one `dir="auto"` textarea of `Hebrew (English)` lines. Mixed
  direction mangles the parentheses as you type, and adding a line is clumsy. A row per example
  with a Hebrew input and an English input, plus “+ Another example” as `DefinitionsInput.svelte`
  does it, makes entry much easier.

Decided with the user:

- **Each line is stored as `<bdi lang="he">Hebrew.</bdi> (English.)`**, joined by `<br>`. Anki
  shows the field left to right (see `QuotedText.svelte`'s comment), so the `.`, `?` or `!` ending
  the Hebrew would jump to the wrong side of the line; `<bdi>` keeps it with its sentence.
- **Every sentence ends in punctuation**, in both languages.
- **One example per meaning, in the order of Definitions**, and the English shows which sense
  each one uses. Nothing in the data model or in Anki links an example to its meaning.
  *Rejected: numbering each example by its meaning, because the numbers go stale when meanings
  are reordered, and the English already shows the sense.*
- **Don't design around the current deck.** The human will fix old cards by hand. The parser
  reads the format this tool writes, and anything else loads as plainly as it can, never guessed
  apart. Before a save, the review shows what changed.
- **The word is bolded in each example on the card**, and **the suggest request sends the inputs'
  forms**, so Claude uses the forms the learner studies and the check can find them.
- Disambiguation hints are out of scope.

Three PRs, stacked on `ai-suggest-examples` or off `main` once it lands. Bring this plan into
`.claude/plans/` with `/plan-adopt` before starting.

## PR 1: one row per example

**Pure model, `src/lib/card/examples.ts`** (beside `compose.ts`, under `card/`'s purity rules):

- `type Example = { hebrew: string; english: string }`. Each part is plain text, as a meaning is,
  not HTML.
- `examplesToAnkiFieldHtml(examples)`:
  - drops blank rows and escapes each part with `textToAnkiFieldHtml` (`src/lib/anki/html.ts`)
  - writes `<bdi lang="he">…</bdi> (…)`, or only the `<bdi>` when English is blank, or only `(…)`
    when Hebrew is blank
  - joins the lines with `<br>`
- `examplesFromHtml(html)` splits on `<br>` and skips blank lines:
  - A line of the form above gives its two parts (each through `ankiFieldHtmlToText`).
  - Any other line is unexpected. Its text goes into `hebrew` whole, with blank English: the
    human sees it in one input and splits it. Composition then wraps it, so the review shows the
    change.
  - An empty field gives one blank row.
- Tests cover the `<bdi>` round trip, punctuation ending the Hebrew, `<`/`&`, an unexpected line,
  and blank rows. Fixtures are real data: build the `<bdi>` case from a note this tool saves while
  testing by hand, with the user's go-ahead, or keep it to round trips of composed values.

**Draft and note plumbing**

- `src/lib/card/draft.ts`: `CardDraft` gains `examples: Example[]` next to `edits`, starting as
  one blank row. `Examples` keeps its entry in `FIELDS` (Extras group, shown for every part of
  speech, in Anki's order). Only where its value lives changes.
- `src/lib/card/from-note.ts`: fill `examples` from `examplesFromHtml(html('examples'))`, and leave
  `examples` out of the textarea `edits`.
- `CardEditor.svelte` `ankiFields`: pass `composed: { ...composed, examples:
  examplesToAnkiFieldHtml(draft.examples) }`. `noteFields` (`src/lib/card/to-note.ts`) already
  falls back to `composed` when there is no edit, so it doesn't change.
- `src/lib/card/checks/examples.ts`: `examplesWithoutWord` takes `Example[]` and returns the
  indexes of rows whose Hebrew is filled but uses no form of the word.

**UI**

- New `src/lib/components/fields/ExamplesInput.svelte`, modeled on `DefinitionsInput.svelte`:
  - Each row has a Hebrew input (`lang="he" dir="rtl"`, `font-hebrew`), an English input
    (`lang="en"`), and × on every row but the first. “+ Another example” comes after the rows.
  - The inputs sit side by side from `sm` up, and stack on a phone.
  - A row whose Hebrew uses no form of the word gets the amber “No form of {word}” hint under it.
    That replaces the list `NoteFields.svelte` shows today.
- `NoteFields.svelte`: for `examples`, render `ExamplesInput` in place of the textarea, keeping the
  label, help and Suggested chip. Examples spans both columns (`sm:col-span-2`); Notes sits under
  it.
- Run `svelte-autofixer` on both components until it reports nothing.

**Suggest**

- `src/lib/api/ai.ts`: `Suggestions.examples` becomes `Example[]`, and the rest stay strings.
- `src/lib/server/ai/suggest.ts` `toSuggestions`: return the pairs that pass `exampleLine`'s guards
  (renamed `isValidExample`) instead of joining them into text.
- `SuggestButton.svelte` and `CardEditor.svelte`:
  - Examples count as blank when every row is blank.
  - A filled answer replaces `draft.examples`, through an `onexamples` callback next to `onedit`.
  - `suggestBlocker` and `isUnreadSuggestion` compare examples by value.

**Tests:** update `CardEditor.test.ts` (“for the examples”), `CardEditor.suggest.test.ts`,
`from-note.test.ts`, the check's `examples.test.ts`, and `suggest.test.ts`. Add editor tests for
adding and removing a row, and for saving a new note whose `Examples` is the `<bdi>` HTML (save
assertions go in `CardEditor.saving.test.ts`).

## PR 2: full, punctuated, varied sentences, from the word's forms

**The forms, `src/lib/card/examples.ts`:** move `inputForms` out of `checks/examples.ts` and make
it `labeledForms(inputs, formsField): { label: string; form: string }[]`, dropping blank forms. The
labels:

- noun: plural, feminine, feminine plural
- verb: past (he), present (he), future (he)
- adjective: feminine, masculine plural, feminine plural
- preposition and other: each `Forms` line's own label

The check keeps using only the forms. Add tests for each part of speech.

**Request:** `SuggestRequest` (`src/lib/api/ai.ts`) gains `forms`, and the route's
`suggestRequestBodySchema` takes `z.array(z.strictObject({ label, form }))`. `CardEditor` sends
`labeledForms(draft.inputs, draft.edits.forms ?? '')`. Because it is part of `request`,
SuggestButton's “the word changed while Claude was answering” check covers a change in the forms
too. The forms are the note's own text, so the plan's rule that only the note's text leaves the
machine still holds.

**Prompt (`src/lib/server/ai/suggest.ts`):**

- In the user message, a `Forms:` list after the meanings, with each label and its form. Leave it
  out when there are none.
- Under the quoted help:
  - Full sentences a native speaker would say in daily life: short (about four to eight words),
    with everyday words a beginner knows.
  - A different form of the word in each, preferring the forms listed. A
    `Record<PartOfSpeech, string>` gives the kinds of form:
    - noun: with ה, ב, ל, מ, ו or ש, or in the plural
    - verb: another person or tense, or the infinitive after a verb like רוצה or צריך
    - adjective: agreeing with a feminine or plural noun
    - preposition: with a pronoun ending
    - adverb and phrase: in a different kind of sentence
    - other: whatever forms it has
  - With more than one meaning, one sentence per meaning, in their order; otherwise two. Never
    more than four.
  - End every sentence with `.`, `?` or `!`, in Hebrew and in English. This replaces “no
    punctuation at its end”. The English is a natural translation, without parentheses.
- Tests: the forms list (with forms and without), the line for each part of speech, and the
  one-per-meaning instruction, asserted by `toContain` as now. The route test checks that `forms`
  passes through. `tests/fixtures/claude/suggest-sefer.json` keeps its shape. Recapture it only if
  the user says so, since a call costs money.

**Help (`src/lib/field-help.ts`):**

- `examplesHelp` reads “Short, simple sentences that use the word, each with its English, and in
  a different form each time. For example, …”.
- Each example is punctuated and written as `“Hebrew.” (English.)`, with only the Hebrew quoted.
  `QuotedText.svelte` then switches its `<bdi dir="ltr">` to `dir="auto"`, so a quoted Hebrew
  sentence keeps its `.` at its end. Update that component's comment, and drop the field-help
  comment about `!`.
- The examples, each of which `usesForm`/`usesRoot` must find with forms the inputs would hold:
  - noun רכבת: “נסענו ברכבת לחיפה.” (We took the train to Haifa.) or “הרכבות מלאות בבוקר.”
    (The trains are full in the morning.)
  - verb ללכת: “הלכנו לים אחרי העבודה.” (We went to the beach after work.) or “אני צריך ללכת
    עכשיו.” (I need to go now.)
  - adjective גדול: “יש להם בית גדול.” (They have a big house.) or “הערים הגדולות יקרות.”
    (The big cities are expensive.)
  - adverb מהר: “הוא תמיד אוכל מהר.” (He always eats fast.)
  - preposition על: “שמתי את המפתחות על השולחן.” (I put the keys on the table.)
  - phrase תודה: “תודה על העזרה אתמול!” (Thanks for the help yesterday!)
- Before relying on the switch, check the other quoted help under `dir="auto"`, such as “me:
  לְפָנַי” and “homophone with קרה (to happen)”: each starts with its own strong direction.

## PR 3: bold the word on the card

- `src/lib/hebrew/usage.ts`: alongside `usesForm`/`usesRoot`, add a function that returns the
  ranges of `text` holding one of `forms` or the root, as `[start, end)` offsets into the
  original text. Tokenize the original string, with niqqud allowed inside a token, and compare
  each token's comparison key, so the offsets never pass through `toComparisonKey`. A form of
  several words covers its first through last token, and a prefixed token is bolded whole
  (`ברכבת`). Then make `usesForm`/`usesRoot` “has a range”, so the check and the bold can't
  disagree. Exhaustive tests here: prefixes, pointed text, multi-word forms, a root, no match.
- `examplesToAnkiFieldHtml(examples, forms, root)` wraps each range in `<b>`, inside the
  `<bdi>`, escaping around it. No match, no bold. `examplesFromHtml` already strips the `<b>`
  through `ankiFieldHtmlToText`, so an unchanged note composes back identically and the review
  shows no change.
- `examplesWithoutWord` becomes “rows with no range”.
- The matching ignores ו and י inside a word (`usage.ts`'s header), so a near-miss like `סיפור`
  for `ספר` can be bolded. That's the same tolerance the warning already has, and it's visible on
  the card. Note it in the function's comment.
- Editor test: saving a note bolds the form in `Examples`.

## Verification

- After each PR: `npm run lint && npm run check && npm test`, and `svelte-autofixer` clean on every
  touched `.svelte` file. Run `uptime` first if anything looks slow.
- `npm run dev`, read-only against the real Anki:
  - Type examples in rows, ending some with `?`, and check that the punctuation stays in place.
  - Open an existing note that has examples. An unexpected line loads whole into the Hebrew
    input, and the review shows the change.
  - Don't click Save or Add to deck without asking. With the user's go-ahead, save one test
    note, then confirm in Anki that the `<bdi>` line renders with the punctuation on the left of
    its Hebrew, and (PR 3) that the word is bold.
- PR 2: with the user's go-ahead only (each call costs money), click Suggest on רכבת, a verb, and
  a word with two meanings like כרטיס. Check that the sentences are full and punctuated, use the
  listed forms in varied ways, and give one per meaning.
