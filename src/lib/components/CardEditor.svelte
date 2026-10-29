<script lang="ts">
import { onMount } from 'svelte';
import { ankiStatusProblem } from '#lib/anki/status.ts';
import { errorMessage, getJson } from '#lib/api-client.ts';
import {
  type CardInputsDraft,
  completeInputs,
  INPUT_NAMES,
  missingInputs,
} from '#lib/card-inputs.ts';
import {
  FIELD_NAMES,
  type FieldValues,
  type PartOfSpeech,
  shownFieldGroups,
  toAnkiFields,
} from '#lib/note-type.ts';
import type { AnkiStatus } from '#lib/server/deck.ts';
import { suggestFields } from '#lib/suggest-fields.ts';
import ConnectionStatus from './ConnectionStatus.svelte';
import ExistingNotesPanel from './ExistingNotesPanel.svelte';
import HandOffBar from './HandOffBar.svelte';
import LookupLinks from './LookupLinks.svelte';
import NoteFields from './NoteFields.svelte';
import ChoiceChips from './ui/ChoiceChips.svelte';
import TextInput from './ui/TextInput.svelte';

const PARTS_OF_SPEECH: readonly { value: PartOfSpeech; label: string }[] = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'other', label: 'Other' },
];

let draft: CardInputsDraft = $state({ word: '', pointed: '', gloss: '', partOfSpeech: undefined });
// `undefined` while the check is in flight.
let status: AnkiStatus | undefined = $state.raw();
let edits: FieldValues = $state({});

// The card waits for every input, since each one shapes what is suggested.
const inputs = $derived(completeInputs(draft));
const suggestions = $derived(inputs === undefined ? {} : suggestFields(inputs));
const shownGroups = $derived.by(() => {
  if (inputs === undefined) return [];
  const liveFieldNames =
    status?.kind === 'connected' && status.noteType.found
      ? status.noteType.liveFieldNames
      : FIELD_NAMES;
  return shownFieldGroups(liveFieldNames, inputs.partOfSpeech);
});
// A hidden field gets only its suggestion, so an edit made under another part of speech, such as
// a binyan typed before switching to noun, never reaches Anki.
const ankiFields = $derived.by(() => {
  const shown = new Set(shownGroups.flatMap((group) => group.fields));
  return toAnkiFields(
    (field) => (shown.has(field) ? edits[field] : undefined) ?? suggestions[field],
  );
});
const ankiProblem = $derived(status && ankiStatusProblem(status));
const missingInputsMessage = $derived.by(() => {
  const missing = missingInputs(draft);
  if (missing.length === 0) return undefined;
  return `Still needed: ${missing.map((key) => INPUT_NAMES[key]).join(', ')}`;
});

async function checkAnki() {
  status = undefined;
  try {
    status = await getJson<AnkiStatus>('/api/anki/status');
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

  <section aria-labelledby="word-heading" class="space-y-4">
    <h2 id="word-heading">Word</h2>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-4">
      <TextInput
        label="Hebrew word, without niqqud"
        lang="he"
        placeholder="כלב"
        bind:value={draft.word}
      />
      <TextInput
        label="Hebrew word, with niqqud"
        lang="he"
        placeholder="כֶּלֶב"
        bind:value={draft.pointed}
      />
      <TextInput label="English meaning" lang="en" placeholder="dog" bind:value={draft.gloss} />
    </div>
    <ExistingNotesPanel word={draft.word} />
    <ChoiceChips
      legend="Part of speech"
      name="part-of-speech"
      options={PARTS_OF_SPEECH}
      bind:value={draft.partOfSpeech}
    />
    <LookupLinks values={draft} />
  </section>

  <section aria-labelledby="card-heading" class="space-y-4">
    <h2 id="card-heading">Card</h2>
    {#if inputs === undefined}
      <p class="text-gray-600">Fill in the word above to build the card.</p>
    {:else}
      <NoteFields
        groups={shownGroups}
        {suggestions}
        {edits}
        onedit={(field, value) => {
          edits[field] = value;
        }}
        onreset={(field) => {
          delete edits[field];
        }}
      />
    {/if}
  </section>

  <HandOffBar
    fields={ankiFields}
    ankiBlocker={status === undefined ? 'Checking Anki…' : ankiProblem}
    inputsBlocker={missingInputsMessage}
  />
</main>
