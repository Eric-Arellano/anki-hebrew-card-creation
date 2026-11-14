<script lang="ts">
import { quotedParts } from '#lib/field-help.ts';

let { text }: { text: string } = $props();
</script>

<!-- An example stays on one line, and `<bdi>` keeps a Hebrew one from reordering the English around
     it. `auto`, so a Hebrew sentence keeps the `.` ending it on its left, while “me: לְפָנַי”, which
     starts in English, still reads left to right. -->
{#each quotedParts(text) as part, index (index)}
  {#if part.quoted}
    <span class="whitespace-nowrap">“<bdi dir="auto">{part.text}</bdi>”</span>
  {:else}
    {part.text}
  {/if}
{/each}
