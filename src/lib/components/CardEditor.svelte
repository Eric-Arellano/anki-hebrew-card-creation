<script lang="ts">
import { onMount } from 'svelte';
import { textareaToAnkiFieldHtml } from '#lib/anki/html.ts';
import { ankiStatusProblem } from '#lib/anki/status.ts';
import { errorMessage, getJson } from '#lib/api-client.ts';
import { composeFields } from '#lib/card/compose.ts';
import {
  type CardInputsDraft,
  completeInputs,
  emptyDraft,
  INPUT_NAMES,
  missingInputs,
} from '#lib/card/inputs.ts';
import {
  FIELD_NAMES,
  type FieldValues,
  PARTS_OF_SPEECH,
  type PartOfSpeech,
  shownFieldGroups,
  toAnkiFields,
} from '#lib/note-type.ts';
import type { AnkiStatus } from '#lib/server/deck.ts';
import ConnectionStatus from './ConnectionStatus.svelte';
import DefinitionsInput from './DefinitionsInput.svelte';
import ExistingNotesPanel from './ExistingNotesPanel.svelte';
import HandOffBar from './HandOffBar.svelte';
import LookupLinks from './LookupLinks.svelte';
import NoteFields from './NoteFields.svelte';
import NounInputs from './NounInputs.svelte';
import ChoiceChips from './ui/ChoiceChips.svelte';
import TextInput from './ui/TextInput.svelte';

const PART_OF_SPEECH_LABELS = {
  noun: 'Noun',
  verb: 'Verb',
  other: 'Other',
} satisfies Record<PartOfSpeech, string>;

const partOfSpeechOptions = PARTS_OF_SPEECH.map((value) => ({
  value,
  label: PART_OF_SPEECH_LABELS[value],
}));

let draft: CardInputsDraft = $state(emptyDraft());
// `undefined` while the check is in flight.
let status: AnkiStatus | undefined = $state.raw();
let edits: FieldValues = $state({});

// Composition waits for every input, since each one shapes it. The fields shown depend only on
// the part of speech.
const inputs = $derived(completeInputs(draft));
const composed = $derived(inputs === undefined ? {} : composeFields(inputs));
const shownGroups = $derived.by(() => {
  if (draft.partOfSpeech === undefined) return [];
  const liveFieldNames =
    status?.kind === 'connected' && status.noteType.found
      ? status.noteType.liveFieldNames
      : FIELD_NAMES;
  return shownFieldGroups(liveFieldNames, draft.partOfSpeech);
});
// A hidden field gets only what composition gives it, so an edit made under another part of speech, such as
// a binyan typed before switching to noun, never reaches Anki.
const ankiFields = $derived.by(() => {
  const shown = new Set(shownGroups.flatMap((group) => group.fields));
  return toAnkiFields((field) => {
    const edit = shown.has(field) ? edits[field] : undefined;
    return edit === undefined ? composed[field] : textareaToAnkiFieldHtml(edit);
  });
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

  <!-- The word and its meanings come first, because they are all the lookups need, and the
       lookups are where the niqqud, gender and forms below come from. -->
  <section aria-label="Word" class="space-y-4">
    <div class="grid items-start gap-4 sm:grid-cols-2">
      <TextInput label="Hebrew word, without niqqud" lang="he" bind:value={draft.word} />
      <DefinitionsInput word={draft.word} bind:definitions={draft.definitions} />
    </div>
    <ExistingNotesPanel word={draft.word} />
    <LookupLinks word={draft.word} />
  </section>

  <section aria-label="Word forms" class="space-y-4 border-t border-gray-200 pt-8">
    <ChoiceChips
      legend="Part of speech"
      name="part-of-speech"
      options={partOfSpeechOptions}
      bind:value={draft.partOfSpeech}
    />
    {#snippet pointedInput()}
      <TextInput label="Hebrew word, with niqqud" lang="he" bind:value={draft.pointed} />
    {/snippet}
    {#if draft.partOfSpeech === 'noun'}
      <NounInputs bind:noun={draft.noun}> {@render pointedInput()} </NounInputs>
    {:else}
      <div class="forms-row">{@render pointedInput()}</div>
    {/if}
  </section>

  <NoteFields
    groups={shownGroups}
    {edits}
    onedit={(field, value) => {
      edits[field] = value;
    }}
  />

  <HandOffBar
    fields={ankiFields}
    ankiBlocker={status === undefined ? 'Checking Anki…' : ankiProblem}
    inputsBlocker={missingInputsMessage}
  />
</main>
