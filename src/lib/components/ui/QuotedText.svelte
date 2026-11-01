<script lang="ts">
import { quotedParts } from '#lib/field-help.ts';

let { text }: { text: string } = $props();
</script>

<!-- An example stays on one line, and `<bdi>` keeps a Hebrew one from reordering the English around
     it. `ltr`, as Anki shows these fields, so “כרטיס רכבת (train ticket)” keeps its English on the
     right. -->
{#each quotedParts(text) as part, index (index)}
  {#if part.quoted}
    <span class="whitespace-nowrap">“<bdi dir="ltr">{part.text}</bdi>”</span>
  {:else}
    {part.text}
  {/if}
{/each}
