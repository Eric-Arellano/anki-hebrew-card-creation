<script lang="ts">
let {
  label,
  url,
  blankInput,
  note,
}: {
  label: string;
  // `undefined` while the input the link searches with is blank.
  url: string | undefined;
  // How the tooltip names that input.
  blankInput: string;
  // A word on what the link will find, like "no entry".
  note?: string;
} = $props();
</script>

{#if url === undefined}
  <span class="chip cursor-not-allowed text-gray-400" title="Type the {blankInput} first">
    {label}
  </span>
{:else}
  <a class="chip gap-1 hover:bg-gray-50" href={url} target="_blank" rel="noreferrer">
    {label}
    {#if note !== undefined}
      <span class="text-sm text-gray-500">· {note}</span>
    {/if}
  </a>
{/if}
