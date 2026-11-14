# AI suggestions and note checks

## Context

The editor fills a note deterministically from Wiktionary, but three fields are left to the
human: `Examples`, `Production context` and `Reading context`. The dictionary can't fill them. Of
its 18,182 entries, only 1,117 (6%) carry a modern usage example with English; the rest of the
3,604 with examples are mostly Bible quotations. Knowing which near-synonyms collide with a word
is just what a learner doesn't know yet. Claude already suggests those three fields, from a
Suggest button at the head of the field groups. What's left is having it check the whole note
before it's saved.

The server may call one third-party host, `api.anthropic.com`, from `src/lib/server/ai/` alone
and only in answer to a click or a Save; AGENTS.md's hard rules say so. Everything else stays
deterministic. Niqqud, gender, binyan, root, forms and definitions never come from a model. The
dictionary gives them, and a model's mistake there is expensive.

Neither call is an agent. Each is one request, with no tools and no loop, whose answer is
validated against a schema. Most of the risk we avoided by staying deterministic came from tools
and loops, and there are none here.

The flow, with no buttons beyond the ones the editor already has plus Suggest:

- Pick a dictionary entry.
- Click Suggest. The blank fields among the three fill in.
- Edit what's wrong.
- ⌘↵ shows the review, and the check's findings arrive there.
- ⌘↵ saves.

*Rejected: suggesting `Notes`, because a model's usage notes are the likeliest place for
confident nonsense, and the human can write their own.*

## Decisions

- **Opus, because Hebrew is where models are weakest.** `claude-opus-5-5` at
  `output_config.effort: "low"`, with `fallbacks: "default"` so a refusal reruns on another model.
  A suggest call measured 1,015 tokens in and 123 out, and took about 4 seconds; a check should be
  about the same. Prompt caching doesn't apply, because the system prompts are under the minimum
  cacheable prefix. A learner can't easily spot unnatural Hebrew, and spaced repetition drills
  whatever it's given, so quality is worth the price.
  *Rejected: Haiku 5.5. It's about 40× cheaper, but its Hebrew is the weak spot.*
- **One client, `src/lib/server/ai/client.ts`.** Its `askForStructured` sends a system prompt and
  a user message through the official SDK and returns the answer parsed against a zod schema, or
  rejects with an `AiError` whose message the editor can show as it is. The model, effort and
  fallbacks live there and nowhere else. Its second parameter, a `ClaudeMessages`, is what a test
  fakes; `src/lib/server/ai/suggest.ts` and `src/routes/api/ai/suggest/` show the shape a caller
  and its route take, down to the route answering 503 without a key and 502 with an `AiError`'s
  message.
- **The routes live under `/api/ai/`**, beside `/api/ai/status`, and their types and browser calls
  in `src/lib/api/ai.ts`.
- **The instructions are the editor's own help.** The suggest prompt quotes `FIELD_HELP` from
  `src/lib/field-help.ts` for each field, so what the human is told to write and what Claude is
  told to write can't drift apart. The check's prompt should judge against the same help.
- **The check runs at the review step, not on its own button.** The first ⌘↵ already shows the
  review for an edit. With a key configured, it now does the same for a new note, and starts the
  check. Findings arrive under the fields they name. The second ⌘↵ saves whether or not the check
  has answered. The check advises and never blocks, so a slow or failed call costs nothing but
  its findings. Without a key, the review behaves as `SaveBar.svelte` has it today: an edit shows
  one, and a new note is added at the first ⌘↵.
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
- **No key, no AI.** `ANTHROPIC_API_KEY` is declared in `src/env.ts` and read from
  `$app/env/private` in `src/lib/server/ai/client.ts`, so it never reaches the browser; blank
  counts as unset. `CardEditor.svelte` asks `fetchAiStatus()` once on mount and holds the answer
  as `aiAvailable`; until it answers, or if it fails, the editor behaves as without a key.
- **Only the note's own text leaves the machine.** That means the word, its fields, its meanings
  and the homographs' meanings. Images, audio and the rest of the deck stay local.
- **`request-guard.ts` already protects the credits.** Every route is a JSON POST, so a cross-site
  page can't trigger one.

## PR 1 — Check the note at review

The review step is `SaveBar.svelte`'s `reviewing` state. Today `submit()` sends a new note straight
to `add`, so this PR routes a new note through the review when `aiAvailable` is true, which
`CardEditor.svelte` passes down.

- `src/lib/server/ai/check.ts`: the prompt and the findings schema
  `{ findings: { field: FieldKey, problem, rewrite?: string }[] }`. A finding that names a field
  the note doesn't show is dropped.
- `POST /api/ai/check` takes the composed fields as text, using `ankiFieldHtmlToText` with no
  images and no audio, plus the part of speech and the picked candidate's meanings.
- The review step: a new note gets one when a key is set. It starts the check and shows findings
  under their fields, "No problems found" when there are none, or the error. The second ⌘↵ saves
  at any point and aborts a check still running.
- Tests: the prompt, the schema's dropping of unknown fields, the route through a fake
  `ClaudeMessages`, and the review showing findings and saving before the check returns. Plus a
  real response, captured once with the human's go-ahead, in `tests/fixtures/claude/` beside
  `suggest-sefer.json`.

## Verification

- Run `npm run lint && npm run check && npm test`, and `svelte-autofixer` on each Svelte file
  until it's clean. No test reaches the network: `ClaudeMessages` is faked in every test.
- By hand under `npm run dev` with a key, and only with the human's go-ahead: plant a
  wrong-gender example and a hint that names its answer, and check that the review flags both.
  Then save before the check answers, and the save still goes through.
- Remove the key (`ANTHROPIC_API_KEY=` on the command line overrides `.env`): a new note is added
  at the first ⌘↵, as before.
- The Anthropic Console's usage confirms the cost per call. Set a monthly spend limit there.
