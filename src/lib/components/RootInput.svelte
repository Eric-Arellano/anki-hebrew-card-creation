<script lang="ts">
import { formatRoot } from '#lib/hebrew/root.ts';
import TextInput from './ui/TextInput.svelte';

let {
  root = $bindable(),
  choices,
}: {
  root: string;
  choices: readonly string[] | undefined;
} = $props();

const formattedRoot = $derived(formatRoot(root));
</script>

<div class="grid content-start gap-1">
  <TextInput label="Root, like דבר or ד.ב.ר" lang="he" {choices} bind:value={root} />
  {#if root.trim() !== ''}
    <p class="hint" aria-live="polite">
      {#if formattedRoot === undefined}
        Type only the root's Hebrew letters, without niqqud.
      {:else}
        Writes the root as <bdi lang="he">{formattedRoot}</bdi>.
      {/if}
    </p>
  {/if}
</div>
