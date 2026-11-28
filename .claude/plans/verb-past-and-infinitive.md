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
`Answer` is the infinitive and then the past for "he", unpointed: `ללכת הלך`
(`composeVerbFields` in `src/lib/card/parts-of-speech/verb.ts`). The unpointed past is its own
input, `unpointedPast`, filled from the entry's title, because stripping the pointed past is
wrong: דִּבֵּר is spelled דיבר. The past, present and future are also pointed inputs, shown in
`Forms`. A pu'al or huf'al has no infinitive (`hasInfinitive` in `src/lib/hebrew/binyan.ts`), so
its word is its past and it has no `unpointedPast`: its Answer is the word alone.
`Audio` holds one recording, found in Downloads by the word's spelling (`AudioInput.svelte`).

The code already names the fields as PR 1 will name them in Anki: `FIELDS.word`, `wordPointed`,
`answer` and `meanings`, and the `wordPointed` and `meanings` inputs.

## Decisions

- The note still goes by its infinitive: the `Word` field, the Reading card and the
  prepositions all stay as they are.
- The `Answer`, typed on the Production card, is the infinitive and then the past for "he", unpointed: `ללכת הלך`, as a
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

### PR 1: the fields' Anki names

Every field holds Hebrew, so `Hebrew` named nothing, and PR 2's field would make a second pointed
one. The fields become `Hebrew` → `Word`, `Pointed` → `Word pointed`, `Production answer` →
`Answer` and `Definitions` → `Meanings`, as the editor already calls them.

*Rejected: `Unpointed` for `Word`, because it says the script, not what the field is, and the
pair would not extend to the answer.*
*Rejected: `Production answer pointed`, because it shows on every back, not just Production's.*

- The `name`s in `note-type.ts` change, and so does every string that names a field: tests, the
  Claude prompts and schemas under `src/lib/server/ai/`, editor copy, and the README.
- `tests/fixtures/anki/` is re-captured from Anki after the human renames, since fixtures are real
  data, not edited by hand.
- It lands with the human's rename in Anki: the app writes every field by name, so an app on
  either side of the rename can't add a note to a note type on the other.

### PR 2: the backs show the answer with niqqud

- An `Answer pointed` field, composed entirely, like `Answer`:
  - for a verb, the pointed infinitive and past, לָלֶכֶת הָלַךְ, or, for a verb without an
    infinitive, its pointed word alone, which is its past;
  - for a noun, the pointed word and a pointed טוֹב beside `productionTov`'s, כֶּלֶב טוֹב;
  - for the rest, the pointed word.
- A verb's past leaves `Forms`, which keeps the present and future. `draftFromNote` reads the
  pointed past back from `Answer pointed` with `afterWord`, as it reads `unpointedPast` from
  `Answer`, and only for a verb, since a noun's answer holds its טוב there.
- `note-type.ts` gains it as `answerPointed`. `tests/fixtures/anki/` gets a `notesInfo` captured once the
  human has added it, since fixtures are real data.
- *Rejected: the pointed past left in `Forms`, under the pointed infinitive, because half the
  answer would sit in small print among forms that aren't quizzed.*
- *Rejected: both forms in `Word pointed`, because the app reads it as the headword, to check
  the word's spelling, to choose its infinitive and to tell Claude.*

### PR 3: a recording of each form

- The media's one `audio` becomes one per form: the word's and, for a verb with an infinitive,
  the past's, which is optional. `Audio` holds them in that order,
  `[sound:…ללכת.mp3][sound:…הלך.mp3]`, and Anki plays them in turn. `draftFromNote` reads a
  verb's two by their order. Today a field naming several
  recordings fills none.
- A second `AudioInput` for the past, with its own Forvo chip and Downloads lookup keyed by the
  `unpointedPast`. `forvoDownloadOf` already matches any word, so downloading both from Forvo
  attaches both with no typing.
- Paste and drop listen on the window today, "since a note has only one place for it". With two
  places, a drop on a recording's box attaches there. A paste or drop anywhere else goes to the
  one box still empty, and is refused, naming the boxes, when both are empty or both are full.

## In Anki, by the human

The app can't edit the note type, so these steps are done by hand, in Tools → Manage Note Types
→ Hebrew. The note type below is what Anki should hold once PR 2 lands, read through AnkiConnect
on 2026-11-28 and then edited for this plan. Its styling isn't here, because AnkiConnect's
`modelStyling` is off the allowlist, and it doesn't change.

### With PR 1: rename the fields

