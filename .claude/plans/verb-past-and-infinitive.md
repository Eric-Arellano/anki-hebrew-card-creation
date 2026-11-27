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
`Production answer` is the infinitive and then the past for "he", unpointed: `ללכת הלך`
(`composeVerbFields` in `src/lib/card/parts-of-speech/verb.ts`). The unpointed past is its own
input, `unpointedPast`, filled from the entry's title, because stripping the pointed past is
wrong: דִּבֵּר is spelled דיבר. The past, present and future are also pointed inputs, shown in
`Forms`. A pu'al or huf'al has no infinitive (`hasInfinitive` in `src/lib/hebrew/binyan.ts`), so
its word is its past and it has no `unpointedPast`: its Production answer is the word alone.
`Audio` holds one recording, found in Downloads by the word's spelling (`AudioInput.svelte`).

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


### PR 1: the backs show the answer with niqqud

- A `Pointed answer` field, composed entirely, like `Production answer`:
  - for a verb, the pointed infinitive and past, לָלֶכֶת הָלַךְ, or, for a verb without an
    infinitive, its pointed word alone, which is its past;
  - for a noun, the pointed word and a pointed טוֹב beside `productionTov`'s, כֶּלֶב טוֹב;
  - for the rest, the pointed word.
- A verb's past leaves `Forms`, which keeps the present and future. `draftFromNote` reads the
  pointed past back from `Pointed answer` with `afterWord`, as it reads `unpointedPast` from
  `Production answer`, and only for a verb, since a noun's answer holds its טוב there.
- `note-type.ts` gains the field. `tests/fixtures/anki/` gets a `notesInfo` captured once the
  human has added it, since fixtures are real data.
- *Rejected: the pointed past left in `Forms`, under the pointed infinitive, because half the
  answer would sit in small print among forms that aren't quizzed.*
- *Rejected: both forms in `Pointed`, because the app reads `Pointed` as the headword, to check
  the word's spelling, to choose its infinitive and to tell Claude.*

### PR 2: a recording of each form

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
→ Hebrew. The template snippets below were checked against the live templates on 2026-11-27.

### Any time: the Production answer's description

Fields… → `Production answer` → Description. It still says "Verb + prep or את". Replace it with:

> Noun: noun + טוב or טובה. Verb: infinitive + past for he. Anything else: the Hebrew field.

### Any time: a hint for the shape of the answer

The Production front says what to type, from `Part of speech`, using CSS alone. A note with no
part of speech, or one whose answer is just the word, shows nothing.

1. Cards… → Production → Front Template. The hint goes on its own line, just above the type box:

   ```html
   <div class="answer-shape pos-{{text:Part of speech}}"></div>
   <div dir="rtl" lang="he">{{type:Production answer}}</div>
   ```

2. Styling, at the end. Without the first rule the hint inherits the card's headword size, as big
   as the answer itself:

   ```css
   .answer-shape {
     font-size: 0.6em;
     opacity: 0.6;
     margin: 0.6em 0 0.3em;
   }
   .answer-shape.pos-noun::after { content: "type the noun + טוב or טובה"; }
   .answer-shape.pos-verb::after { content: "type the infinitive + its past for he"; }
   ```

   Change `font-size` if 0.6em of your card's size reads too small; it only needs to look
   smaller and dimmer than the question.

Check it with Preview on a noun's card and a verb's saved since the past joined its answer.

### Before using PR 1's app: the Pointed answer field

The app writes every field in `FIELDS`, so a note type without this field breaks Add to deck.

1. Fields… → Add → `Pointed answer`, spelled exactly so. Its position doesn't matter. Description:

   > Filled by the app: the answer with niqqud. Verb: לָלֶכֶת הָלַךְ. Noun: כֶּלֶב טוֹב.

2. Cards… → Reading → Back Template. Replace these two lines:

   ```html
   <div class="he pointed g-{{text:Gender}}" dir="rtl" lang="he">{{Pointed}}</div>
   <div class="he chunk g-{{text:Gender}} pos-{{text:Part of speech}}" dir="rtl" lang="he">{{Production answer}}</div>
   ```

   with this, which shows the one pointed line, or the old two for a note saved before PR 1:

   ```html
   {{#Pointed answer}}
   <div class="he pointed g-{{text:Gender}} pos-{{text:Part of speech}}" dir="rtl" lang="he">{{Pointed answer}}</div>
   {{/Pointed answer}}
   {{^Pointed answer}}
   <div class="he pointed g-{{text:Gender}}" dir="rtl" lang="he">{{Pointed}}</div>
   <div class="he chunk g-{{text:Gender}} pos-{{text:Part of speech}}" dir="rtl" lang="he">{{Production answer}}</div>
   {{/Pointed answer}}
   ```

3. Listening → Back Template: the same replacement as Reading.

4. Production → Back Template. It has only the `{{Pointed}}` line, since the typed-answer check
   already shows the unpointed answer. Replace it with:

   ```html
   {{#Pointed answer}}
   <div class="he pointed g-{{text:Gender}} pos-{{text:Part of speech}}" dir="rtl" lang="he">{{Pointed answer}}</div>
   {{/Pointed answer}}
   {{^Pointed answer}}
   <div class="he pointed g-{{text:Gender}}" dir="rtl" lang="he">{{Pointed}}</div>
   {{/Pointed answer}}
   ```

5. Leave `Pointed` itself where it is. The app still reads it as the headword.

6. Preview any old note: its backs should look as they do today, since its `Pointed answer` is
   empty. Then tell Claude, so PR 1 can capture a `notesInfo` fixture with the new field.

### Optional

Binyan and root on one line, "pa'al · ה־ל־ך", since together they decide how the verb
conjugates.

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
