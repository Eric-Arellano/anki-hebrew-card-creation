<script lang="ts">
import { INPUT_NAMES } from '#lib/card-inputs.ts';
import { buildLinkUrl, LINKS, type LinkValues } from '#lib/links.ts';

let { values }: { values: LinkValues } = $props();
</script>

<nav aria-label="Look up" class="flex flex-wrap items-center gap-2">
  <span class="text-sm text-gray-600">Look up</span>
  {#each LINKS as link (link.id)}
    {@const url = buildLinkUrl(link, values)}
    {#if url === undefined}
      <span
        class="chip cursor-not-allowed text-gray-400"
        title="Type the {INPUT_NAMES[link.input]} first"
      >
        {link.label}
      </span>
    {:else}
      <a class="chip hover:bg-gray-50" href={url} target="_blank" rel="noreferrer">{link.label}</a>
    {/if}
  {/each}
</nav>