Do this when PR 1 is ready to merge, and run PR 1's app from then on: an app on the other side
of the rename can't add a note.

1. Fields… → select each and Rename: `Hebrew` → `Word`, `Pointed` → `Word pointed`,
   `Production answer` → `Answer`, `Definitions` → `Meanings`. Anki rewrites the templates that
   use them, so the fronts then match the ones below.
2. Set each description to the one in the table below.
3. Preview a card of each type. Then tell Claude, so PR 1 can re-capture its fixtures.

### Before using PR 2's app: the Answer pointed field

The app writes every field in `FIELDS`, so a note type without this field breaks Add to deck.

1. Fields… → Add → `Answer pointed`, spelled exactly so, and move it below `Answer`. Its
   description is in the table below.
2. Cards… → paste the Reading, Production and Listening Back Templates below over the old ones.
   A note saved before PR 2 has an empty `Answer pointed`, so its back shows `Word pointed` and
   `Answer` as it does today. The backs also put binyan and root on one line, "pa'al · ה־ל־ך",
   since together they decide how a verb conjugates. A noun or adjective, which has a root and no
   binyan, keeps "root: ח־ת־ל".
3. Preview ללכת, חתול and any old note. Then tell Claude, so PR 2 can capture a `notesInfo`
   fixture with the new field.

### Fields

In this order. A blank description is blank in Anki.

| Field | Description |
|---|---|
| `Word` | Unpointed. Noun: sg, verb: inf, adj: m.sg |
| `Word pointed` | The headword with niqqud. |
| `Answer` | Noun: noun + טוב or טובה. Verb: infinitive + past for he. Anything else: the Word field. |
| `Answer pointed` | Filled by the app: the answer with niqqud. Verb: לָלֶכֶת הָלַךְ. Noun: כֶּלֶב טוֹב. |
| `Meanings` | English meaning(s) |
| `Production context` | Disambiguation for the English, i.e. where >1 Hebrew word can be used |
| `Reading context` | Hebrew phrase if spelling is ambiguous |
| `Images` | |
| `Audio` | |
| `Part of speech` | One of: noun, verb, adjective, adverb, preposition, phrase, other |
| `Gender` | Nouns: m, f or mf |
| `Forms` | One per line, e.g. "pl: כְּלָבִים" |
| `Binyan` | Verbs: pa'al, nif'al, pi'el, pu'al, hif'il, huf'al, hitpa'el |
| `Root` | e.g. ח־כ־ה |
| `Variant 1 prompt` | Irregular form's prompt, e.g. "good tables". Can include image |
| `Variant 1 answer` | Pointed Hebrew. Blank means no card |
| `Variant 2 prompt` | Use if the word has a second unusual variant |
| `Variant 2 answer` | |
| `Examples` | |
| `Notes` | |

### Reading

Front Template:

```html
<div class="he hw" dir="rtl" lang="he">{{Word}}</div>

{{#Reading context}}
<div class="context">Context: {{Reading context}}</div>
{{/Reading context}}
```

Back Template:

```html
{{FrontSide}}

<hr id="answer">

{{#Meanings}}<div class="defs">{{Meanings}}</div>{{/Meanings}}
{{Images}}

{{#Answer pointed}}
<div class="he pointed g-{{text:Gender}} pos-{{text:Part of speech}}" dir="rtl" lang="he">{{Answer pointed}}</div>
{{/Answer pointed}}
{{^Answer pointed}}
<div class="he pointed g-{{text:Gender}}" dir="rtl" lang="he">{{Word pointed}}</div>
<div class="he chunk g-{{text:Gender}} pos-{{text:Part of speech}}" dir="rtl" lang="he">{{Answer}}</div>
{{/Answer pointed}}
{{#Forms}}<div class="forms">{{Forms}}</div>{{/Forms}}
{{#Binyan}}<div class="meta">{{Binyan}}{{#Root}} · <span dir="rtl" lang="he">{{Root}}</span>{{/Root}}</div>{{/Binyan}}
{{^Binyan}}{{#Root}}<div class="meta">root: <span dir="rtl" lang="he">{{Root}}</span></div>{{/Root}}{{/Binyan}}

{{Audio}}

{{#Examples}}<div class="examples">{{Examples}}</div>{{/Examples}}
{{#Notes}}<div class="notes">Note: {{Notes}}</div>{{/Notes}}
```

### Production

Front Template:

