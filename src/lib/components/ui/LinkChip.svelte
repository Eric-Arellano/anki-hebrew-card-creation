<script lang="ts">
let {
  label,
  url,
  blankInput,
}: {
  label: string;
  // `undefined` while the input the link searches with is blank.
  url: string | undefined;
  // How the tooltip names that input.
  blankInput: string;
} = $props();
</script>

{#if url === undefined}
  <span class="chip cursor-not-allowed text-gray-400" title="Type the {blankInput} first">
    {label}
  </span>
{:else}
  <a class="chip hover:bg-gray-50" href={url} target="_blank" rel="noreferrer">{label}</a>
{/if}
