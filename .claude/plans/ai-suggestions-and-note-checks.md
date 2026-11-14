# AI suggestions and note checks

## Context

The editor fills a note deterministically from Wiktionary, but three fields are left to the
human: `Examples`, `Production context` and `Reading context`. The dictionary can't fill them. Of
its 18,182 entries, only 1,117 (6%) carry a modern usage example with English; the rest of the
3,604 with examples are mostly Bible quotations. Knowing which near-synonyms collide with a word
is just what a learner doesn't know yet. Here Claude suggests those three fields, and checks the
whole note before it's saved.

This also reverses a hard rule: "Never reach a third-party site." The server now calls one host,
`api.anthropic.com`, and only in answer to a click or a Save. Everything else stays deterministic.
Niqqud, gender, binyan, root, forms and definitions never come from a model. The dictionary gives
them, and a model's mistake there is expensive.

Neither call is an agent. Each is one request, with no tools and no loop, whose answer is
validated against a schema. Most of the risk we avoided by staying deterministic came from tools
and loops, and there are none here.

The flow, with no buttons beyond the ones the editor already has plus one:

- Pick a dictionary entry.
- Click Suggest. The blank fields among the three fill in.
- Edit what's wrong.
- ⌘↵ shows the review, and the check's findings arrive there.
- ⌘↵ saves.

*Rejected: `Notes`, because a model's usage notes are the likeliest place for confident nonsense,
and the human can write their own.*

## Decisions

- **Opus, because Hebrew is where models are weakest.** `claude-opus-5-5` at
  `output_config.effort: "low"`, with `fallbacks: "default"` so a refusal reruns on another model.
  A suggest call is about 1k tokens in and 1–2k out, which comes to roughly 3–5¢; a check is about
  the same. At 300 words a year, both calls on every word come to about $30. Prompt caching
  doesn't apply, because the system prompts are under the minimum cacheable prefix. A learner
  can't easily spot unnatural Hebrew, and spaced repetition drills whatever it's given, so
  quality is worth the price.
  *Rejected: Haiku 5.5. It's about 40× cheaper, but its Hebrew is the weak spot.*
- **The official SDK, `@anthropic-ai/sdk`.** It's first-party, typed, and handles retries and
  errors. The human approved adding it as a dependency.
- **One Suggest button for all three fields, in one call.** They share the same input (the word,
  its pointed form, its part of speech and its meanings), so one round trip fills them all.
- **Suggestions fill blank fields directly, and never overwrite.** A filled field is left alone,
  so clearing a field and clicking again regenerates just that field. Each filled field shows a
  "Suggested" badge for as long as its value is still exactly what Claude wrote. The badge
  disappears once the human edits it, so it's clear what hasn't been read yet. This is the
  fewest-clicks shape: editing out a bad line is cheaper than adding good ones one by one.
  *Rejected: a list of choices with Add on each, because three fields of choices is a dozen
  clicks.*
- **The deterministic part stays deterministic.** Two things are decided before Claude is asked:
  - **Reading context:** the server finds which other words the spelling could be by running its
    own `lookUp` for the word, because the editor stops looking up once an entry is picked. The
    lemmas whose pointed form isn't the note's are the homographs. Reading context is requested
    only when there's at least one, and Claude gets them with their meanings. With none, the
    field stays blank.
  - **Production context:** this one does rest on Claude's knowledge of which English meanings
    other Hebrew words share. Claude answers `null` when there's no common collision.
- **The instructions are the editor's own help.** The prompt quotes `FIELD_HELP` and
  `examplesHelp` from `src/lib/field-help.ts` for each field. That way, what the human is told to
  write and what Claude is told to write can't drift apart.
- **Every suggestion passes pure guards before it's shown.** All of them run through
  `src/lib/hebrew/`:
  - A suggestion containing `<`, `>` or `&` is dropped, since textarea text is saved as HTML.
  - Each example is one line, in the help's form: unpointed Hebrew, then its English in
    parentheses.
  - A production context with Hebrew letters is dropped, because it would give the answer away.
  - A reading context with Latin letters is dropped, because it would translate.
  - Examples are unpointed. Pointing from a model isn't a source the Hebrew text rules can trust.
- **The check runs at the review step, not on its own button.** The first ⌘↵ already shows the
  review for an edit. With a key configured, it now does the same for a new note, and starts the
  check. Findings arrive under the fields they name. The second ⌘↵ saves whether or not the check
  has answered. The check advises and never blocks, so a slow or failed call costs nothing but
  its findings. Without a key, the review behaves as `editing-and-saving-notes.md` has it.
  *Rejected: running the check inside Save, because it would make every save wait several
  seconds on a model.*
- **The check judges words and grammar, never niqqud.** It's told that pointing comes from
  Wiktionary and to leave it alone. It looks for:
  - unnatural or wrong Hebrew in `Examples`, the variants and `Reading context`
  - a hint that gives its answer away
  - an example that uses a different sense than `Definitions`
  - a variant answer that doesn't answer its prompt
  - a `Gender` or `Binyan` that contradicts the examples

  Each finding is a field, the problem, and optionally a suggested rewrite as plain text, which
  the human applies by hand.
