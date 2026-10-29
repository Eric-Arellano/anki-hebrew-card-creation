<script lang="ts">
import { INPUT_NAMES } from '#lib/card/inputs.ts';
import { buildLinkUrl, LINKS } from '#lib/links.ts';
import LinkChip from './ui/LinkChip.svelte';

let { word }: { word: string } = $props();

// A link searched by a meaning sits on that meaning's own row instead.
const wordLinks = Object.entries(LINKS).filter(([, link]) => link.input === 'hebrew');
</script>

<nav aria-label="Look up" class="flex flex-wrap items-center gap-2">
  <span class="text-sm text-gray-600">Look up</span>
  {#each wordLinks as [id, link] (id)}
    <LinkChip label={link.label} url={buildLinkUrl(link, word)} blankInput={INPUT_NAMES.word} />
  {/each}
</nav>
