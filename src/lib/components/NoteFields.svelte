<script lang="ts">
import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import { fieldDisplay, GROUP_HELP } from '#lib/field-help.ts';
import { buildLinkUrl, LINKS } from '#lib/links.ts';
import type { FieldKey, FieldValues, PartOfSpeech, ShownFieldGroup } from '#lib/note-type.ts';
import LinkChip from './ui/LinkChip.svelte';
import QuotedText from './ui/QuotedText.svelte';

// The meanings' own image search, here searched with a variant's English prompt.
const imagesLink = LINKS['images-en'];

let {
  groups,
  partOfSpeech,
  edits,
  onedit,
}: {
  groups: ShownFieldGroup[];
  partOfSpeech: PartOfSpeech;
  edits: FieldValues;
  onedit: (field: FieldKey, value: string) => void;
} = $props();
</script>

{#each groups as { group, fields } (group)}
  {@const groupHelp = GROUP_HELP[group]}
  <div class="grid gap-x-6 gap-y-2 border-t border-gray-100 pt-4 md:grid-cols-[10rem_1fr]">
    <h3 class="text-gray-600">{group}</h3>
    <!-- Two columns pair a variant's prompt with its answer. Each field spans three rows of this
         grid, for its label, help and textarea, so help of different lengths still lines up a
         pair's textareas. -->
    <div class="grid gap-x-4 gap-y-1 sm:grid-cols-2">
      {#if groupHelp !== undefined}
        <p class="hint mb-3 sm:col-span-2">{groupHelp}</p>
      {/if}
      {#each fields as field (field)}
        {@const { label, help, searchesImages } = fieldDisplay(field, partOfSpeech)}
        <div class="mb-3 grid gap-1 sm:row-span-3 sm:grid-rows-subgrid">
          <div class="flex items-end justify-between gap-2">
            <label for="field-{field}">{label}</label>
            {#if searchesImages}
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
          <!-- `dir="auto"`: some fields hold Hebrew and some English. The value is Anki HTML, except
               that a new line becomes `<br>` at the hand-off. -->
          <textarea
            id="field-{field}"
            dir="auto"
            rows="2"
            class="font-hebrew text-xl sm:row-start-3"
            aria-describedby={help && `help-${field}`}
            value={edits[field] ?? ''}
            oninput={(event) => onedit(field, event.currentTarget.value)}
          ></textarea>
        </div>
      {/each}
    </div>
  </div>
{/each}
