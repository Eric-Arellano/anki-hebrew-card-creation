<script lang="ts">
import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import type { Suggestions } from '#lib/api/ai.ts';
import type { SameMeaningNote } from '#lib/api/anki.ts';
import type { Example } from '#lib/card/examples.ts';
import { fieldDisplay } from '#lib/field-help.ts';
import { buildLinkUrl, LINKS } from '#lib/links.ts';
import type { Attachment } from '#lib/media/attach.ts';
import {
  type FieldKey,
  type FieldValues,
  isVariantPrompt,
  type PartOfSpeech,
  VARIANT_ANSWERS,
  type VariantPrompt,
} from '#lib/note-type.ts';
import ImagesInput from '../media/ImagesInput.svelte';
import LinkChip from '../ui/LinkChip.svelte';
import QuotedText from '../ui/QuotedText.svelte';
import ExamplesInput from './ExamplesInput.svelte';
import SameMeaningNotes from './SameMeaningNotes.svelte';

// The meanings' own image search, here searched with a variant's English prompt.
const imagesLink = LINKS['images-en'];

let {
  fields,
  partOfSpeech,
  edits,
  examples = $bindable(),
  word,
  examplesWithoutWord,
  sameMeaningSearch,
  suggested,
  onedit,
  promptImages = $bindable(),
}: {
  // One group's.
  fields: readonly FieldKey[];
  partOfSpeech: PartOfSpeech;
  edits: FieldValues;
  examples: Example[];
  // The word without niqqud, which the examples should use.
  word: string;
  examplesWithoutWord: number[];
  // The deck's other words for this English, which the Production context tells apart.
  sameMeaningSearch: Promise<SameMeaningNote[] | undefined> | undefined;
  // What Claude last wrote into each field it suggested.
  suggested: Suggestions;
  onedit: (field: FieldKey, value: string) => void;
  promptImages: Record<VariantPrompt, Attachment[]>;
} = $props();

// Until the human edits what Claude wrote, so it's clear what hasn't been read yet.
function isUnreadSuggestion(field: FieldKey) {
  switch (field) {
    case 'examples':
      return (
        suggested.examples !== undefined &&
        JSON.stringify(suggested.examples) === JSON.stringify(examples)
      );
    case 'productionContext':
    case 'readingContext':
      return suggested[field] !== undefined && suggested[field] === edits[field];
    default:
      return false;
  }
}

function lacksAnswer(prompt: VariantPrompt) {
  return (edits[VARIANT_ANSWERS[prompt]] ?? '').trim() === '';
}
</script>

<!-- Two columns pair a variant's prompt with its answer. Each field spans three rows of this grid,
     for its label, help and textarea, with a prompt's images under the textarea, so help of
     different lengths still lines up a pair's textareas. -->
<div class="grid gap-x-4 gap-y-1 sm:grid-cols-2">
  {#each fields as field (field)}
    {@const { label, help } = fieldDisplay(field, partOfSpeech)}
    {@const prompt = isVariantPrompt(field) ? field : undefined}
    {@const unread = isUnreadSuggestion(field)}
    {@const describedBy =
      [help && `help-${field}`, unread && `suggested-${field}`].filter(Boolean).join(' ') ||
      undefined}
    <!-- A paste or drop in a variant prompt's block goes to that prompt's images. A block takes
         focus on a click anywhere in it, so a click is enough to aim a paste: at this prompt,
         or for any other field, at Images. -->
    <div
      class={[
        'mb-3 grid gap-1 outline-none sm:row-span-3 sm:grid-rows-subgrid',
        field === 'examples' && 'sm:col-span-2',
      ]}
      data-image-field={prompt}
      tabindex="-1"
    >
      <div class="flex items-end justify-between gap-2">
        <span class="flex items-center gap-2">
          {#if field === 'examples'}
            <span id="label-{field}">{label}</span>
          {:else}
            <label for="field-{field}">{label}</label>
          {/if}
          {#if unread}
            <span
              id="suggested-{field}"
              class="chip border-violet-300 bg-violet-50 text-xs text-violet-800"
              title="Claude wrote this. Read it over, and edit what's wrong."
            >
              Suggested
            </span>
          {/if}
        </span>
        {#if prompt !== undefined}
          <LinkChip
            label={imagesLink.label}
            url={buildLinkUrl(imagesLink, ankiFieldHtmlToText(edits[field] ?? ''))}
            blankInput="prompt"
          />
        {/if}
      </div>
      {#if help !== undefined}
        <p id="help-{field}" class="hint"><QuotedText text={help} /></p>
      {/if}
      <div class="space-y-2 sm:row-start-3">
        {#if field === 'examples'}
          <ExamplesInput
            bind:examples
            labelledBy="label-{field}"
            {describedBy}
            {word}
            withoutWord={examplesWithoutWord}
          />
        {:else}
          <!-- `dir="auto"`: some fields hold Hebrew and some English. The value is Anki HTML,
               except that a new line becomes `<br>` on save. -->
          <textarea
            id="field-{field}"
            dir="auto"
            rows="2"
            class="w-full font-hebrew text-xl"
            aria-describedby={describedBy}
            value={edits[field] ?? ''}
            oninput={(event) => onedit(field, event.currentTarget.value)}
          ></textarea>
        {/if}
        {#if prompt !== undefined}
          <ImagesInput label="Images for {label}" {prompt} bind:images={promptImages[prompt]} />
          {#if promptImages[prompt].length > 0 && lacksAnswer(prompt)}
            <p class="hint text-amber-700">
              No card shows these images until this variant has a Hebrew answer.
            </p>
          {/if}
        {/if}
        {#if field === 'productionContext'}
          <SameMeaningNotes
            search={sameMeaningSearch}
            hintBlank={(edits.productionContext ?? '').trim() === ''}
          />
        {/if}
      </div>
    </div>
  {/each}
</div>
