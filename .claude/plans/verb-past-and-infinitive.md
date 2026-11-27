# Verbs: the past beside the infinitive

## Context

A Hebrew verb has two stems. The past and the present share one, and the infinitive, future and
imperative share the other. In a regular verb the two look alike, כָּתַב beside לִכְתֹּב, but many
of the verbs a beginner meets first split them:

| Past, present | Infinitive, future, imperative |
|---|---|
| הָלַךְ, הוֹלֵךְ | לָלֶכֶת, אֵלֵךְ, לֵךְ |
| יָשַׁב, יוֹשֵׁב | לָשֶׁבֶת, אֵשֵׁב, שֵׁב |
| נָתַן, נוֹתֵן | לָתֵת, אֶתֵּן, תֵּן |
| נִכְנַס, נִכְנָס | לְהִכָּנֵס, אֶכָּנֵס |

Neither form predicts the other, so the deck drills both, the way Latin is learned as amo, amare.
Spoken Hebrew's "to say" splits along the same line between two verbs: אָמַר and אוֹמֵר, but
לְהַגִּיד and אַגִּיד. It stays one note, להגיד with the past אמר, because a note stands for the
meaning.

Today a verb goes by its infinitive (the reasons are in `src/lib/card/prefill.ts`), and its
`Production answer` is the infinitive alone (`composeVerbFields` in
`src/lib/card/parts-of-speech/verb.ts`). Its past, present and future are pointed inputs shown in
`Forms` and never quizzed. `Audio` holds one recording, found in Downloads by the word's spelling
(`AudioInput.svelte`).

This runs beside `verb-prepositions.md`, and neither waits for the other.

## Decisions

- The note still goes by its infinitive: the `Hebrew` field, the Reading card and the
  prepositions all stay as they are.
- The Production answer is the infinitive and then the past for "he", unpointed: `ללכת הלך`, as a
  noun's is `כלב טוב`. The one card drills the link between the two. It is hardest, and so
  reviewed most, for exactly the verbs that split.
- The Reading card shows the infinitive alone. Recognizing a form is easier than producing it, so
  once the past is typed on every Production review, it will be known when seen.
- `Audio` holds a recording of each form, the infinitive's first. It plays on every back, and it
  is the only place the past is heard. The Listening front plays both.
- The present stays in `Forms`, unquizzed, since it follows from the past, as the future mostly
  follows from the infinitive. A variant holds what neither predicts, like אֶלְמַד, "I will
  learn", whose vowel isn't the one in לִלְמֹד.
- Root and binyan stay unquizzed, because the two forms show them. The deck check already lists
  the notes that share a root (`DeckCheck.svelte`).

*Rejected: the past as the note's word, because it only moves the split (לשבת can't be had from
ישב). Also, over a quarter of pasts share their spelling with another entry (Wiktionary has four
titled ישב), and "to go" would ask for a past.*
*Rejected: a "he went" variant on each verb that splits, because it drills the past against the
English rather than against ללכת, and it takes one of two variant slots. It would also ask a
beginner to judge which verbs split.*
*Rejected: a Reading card for the past, because the bare past is Hebrew's most ambiguous
spelling, and text shows הלכתי and הולכים, which neither card would show.*
*Rejected: both forms on the Reading front, because the card would pass on whichever form is
known better.*

## The app changes, as PRs

### PR 1: the Production answer adds the past

- An unpointed past input in `VerbInputs.svelte`, "Past (he), without niqqud", beside the pointed
  one, required for a verb and named in `INPUT_NAMES`. It is its own input because the Hebrew
  rules forbid stripping the pointed past: דִּבֵּר strips to דבר, not דיבר, as `composeFields`
  notes for the word.
- Prefill fills it from the entry's title, since Wiktionary titles a verb with its unpointed past
  (`הלך`, `דיבר`). `prefillBlanks` keeps a held value and offers the title beside it. The human
  types it only with no entry picked, or to give one verb another's past, as for להגיד.
- A warning when it doesn't spell the pointed past, as `misspellsWord` gives for the word.
- `composeVerbFields` writes `${word} ${past}`, and `fromNote` reads the past back with
  `afterWord`, as it reads a noun's טוב.
- Help and comments follow:
  - `PART_OF_SPEECH_HELP.verb` says a verb is learned by its infinitive and its past.
  - The verb variant's example in `field-help.ts` becomes אֶלְמַד, "I will learn", since אֵלֵךְ
    now follows from ללכת.
  - The "never quizzed" comment in `verb.ts` and the reason in `prefill.ts` are rewritten.
