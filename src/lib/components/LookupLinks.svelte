<script lang="ts">
import { INPUT_NAMES } from '#lib/card/inputs.ts';
import { toComparisonKey } from '#lib/hebrew/normalize.ts';
import { buildLinkUrl, LINKS } from '#lib/links.ts';
import LinkChip from './ui/LinkChip.svelte';

let {
  word,
  lemmaTitle,
  wiktionaryEntry,
}: {
  word: string;
  // The title of the dictionary entry picked, whose page the Wiktionary link opens instead.
  lemmaTitle: string | undefined;
  // Whether Wiktionary has a Hebrew entry for the word, from the index; `undefined` if unknown.
  wiktionaryEntry: Promise<boolean | undefined> | boolean | undefined;
} = $props();

// A link searched by a meaning sits on that meaning's own row instead.
const wordLinks = Object.entries(LINKS).filter(([, link]) => link.input === 'hebrew');

// Wiktionary's titles never carry niqqud.
const wiktionaryUrl = $derived(buildLinkUrl(LINKS.wiktionary, lemmaTitle ?? toComparisonKey(word)));
</script>

{#snippet wiktionaryChip(
  hasEntry: boolean | undefined,
)}
  <LinkChip
    label={LINKS.wiktionary.label}
    url={wiktionaryUrl}
    blankInput={INPUT_NAMES.word}
    note={hasEntry === false ? 'no entry' : undefined}
  />
{/snippet}

<nav aria-label="Look up" class="flex flex-wrap items-center gap-2">
  <span class="text-sm text-gray-600">Look up</span>
  {#each wordLinks as [id, link] (id)}
    {#if id === 'wiktionary'}
      {#await wiktionaryEntry}
        {@render wiktionaryChip(undefined)}
      {:then hasEntry}
        {@render wiktionaryChip(hasEntry)}
      {:catch}
        {@render wiktionaryChip(undefined)}
      {/await}
    {:else}
      <LinkChip label={link.label} url={buildLinkUrl(link, word)} blankInput={INPUT_NAMES.word} />
    {/if}
  {/each}
</nav>
