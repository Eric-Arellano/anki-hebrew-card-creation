<script lang="ts">
import { DECK, NOTE_TYPE } from '#lib/note-type.ts';
import type { AnkiStatus } from '#lib/server/deck.ts';

let {
  status,
  problem,
  onrecheck,
}: {
  // `undefined` while the check is in flight.
  status: AnkiStatus | undefined;
  problem: string | undefined;
  onrecheck: () => void;
} = $props();
</script>

{#snippet recheck()}
  <button type="button" class="text-sm" onclick={onrecheck} disabled={status === undefined}>
    Check again
  </button>
{/snippet}

{#if status !== undefined && problem !== undefined}
  <div class="flex basis-full items-center justify-between gap-4 rounded-lg bg-red-100 px-4 py-2">
    <p role="alert">{problem}</p>
    {@render recheck()}
  </div>
{:else}
  <div class="flex items-center gap-2 text-sm text-gray-600">
    <span
      aria-hidden="true"
      class={['size-2 rounded-full', status === undefined ? 'bg-gray-400' : 'bg-green-600']}
    ></span>
    {#if status === undefined}
      <p>Checking Anki…</p>
    {:else}
      <p>Connected to Anki: deck <span lang="he" dir="rtl">{DECK}</span>, note type {NOTE_TYPE}</p>
    {/if}
    {@render recheck()}
  </div>
{/if}
