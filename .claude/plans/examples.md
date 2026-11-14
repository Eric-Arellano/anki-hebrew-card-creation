# Examples: the word in bold

## Context

Claude writes `Examples` as full, punctuated sentences, each using the word in a different form,
and the editor gives each example a row, with a Hebrew input and an English input
(`ExamplesInput.svelte`), held as `CardDraft.examples: Example[]` (`src/lib/card/examples.ts`).
What's left is to bold the word in each sentence on the card, so the form it takes stands out.

The word's forms come from `labeledForms(inputs, formsField)` in `src/lib/card/examples.ts`: the
inputs' and `Forms`' other forms, labeled and with the blank left out. The suggest request sends
them to Claude, and `examplesWithoutWord` (`src/lib/card/checks/examples.ts`) checks each row
against them, plus the word, its pointed form, and a verb's root. The bold must use the same
forms, so the check and the bold can't disagree.

Decided with the user:

- **Each line keeps its Hebrew in a `<bdi lang="he">`** and its English in a separate element,
  as `src/lib/card/examples.ts`'s header shows, so the note type's styling can set the English
  under the Hebrew, without parentheses.
- **Don't design around the current deck.** The human will fix old cards by hand.
  `examplesFromHtml` reads the format this tool writes, and loads any other line whole into the
  Hebrew input, never guessed apart. Before a save, the review shows what changed.
- **`Examples` is composed outside `composeFields`**, since it comes from the draft's rows, not
  the inputs: `CardEditor.svelte`'s `ankiFields` passes `examples:
  examplesToAnkiFieldHtml(draft.examples)` into `composed`, and `from-note.test.ts`'s `saved`
  helper mirrors it. A change to that call's arguments goes in both.
- **The word is bolded in each example on the card.**
- Disambiguation hints are out of scope.

## PR 1: bold the word on the card

- `src/lib/hebrew/usage.ts`: alongside `usesForm`/`usesRoot`, add a function that returns the
  ranges of `text` holding one of `forms` or the root, as `[start, end)` offsets into the
  original text. Tokenize the original string, with niqqud allowed inside a token, and compare
  each token's comparison key, so the offsets never pass through `toComparisonKey`. A form of
  several words covers its first through last token, and a prefixed token is bolded whole
  (`ברכבת`). Then make `usesForm`/`usesRoot` “has a range”, so the check and the bold can't
  disagree. Exhaustive tests here: prefixes, pointed text, multi-word forms, a root, no match.
- `examplesToAnkiFieldHtml(examples, forms, root)` wraps each range in `<b>`, inside the
  `<bdi>`, escaping around it. No match, no bold. Its callers pass the forms `examplesWithoutWord`
  checks against (the word, its pointed form, and `labeledForms`' forms) and the root, as the
  check gets them. `examplesFromHtml` already strips the `<b>` through `ankiFieldHtmlToText`, so
  an unchanged note composes back identically and the review shows no change.
- `examplesWithoutWord` (which already answers with row indexes) becomes “rows with a filled
  Hebrew and no range”.
- The matching ignores ו and י inside a word (`usage.ts`'s header), so a near-miss like `סיפור`
  for `ספר` can be bolded. That's the same tolerance the warning already has, and it's visible on
  the card. Note it in the function's comment.
- Editor test: saving a note bolds the form in `Examples`.

## Verification

- `npm run lint && npm run check && npm test`, and `svelte-autofixer` clean on every touched
  `.svelte` file. Run `uptime` first if anything looks slow.
- Don't click Save or Add to deck without asking. With the user's go-ahead, save one test note,
  then confirm in Anki that the word is bold.
