<script lang="ts">
import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import type { SameMeaningNote } from '#lib/api/anki.ts';
import { fieldDisplay, GROUP_HELP } from '#lib/field-help.ts';
import { buildLinkUrl, LINKS } from '#lib/links.ts';
import type { Attachment } from '#lib/media/attach.ts';
import {
  type FieldKey,
  type FieldValues,
  isVariantPrompt,
  type PartOfSpeech,
  type ShownFieldGroup,
  VARIANT_ANSWERS,
  type VariantPrompt,
} from '#lib/note-type.ts';
import ImagesInput from '../media/ImagesInput.svelte';
import LinkChip from '../ui/LinkChip.svelte';
import QuotedText from '../ui/QuotedText.svelte';
import SameMeaningNotes from './SameMeaningNotes.svelte';

// The meanings' own image search, here searched with a variant's English prompt.
const imagesLink = LINKS['images-en'];

let {
  groups,
  partOfSpeech,
  edits,
  word,
  examplesWithoutWord,
  sameMeaningSearch,
  onedit,
  promptImages = $bindable(),
}: {
  groups: ShownFieldGroup[];
  partOfSpeech: PartOfSpeech;
  edits: FieldValues;
  // The word without niqqud, which the examples should use.
  word: string;
  examplesWithoutWord: string[];
  // The deck's other words for this English, which the Production context tells apart.
  sameMeaningSearch: Promise<SameMeaningNote[] | undefined> | undefined;
  onedit: (field: FieldKey, value: string) => void;
  promptImages: Record<VariantPrompt, Attachment[]>;
} = $props();

function lacksAnswer(prompt: VariantPrompt) {
  return (edits[VARIANT_ANSWERS[prompt]] ?? '').trim() === '';
}
</script>

{#each groups as { group, fields } (group)}
  {@const groupHelp = GROUP_HELP[group]}
  <div class="grid gap-x-6 gap-y-2 border-t border-gray-100 pt-4 md:grid-cols-[10rem_1fr]">
    <h3 class="text-gray-600">{group}</h3>
    <!-- Two columns pair a variant's prompt with its answer. Each field spans three rows of this
         grid, for its label, help and textarea, with a prompt's images under the textarea, so
         help of different lengths still lines up a pair's textareas. -->
    <div class="grid gap-x-4 gap-y-1 sm:grid-cols-2">
      {#if groupHelp !== undefined}
        <p class="hint mb-3 sm:col-span-2">{groupHelp}</p>
      {/if}
      {#each fields as field (field)}
        {@const { label, help } = fieldDisplay(field, partOfSpeech)}
        {@const prompt = isVariantPrompt(field) ? field : undefined}
        <!-- A paste or drop in a variant prompt's block goes to that prompt's images. A block takes
             focus on a click anywhere in it, so a click is enough to aim a paste: at this prompt,
             or for any other field, at Images. -->
        <div
          class="mb-3 grid gap-1 outline-none sm:row-span-3 sm:grid-rows-subgrid"
          data-image-field={prompt}
          tabindex="-1"
        >
          <div class="flex items-end justify-between gap-2">
            <label for="field-{field}">{label}</label>
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
            <!-- `dir="auto"`: some fields hold Hebrew and some English. The value is Anki HTML,
                 except that a new line becomes `<br>` on save. -->
            <textarea
              id="field-{field}"
              dir="auto"
              rows="2"
              class="w-full font-hebrew text-xl"
              aria-describedby={help && `help-${field}`}
              value={edits[field] ?? ''}
              oninput={(event) => onedit(field, event.currentTarget.value)}
            ></textarea>
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
            {#if field === 'examples' && examplesWithoutWord.length > 0}
              <div class="hint text-amber-700" aria-live="polite">
                <p>No form of <bdi lang="he">{word}</bdi> in:</p>
                <ul class="list-disc ps-5">
                  {#each examplesWithoutWord as example, index (index)}
                    <li><bdi class="font-hebrew text-base">{example}</bdi></li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/each}
