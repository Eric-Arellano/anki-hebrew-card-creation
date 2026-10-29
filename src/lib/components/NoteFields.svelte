<script lang="ts">
import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import { buildLinkUrl, LINKS } from '#lib/links.ts';
import {
  type FieldKey,
  type FieldValues,
  fieldDisplay,
  GROUP_HELP,
  quotedParts,
  type ShownFieldGroup,
} from '#lib/note-type.ts';
import LinkChip from './ui/LinkChip.svelte';

// The meanings' own image search, here searched with a variant's English prompt.
const imagesLink = LINKS.find((link) => link.id === 'images-en');

let {
  groups,
  edits,
  onedit,
}: {
  groups: ShownFieldGroup[];
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
        {@const { label, help, searchesImages } = fieldDisplay(field)}
        <div class="mb-3 grid gap-1 sm:row-span-3 sm:grid-rows-subgrid">
          <div class="flex items-end justify-between gap-2">
            <label for="field-{field}">{label}</label>
            {#if searchesImages && imagesLink !== undefined}
              <LinkChip
                label={imagesLink.label}
                url={buildLinkUrl(imagesLink, {
                  word: '',
                  gloss: ankiFieldHtmlToText(edits[field] ?? ''),
                })}
                blankInput="prompt"
              />
            {/if}
          </div>
          {#if help !== undefined}
            <!-- An example stays on one line, and `<bdi>` keeps a Hebrew one from reordering the
                 English around it. `ltr`, as Anki shows these fields, so “כרטיס רכבת (train
                 ticket)” keeps its English on the right. -->
            <p id="help-{field}" class="hint">
              {#each quotedParts(help) as part, index (index)}
                {#if part.quoted}
                  <span class="whitespace-nowrap">“<bdi dir="ltr">{part.text}</bdi>”</span>
                {:else}
                  {part.text}
                {/if}
              {/each}
            </p>
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