- The check's prompt (`src/lib/server/ai/check.ts`) says a verb's past may be another verb's,
  where that is the one speakers use, as אמר for להגיד, so the check doesn't fault it.
- A pu'al or huf'al has no infinitive, so its word is its past. Today prefill leaves the word
  blank, so instead it fills the word and pointed word from the entry's title and pointed form,
  as for a noun. Its second past input is hidden and not required, and its Production answer is
  the word alone. `PART_OF_SPEECH_HELP.verb` says so in a clause. These are rare for a
  beginner, so this only keeps the editor from asking for a form that doesn't exist.

### PR 2: the backs show the answer with niqqud

- A `Pointed answer` field, composed entirely, like `Production answer`:
  - for a verb, the pointed infinitive and past, לָלֶכֶת הָלַךְ, or a passive's pointed past
    alone;
  - for a noun, the pointed word and a pointed טוֹב beside `productionTov`'s, כֶּלֶב טוֹב;
  - for the rest, the pointed word.
- A verb's past leaves `Forms`, which keeps the present and future. `fromNote` reads the pointed
  past back from `Pointed answer` with `afterWord`.
- `note-type.ts` gains the field. `tests/fixtures/anki/` gets a `notesInfo` captured once the
  human has added it, since fixtures are real data.
- *Rejected: the pointed past left in `Forms`, under the pointed infinitive, because half the
  answer would sit in small print among forms that aren't quizzed.*
- *Rejected: both forms in `Pointed`, because the app reads `Pointed` as the headword, to check
  the word's spelling, to choose its infinitive and to tell Claude.*

### PR 3: a recording of each form

- The media's one `audio` becomes one per form: the word's and, for a verb that isn't passive,
  the past's, which is optional. `Audio` holds them in that order, `[sound:…ללכת.mp3][sound:…הלך.mp3]`, and Anki plays
  them in turn. `fromNote` reads a verb's two by their order. Today a field naming several
  recordings fills none.
- A second `AudioInput` for the past, with its own Forvo chip and Downloads lookup keyed by the
  unpointed past. `forvoDownloadOf` already matches any word, so downloading both from Forvo
  attaches both with no typing.
- Paste and drop listen on the window today, "since a note has only one place for it". With two
  places, a drop on a recording's box attaches there. A paste or drop anywhere else goes to the
  one box still empty, and is refused, naming the boxes, when both are empty or both are full.

## In Anki, by the human

The app can't edit the note type, so these steps are done by hand:

- **Any time:** fix the `Production answer` field description, which still says "Verb + prep or
  את". It should read "Noun + טוב/ה. Verb: infinitive + past (he). Everything else: Hebrew
  field."
- **Any time:** a hint on the Production front for the shape of the answer, from the part of
  speech, in CSS alone. It works for nouns today, and a note with no `Part of speech` shows
  nothing. Above the type box:

  ```html
  <div class="answer-shape pos-{{text:Part of speech}}"></div>
  ```

  and in Styling:

  ```css
  .answer-shape.pos-noun::after { content: "noun + טוב/ה"; }
  .answer-shape.pos-verb::after { content: "infinitive + past (he)"; }
  ```

- **Before using PR 2's app:** add the `Pointed answer` field, because the app writes every field
  in `FIELDS`. On the three backs, show it in place of `{{Pointed}}` and the unpointed `chunk` div,
  keeping both divs' classes. Fall back to `{{Pointed}}` for the notes that predate it:
  `{{#Pointed answer}}…{{/Pointed answer}}{{^Pointed answer}}…{{Pointed}}…{{/Pointed answer}}`.
- **Optional:** binyan and root on one line, "pa'al · ה־ל־ך", since together they decide how the
  verb conjugates.

## After the PRs, by the human

Re-save the verbs once, with the step in `verb-prepositions.md`: each gets its unpointed past and
a recording of it. Seven of the old notes (ישב, דיבר, למד, אמר, עמד, חשב, ראה) already hold the
past's recording, because they were keyed by it.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte
  file until it's clean. No test reaches the network or a real Anki.
- By hand under `npm run dev`: picking הלך's entry fills ללכת, הָלַךְ and הלך, and the note
  saves `ללכת הלך` and `לָלֶכֶת הָלַךְ`. Downloading both of Forvo's recordings attaches both.
  Nothing is added to Anki without the human clicking Add to deck.
