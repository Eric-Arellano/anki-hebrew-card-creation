<script lang="ts">
import { buildLinkUrl, LINKS } from '#lib/links.ts';
import LinkChip from './ui/LinkChip.svelte';

let { definitions = $bindable() }: { definitions: string[] } = $props();

// A card usually has one image per meaning, so each meaning gets its own search.
const meaningLinks = Object.entries(LINKS).filter(([, link]) => link.input === 'english');
</script>

<!-- `grid-cols-1` lets a row shrink below its inputs' intrinsic width, which overflows a phone. -->
<fieldset class="grid grid-cols-1 content-start gap-2">
  <legend class="required-mark mb-1">English meaning</legend>
  {#each definitions, index}
    <div class="flex items-center gap-2">
      <input
        class="flex-1 text-2xl"
        lang="en"
        aria-label={index === 0 ? 'English meaning' : `English meaning ${index + 1}`}
        required={index === 0}
        bind:value={definitions[index]}
      >
      {#each meaningLinks as [id, link] (id)}
        <LinkChip
          label={link.label}
          url={buildLinkUrl(link, definitions[index] ?? '')}
          blankInput="meaning"
        />
      {/each}
      {#if index > 0}
        <button
          type="button"
          class="w-8 shrink-0 px-0"
          aria-label="Remove English meaning {index + 1}"
          onclick={() => (definitions = definitions.toSpliced(index, 1))}
        >
          ×
        </button>
      {:else}
        <!-- Holds the remove button's place, so the first row's input lines up with the rest. -->
        <span class="w-8 shrink-0"></span>
      {/if}
    </div>
  {/each}
  <button
    type="button"
    class="justify-self-start text-sm"
    onclick={() => (definitions = [...definitions, ''])}
  >
    + Another meaning
  </button>
</fieldset>
