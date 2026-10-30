<script lang="ts">
import { onMount } from 'svelte';
import { ankiStatusProblem, fieldOrder } from '#lib/anki/status.ts';
import {
  type AnkiStatus,
  type DictionaryCandidate,
  errorMessage,
  fetchAnkiStatus,
  lookUpWord,
} from '#lib/api.ts';
import { composeFields } from '#lib/card/compose.ts';
import { handOffFields } from '#lib/card/hand-off.ts';
import {
  type CardInputsDraft,
  completeInputs,
  emptyDraft,
  INPUT_NAMES,
  missingInputs,
} from '#lib/card/inputs.ts';
import { pluralHints } from '#lib/card/noun.ts';
import { type PrefillChoices, prefillDraft } from '#lib/card/prefill.ts';
import {
  type FieldKey,
  type FieldValues,
  PARTS_OF_SPEECH,
  type PartOfSpeech,
  shownFieldGroups,
} from '#lib/note-type.ts';
import { afterTypingPauses } from '#lib/typing-pause.ts';
import ConnectionStatus from './ConnectionStatus.svelte';
import DefinitionsInput from './DefinitionsInput.svelte';
import DictionaryPanel from './DictionaryPanel.svelte';
import ExistingNotesPanel from './ExistingNotesPanel.svelte';
import HandOffBar from './HandOffBar.svelte';
import LookupLinks from './LookupLinks.svelte';
import NoteFields from './NoteFields.svelte';
import NounInputs from './NounInputs.svelte';
import PluralHints from './PluralHints.svelte';
import ChoiceChips from './ui/ChoiceChips.svelte';
import TextInput from './ui/TextInput.svelte';
import VerbInputs from './VerbInputs.svelte';

const PART_OF_SPEECH_LABELS = {
  noun: 'Noun',
  verb: 'Verb',
  other: 'Other',
} satisfies Record<PartOfSpeech, string>;

const partOfSpeechOptions = PARTS_OF_SPEECH.map((value) => ({
  value,
  label: PART_OF_SPEECH_LABELS[value],
}));

const VARIANT_ANSWERS = [
  { field: 'variant1Answer', number: 1 },
  { field: 'variant2Answer', number: 2 },
] as const satisfies readonly { field: FieldKey; number: number }[];

let draft: CardInputsDraft = $state(emptyDraft());
// The dictionary entry the inputs were last filled from, until the human types another word.
let picked: { candidate: DictionaryCandidate; choices: PrefillChoices } | undefined = $state.raw();
// `undefined` while the check is in flight.
let status: AnkiStatus | undefined = $state.raw();
let edits: FieldValues = $state({});

// Composition waits for every input, since each one shapes it. The fields shown depend only on
// the part of speech.
const inputs = $derived(completeInputs(draft));
const composed = $derived(inputs === undefined ? {} : composeFields(inputs));
const shownGroups = $derived(
  draft.partOfSpeech === undefined ? [] : shownFieldGroups(fieldOrder(status), draft.partOfSpeech),
);
const shownFields = $derived(shownGroups.flatMap((group) => group.fields));
const ankiFields = $derived(handOffFields({ composed, edits, shownFields }));
const ankiProblem = $derived(status && ankiStatusProblem(status));
const missingInputsMessage = $derived.by(() => {
  const missing = missingInputs(draft);
  if (missing.length === 0) return undefined;
  return `Still needed: ${missing.map((key) => INPUT_NAMES[key]).join(', ')}`;
});

// Once an entry is picked, the word it filled in isn't looked up again.
const lookupWord = $derived(picked === undefined ? draft.word.trim() : '');
// `{#await}` shows only the latest promise, so an older lookup's reply never lands.
const lookup = $derived(
  lookupWord === ''
    ? undefined
    : afterTypingPauses(
        lookupWord,
        () => lookupWord,
        () => lookUpWord(lookupWord),
      ),
);
const wiktionaryEntry = $derived(
  picked !== undefined ? true : lookup?.then((result) => result?.titleHasEntry),
);
const choices = $derived(picked?.choices ?? {});

