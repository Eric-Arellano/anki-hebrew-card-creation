<script lang="ts">
let {
  label,
  url,
  blankInput,
  note,
  lang,
}: {
  label: string;
  // `undefined` while the input the link searches with is blank.
  url: string | undefined;
  // How the tooltip names that input.
  blankInput: string;
  // A word on what the link will find, like "no entry".
  note?: string;
  // The label's language, when it is the text searched.
  lang?: string;
} = $props();
</script>

<!-- Chips also choose between options, so a link carries blue and an arrow out of the page, the
     cue for a site that opens in another tab. -->
{#snippet externalIcon()}
  <svg
    class="size-3.5 shrink-0"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M9 3h4v4M13 3 7 9M11 9.5V13H3V5h3.5" />
  </svg>
{/snippet}

{#if url === undefined}
  <span
    class="chip cursor-not-allowed gap-1.5 text-gray-400"
    title="Type the {blankInput} first"
    {lang}
  >
    {label}
    {@render externalIcon()}
  </span>
{:else}
  <a
    class="chip gap-1.5 border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50"
    href={url}
    target="_blank"
    rel="noreferrer"
  >
    <span {lang}>{label}</span>
    {#if note !== undefined}
      <span class="text-sm text-gray-500">· {note}</span>
    {/if}
    {@render externalIcon()}
  </a>
{/if}
