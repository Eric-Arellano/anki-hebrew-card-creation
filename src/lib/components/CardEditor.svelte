<script lang="ts">
import { onMount } from 'svelte';
import { ankiStatusProblem } from '#lib/anki/status.ts';
import { errorMessage, getJson, postJson } from '#lib/api-client.ts';
import {
  type CardInputs,
  completeInputs,
  composeSuggestions,
  type InputsDraft,
  missingInputs,
} from '#lib/compose.ts';
import { blankPlaceholders, buildLinkUrl, LINKS } from '#lib/links.ts';
import { FIELD_NAMES, type PartOfSpeech, shownFieldGroups } from '#lib/note-type.ts';
import type { AnkiStatus } from '#lib/server/deck.ts';
import ExistingNotesPanel from './ExistingNotesPanel.svelte';
import NoteFields from './NoteFields.svelte';
import StatusBanner from './StatusBanner.svelte';

const INPUT_NAMES: Record<keyof CardInputs, string> = {
  word: 'Hebrew word',
  pointed: 'niqqud',
  gloss: 'English meaning',
  partOfSpeech: 'part of speech',
};

const PARTS_OF_SPEECH: readonly { value: PartOfSpeech; label: string }[] = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'other', label: 'Other' },
];

type HandOff =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'opening' }
  | { kind: 'opened' }
  | { kind: 'failed'; message: string };

let draft: InputsDraft = $state({ word: '', pointed: '', gloss: '', partOfSpeech: undefined });
// `undefined` while the check is in flight.
let status: AnkiStatus | undefined = $state.raw();
let edits: Record<string, string> = $state({});
let handOff: HandOff = $state.raw({ kind: 'idle' });

// The card waits for every input, since each one shapes what composition suggests.
const inputs = $derived(completeInputs(draft));
const suggestions = $derived(inputs === undefined ? {} : composeSuggestions(inputs));
const fieldNames = $derived(
  status?.kind === 'connected' && status.noteType.found
    ? status.noteType.liveFieldNames
    : FIELD_NAMES,
);
const shownGroups = $derived(
  inputs === undefined ? [] : shownFieldGroups(fieldNames, inputs.partOfSpeech),
);
const shownFields = $derived(shownGroups.flatMap((group) => group.fieldNames));
// A hidden field gets only what composition gives it, so an edit made under another part of
// speech, such as a binyan typed before switching to noun, never reaches Anki.
const fieldValues = $derived(
  Object.fromEntries(
    fieldNames.map((name) => [
      name,
      (shownFields.includes(name) ? edits[name] : undefined) ?? suggestions[name] ?? '',
    ]),
  ),
);
const ankiProblem = $derived(status && ankiStatusProblem(status));
const missingInputsMessage = $derived.by(() => {
  const missing = missingInputs(draft);
  if (missing.length === 0) return undefined;
  return `Still needed: ${missing.map((key) => INPUT_NAMES[key]).join(', ')}`;
});
const handOffBlocker = $derived.by(() => {
  if (status === undefined) return 'Checking Anki…';
  return ankiProblem ?? missingInputsMessage;
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

// `guiAddCards` replaces Anki's Add window and discards whatever I typed there, so every
// hand-off asks first.
function askToHandOff() {
  if (handOffBlocker === undefined) handOff = { kind: 'confirming' };
}

async function handOffToAnki() {
  handOff = { kind: 'opening' };
  try {
    await postJson('/api/anki/add', { fields: fieldValues });
    handOff = { kind: 'opened' };
  } catch (error) {
    handOff = { kind: 'failed', message: errorMessage(error) };
  }
}

function onkeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
  event.preventDefault();
  askToHandOff();
}

function focus(element: HTMLElement) {
  element.focus();
}
</script>

<svelte:window {onkeydown} />

<main class="mx-auto max-w-240 space-y-8 p-4">
  <header class="flex flex-wrap items-center justify-between gap-4">
    <h1>Hebrew card helper</h1>
    <StatusBanner {status} problem={ankiProblem} onrecheck={checkAnki} />
  </header>

  <section aria-labelledby="word-heading" class="space-y-4">
    <h2 id="word-heading">Word</h2>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-4">
      <label class="grid gap-1">
        <span class="required-mark">Hebrew word, without niqqud</span>
        <input
          class="text-2xl"
          lang="he"
          dir="rtl"
          placeholder="כלב"
          required
          bind:value={draft.word}
        >
      </label>
      <label class="grid gap-1">
        <span class="required-mark">Hebrew word, with niqqud</span>
        <input
          class="text-2xl"
          lang="he"
          dir="rtl"
          placeholder="כֶּלֶב"
          required
          bind:value={draft.pointed}
        >
      </label>
      <label class="grid gap-1">
        <span class="required-mark">English meaning</span>
        <input class="text-2xl" lang="en" placeholder="dog" required bind:value={draft.gloss}>
      </label>
    </div>

    <ExistingNotesPanel word={draft.word} />

    <fieldset class="flex flex-wrap items-center gap-2">
      <legend class="required-mark mb-1">Part of speech</legend>
      {#each PARTS_OF_SPEECH as { value, label } (value)}
        <label
          class="chip cursor-pointer has-checked:border-blue-700 has-checked:bg-blue-700 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-blue-600/30"
        >
          <input
            type="radio"
            class="sr-only"
            name="part-of-speech"
            {value}
            required
            bind:group={draft.partOfSpeech}
          >
          {label}
        </label>
      {/each}
    </fieldset>

    <nav aria-label="Look up" class="flex flex-wrap items-center gap-2">
      <span class="text-sm text-gray-600">Look up</span>
      {#each LINKS as link (link.id)}
        {@const url = buildLinkUrl(link.template, draft)}
        {#if url === undefined}
          {@const blankInputs = blankPlaceholders(link.template, draft).map(
            (name) => INPUT_NAMES[name],
          )}
          <span
            class="chip cursor-not-allowed text-gray-400"
            title="Type the {blankInputs.join(' and ')} first"
          >
            {link.label}
          </span>
        {:else}
          <a class="chip hover:bg-gray-50" href={url} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        {/if}
      {/each}
    </nav>
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
        onedit={(fieldName, value) => {
          edits[fieldName] = value;
        }}
        onreset={(fieldName) => {
          delete edits[fieldName];
        }}
      />
    {/if}
  </section>

  <section
    aria-label="Hand-off"
    class="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white py-4"
  >
    {#if handOff.kind === 'confirming'}
      <p role="alert" class="basis-full">
        This replaces whatever is in Anki's Add window, including anything typed there.
      </p>
      <button type="button" class="button-primary" {@attach focus} onclick={handOffToAnki}>
        Replace and open
      </button>
      <button type="button" onclick={() => (handOff = { kind: 'idle' })}>Cancel</button>
    {:else}
      <button
        type="button"
        class="button-primary"
        disabled={handOffBlocker !== undefined || handOff.kind === 'opening'}
        title={handOffBlocker}
        onclick={askToHandOff}
      >
        Open in Anki
      </button>
      <kbd>⌘↵</kbd>
      {#if handOff.kind === 'opened'}
        <p>Opened in Anki. Finish the note there and click Add.</p>
      {:else if handOff.kind === 'failed'}
        <p role="alert" class="text-red-700">{handOff.message}</p>
      {:else if missingInputsMessage !== undefined}
        <!-- An Anki problem already has the banner, so only the inputs are spelled out here. -->
        <p class="text-gray-600">{missingInputsMessage}</p>
      {/if}
    {/if}
  </section>
</main>