const hints = $derived(draft.partOfSpeech === 'noun' ? pluralHints(draft.noun, draft.pointed) : []);
const variantSlots = $derived(
  VARIANT_ANSWERS.filter(({ field }) => shownFields.includes(field)).map((variant) => ({
    ...variant,
    answer: edits[variant.field] ?? '',
  })),
);

function pick(candidate: DictionaryCandidate) {
  const prefill = prefillDraft($state.snapshot(draft), candidate);
  draft = prefill.draft;
  picked = { candidate, choices: prefill.choices };
}

// An infinitive is chosen as a pair, so choosing its pointed spelling writes its unpointed one.
function chooseInfinitive(pointed: string) {
  const infinitive = picked?.choices.infinitives?.find((choice) => choice.pointed === pointed);
  draft.word = infinitive?.unpointed ?? '';
}

async function checkAnki() {
  status = undefined;
  try {
    status = await fetchAnkiStatus();
  } catch (error) {
    status = { kind: 'error', message: errorMessage(error) };
  }
}

onMount(checkAnki);
</script>

<main class="mx-auto max-w-240 space-y-8 p-4">
  <header class="flex flex-wrap items-center justify-between gap-4">
    <h1>Hebrew card helper</h1>
    <ConnectionStatus {status} problem={ankiProblem} onrecheck={checkAnki} />
  </header>

  <!-- The word and its meanings come first, because they are all the lookups need, and the
       lookups are where the niqqud, gender and forms below come from. -->
  <section aria-label="Word" class="space-y-4">
    <div class="grid items-start gap-4 sm:grid-cols-2">
      <TextInput
        label="Hebrew word, without niqqud"
        lang="he"
        bind:value={draft.word}
        oninput={() => (picked = undefined)}
      />
      <DefinitionsInput bind:definitions={draft.definitions} />
    </div>
    <DictionaryPanel
      {lookup}
      picked={picked?.candidate}
      onpick={pick}
      onunpick={() => (picked = undefined)}
    />
    <ExistingNotesPanel words={[draft.word, ...(picked ? [picked.candidate.title] : [])]} />
    <LookupLinks word={draft.word} lemmaTitle={picked?.candidate.title} {wiktionaryEntry} />
  </section>

  <section aria-label="Word forms" class="space-y-4 border-t border-gray-200 pt-8">
    <ChoiceChips
      legend="Part of speech"
      name="part-of-speech"
      options={partOfSpeechOptions}
      bind:value={draft.partOfSpeech}
    />
    {#snippet pointedInput()}
      <TextInput
        label="Hebrew word, with niqqud"
        lang="he"
        choices={choices.infinitives?.map((infinitive) => infinitive.pointed)}
        onchoose={chooseInfinitive}
        bind:value={draft.pointed}
      />
    {/snippet}
    {#if draft.partOfSpeech === 'noun'}
      <NounInputs bind:noun={draft.noun} {choices}> {@render pointedInput()} </NounInputs>
      <PluralHints
        {hints}
        variants={variantSlots}
        onuse={(field, answer) => {
          edits[field] = answer;
        }}
      />
    {:else if draft.partOfSpeech === 'verb'}
      <VerbInputs
        bind:verb={draft.verb}
        {choices}
        suggestedPrepositions={picked?.candidate.partOfSpeech === 'verb'
          ? picked.candidate.verb.prepositions
          : []}
      >
        {@render pointedInput()}
      </VerbInputs>
    {:else}
      <div class="forms-row">{@render pointedInput()}</div>
    {/if}
  </section>

  {#if draft.partOfSpeech !== undefined}
    <NoteFields
      groups={shownGroups}
      partOfSpeech={draft.partOfSpeech}
      {edits}
      onedit={(field, value) => {
        edits[field] = value;
      }}
    />
  {/if}

  <HandOffBar
    fields={ankiFields}
    ankiBlocker={status === undefined ? 'Checking Anki…' : ankiProblem}
    inputsBlocker={missingInputsMessage}
  />
</main>
