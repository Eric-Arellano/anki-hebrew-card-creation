<script lang="ts">
import {
  fetchSuggestions,
  SUGGESTED_FIELDS,
  type SuggestRequest,
  type Suggestions,
} from '#lib/api/ai.ts';
import { errorMessage } from '#lib/api/http.ts';
import type { FieldKey, FieldValues } from '#lib/note-type.ts';

let {
  request,
  blocker,
  edits,
  onedit,
  suggested = $bindable(),
}: {
  // What Claude is asked about, as the inputs hold it now.
  request: SuggestRequest;
  // Why there is nothing to ask for yet.
  blocker: string | undefined;
  edits: FieldValues;
  onedit: (field: FieldKey, value: string) => void;
  // What Claude last wrote into each field, which the field's badge compares with what it holds.
  suggested: Suggestions;
} = $props();

type Asking =
  | { kind: 'idle' }
  | { kind: 'asking' }
  | { kind: 'answered'; message: string }
  | { kind: 'failed'; message: string };

let asking: Asking = $state.raw({ kind: 'idle' });

function isBlank(field: FieldKey) {
  return (edits[field] ?? '').trim() === '';
}

async function ask() {
  if (blocker !== undefined || asking.kind === 'asking') return;
  const asked = JSON.stringify(request);
  asking = { kind: 'asking' };
  try {
    const suggestions = await fetchSuggestions(request);
    if (JSON.stringify(request) !== asked) {
      asking = {
        kind: 'answered',
        message: 'The word changed while Claude was answering, so nothing was filled in.',
      };
      return;
    }
    // Only fields still blank as the reply lands, so typing during the call wins.
    const filled = SUGGESTED_FIELDS.flatMap((field) => {
      const value = suggestions[field];
      return value !== undefined && isBlank(field) ? [[field, value] as const] : [];
    });
    for (const [field, value] of filled) onedit(field, value);
    suggested = { ...suggested, ...Object.fromEntries(filled) };
    asking =
      filled.length === 0
        ? { kind: 'answered', message: 'Claude had nothing to add to the blank fields.' }
        : { kind: 'idle' };
  } catch (error) {
    asking = { kind: 'failed', message: errorMessage(error) };
  }
}
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-4">
  <button
    type="button"
    class="inline-flex items-center gap-2"
    disabled={blocker !== undefined || asking.kind === 'asking'}
    aria-busy={asking.kind === 'asking'}
    aria-describedby="suggest-status"
    onclick={ask}
  >
    {#if asking.kind === 'asking'}
      <span
        class="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-700"
        aria-hidden="true"
      ></span>
    {/if}
    Suggest
  </button>
  <p id="suggest-status" class="hint" aria-live="polite">
    {#if blocker !== undefined}
      {blocker}
    {:else if asking.kind === 'asking'}
      Asking Claude…
    {:else if asking.kind === 'failed'}
      <span class="text-red-700">Couldn't get suggestions: {asking.message}</span>
    {:else if asking.kind === 'answered'}
      {asking.message}
    {:else}
      Claude fills in the blank Examples and hints from the word and its meanings.
    {/if}
  </p>
</div>