- **No key, no AI.** `ANTHROPIC_API_KEY` is read with `$env/dynamic/private` inside
  `src/lib/server/ai/`, so it never reaches the browser. Without it, Suggest doesn't render and the
  review doesn't check. `.env` joins `.gitignore`, which doesn't list it today.
- **Only the note's own text leaves the machine.** That means the word, its fields, its meanings
  and the homographs' meanings. Images, audio and the rest of the deck stay local.
- **`request-guard.ts` already protects the credits.** Both routes are JSON POSTs, so a cross-site
  page can't trigger them.

## PR 1 — The Claude client

A prefactor: nothing in the editor calls it yet.

- Add `@anthropic-ai/sdk`.
- `src/lib/server/ai/client.ts`: `isAiAvailable()`, and one function that sends a system prompt
  and a user message and returns the structured output parsed against a zod schema. It handles
  `stop_reason` (a refusal, or `max_tokens`) and maps the SDK's typed errors to a message the bar
  can show. The model, effort and fallbacks live here, in one place.
- `GET /api/ai/status` answers `{ available }`, and `src/lib/api/ai.ts` calls it.
- AGENTS.md: the third-party rule names `api.anthropic.com` as its one exception, reachable only
  from `src/lib/server/ai/` and only on the human's click or Save. A new rule: don't run Suggest
  or the check against the real API without asking, because it costs money. `.env` goes in
  `.gitignore`. The README explains how to set the key.
- Tests: a mocked SDK client covers the parse, a refusal, `max_tokens`, an API error and a missing
  key.

## PR 2 — Suggest examples and hints

- `src/lib/server/ai/suggest.ts` holds the pure parts: the prompt, built from `field-help.ts`; the
  homographs, from `lookUp`; and the guards. The suggestion schema is
  `{ examples: { hebrew, english }[], productionContext: string | null, readingContext: string | null }`,
  where `readingContext` is left out of the request when there are no homographs.
- `POST /api/suggest` takes `{ word, pointed, partOfSpeech, definitions }`. It refuses a blank word
  or no definitions, answers 503 without a key, and 502 on a failed call.
- The Suggest button sits at the head of the editor's field groups. It's disabled, with its reason
  shown, until there's a word and a meaning, or when all three fields are already filled. It shows
  a spinner while waiting. Its reply fills only the fields that are still blank when it lands, so
  typing during the call wins.
- The Suggested badge, held as the suggested value for each field and compared with the current
  value.
- Run `svelte-autofixer` on each Svelte file.
- Tests:
  - The guards, each on the input it drops.
  - The prompt, for a word with homographs and one without.
  - The route, through a fake client.
  - The component: blank-only filling, the badge clearing on edit, and the button hidden without a
    key.
  - A real response, captured once with the human's go-ahead, as the fixture.

## PR 3 — Check the note at review

Lands after `editing-and-saving-notes.md`'s PR 5, which builds the review step and saving a new
note in the app.

- `src/lib/server/ai/check.ts`: the prompt and the findings schema
  `{ findings: { field: FieldKey, problem, rewrite?: string }[] }`. A finding that names a field
  the note doesn't show is dropped.
- `POST /api/check` takes the composed fields as text, using `ankiFieldHtmlToText` with no images
  and no audio, plus the part of speech and the picked candidate's meanings.
- The review step: a new note gets one when a key is set. It starts the check and shows findings
  under their fields, "No problems found" when there are none, or the error. The second ⌘↵ saves
  at any point and aborts a check still running.
- Tests: the prompt, the schema's dropping of unknown fields, the route through a fake client, and
  the review showing findings and saving before the check returns. Plus a real captured response.

## Open

- **Open:** show Wiktionary's modern usage examples, the 6% that have them, beside Claude's.
  They're free and written by people.
- **Open:** an eval set, about 20 words graded by the human, to judge prompt and effort changes
  rather than guess at them. `/claude-api build-eval` walks through building one.
- **Open:** whether the check is worth `medium` effort. Measure on the eval before raising it.

## Verification

- Each PR: run `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte
  file until it's clean. No test reaches the network: the SDK client is faked in every test.
- After PR 2, by hand under `npm run dev` with a key, and only with the human's go-ahead, for a
  noun, a verb, a phrase and ספר (which has homographs):
  - Suggest fills the blank fields, leaves a filled one alone, and gives ספר a reading context.
  - A word with no homographs gets none.
  - The badge clears on edit.
- After PR 2, remove the key: Suggest is gone and nothing else changes.
- After PR 3, the same way: plant a wrong-gender example and a hint that names its answer, and
  check that the review flags both. Then save before the check answers, and the save still goes
  through.
- After each, the Anthropic Console's usage confirms the cost per call. Set a monthly spend limit
  there.