```html
{{#Meanings}}<div class="defs quiz">{{Meanings}}</div>{{/Meanings}}
{{#Production context}}<div class="context">{{Production context}}</div>{{/Production context}}
{{Images}}

<div class="answer-shape pos-{{text:Part of speech}}"></div>
<div dir="rtl" lang="he">{{type:Answer}}</div>
```

Back Template. It has no `Answer` line, since the typed-answer check already shows it:

```html
<div class="revealed">{{FrontSide}}</div>

<hr id="answer">

{{#Answer pointed}}
<div class="he pointed g-{{text:Gender}} pos-{{text:Part of speech}}" dir="rtl" lang="he">{{Answer pointed}}</div>
{{/Answer pointed}}
{{^Answer pointed}}
<div class="he pointed g-{{text:Gender}}" dir="rtl" lang="he">{{Word pointed}}</div>
{{/Answer pointed}}
{{#Forms}}<div class="forms">{{Forms}}</div>{{/Forms}}
{{#Binyan}}<div class="meta">{{Binyan}}{{#Root}} · <span dir="rtl" lang="he">{{Root}}</span>{{/Root}}</div>{{/Binyan}}
{{^Binyan}}{{#Root}}<div class="meta">root: <span dir="rtl" lang="he">{{Root}}</span></div>{{/Root}}{{/Binyan}}

{{Audio}}

{{#Reading context}}<div class="context">{{Reading context}}</div>{{/Reading context}}
{{#Examples}}<div class="examples">{{Examples}}</div>{{/Examples}}
{{#Notes}}<div class="notes">Note: {{Notes}}</div>{{/Notes}}
```

### Listening

Front Template:

```html
{{Audio}}
```

Back Template:

```html
{{FrontSide}}

<hr id="answer">

{{#Meanings}}<div class="defs">{{Meanings}}</div>{{/Meanings}}
{{Images}}

{{#Answer pointed}}
<div class="he pointed g-{{text:Gender}} pos-{{text:Part of speech}}" dir="rtl" lang="he">{{Answer pointed}}</div>
{{/Answer pointed}}
{{^Answer pointed}}
<div class="he pointed g-{{text:Gender}}" dir="rtl" lang="he">{{Word pointed}}</div>
<div class="he chunk g-{{text:Gender}} pos-{{text:Part of speech}}" dir="rtl" lang="he">{{Answer}}</div>
{{/Answer pointed}}
{{#Forms}}<div class="forms">{{Forms}}</div>{{/Forms}}
{{#Binyan}}<div class="meta">{{Binyan}}{{#Root}} · <span dir="rtl" lang="he">{{Root}}</span>{{/Root}}</div>{{/Binyan}}
{{^Binyan}}{{#Root}}<div class="meta">root: <span dir="rtl" lang="he">{{Root}}</span></div>{{/Root}}{{/Binyan}}

{{#Reading context}}<div class="context">{{Reading context}}</div>{{/Reading context}}
{{#Examples}}<div class="examples">{{Examples}}</div>{{/Examples}}
{{#Notes}}<div class="notes">Note: {{Notes}}</div>{{/Notes}}
```

### Variant 1 and Variant 2

Unchanged. Variant 2's are the same with 2 in place of 1.

Front Template:

```html
{{#Variant 1 answer}}
<div class="prompt">{{Variant 1 prompt}}</div>
{{/Variant 1 answer}}
```

Back Template:

```html
{{FrontSide}}

<hr id="answer">

<div class="he pointed" dir="rtl" lang="he">{{Variant 1 answer}}</div>
```

## After the PRs, by the human

Re-save the 11 verbs still keyed by their past: אמר, כתב, ישב, דיבר, למד, עמד, חשב, קרא, בא,
רצה, ראה (read through AnkiConnect, 2026-11-26). Only אמר has a `Part of speech`. Each becomes its
infinitive, with a binyan, a preposition per meaning (Suggest meanings drafts the lines), its
unpointed past and a recording of it; ללכת joins them, and אמר becomes להגיד. Seven (ישב, דיבר,
למד, אמר, עמד, חשב, ראה) already hold the past's recording, because they were keyed by it. Then
reset reviews for the deck.

## Verification

- Each PR: `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte
  file until it's clean. No test reaches the network or a real Anki.
- By hand under `npm run dev`: picking הלך's entry fills ללכת, הָלַךְ and הלך, and the note
  saves `ללכת הלך` and `לָלֶכֶת הָלַךְ`. Downloading both of Forvo's recordings attaches both.
  Nothing is added to Anki without the human clicking Add to deck.
