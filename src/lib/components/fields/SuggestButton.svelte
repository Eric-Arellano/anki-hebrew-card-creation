<script lang="ts">
import {
  fetchSuggestions,
  SUGGESTED_HINTS,
  type SuggestRequest,
  type Suggestions,
} from '#lib/api/ai.ts';
import { errorMessage } from '#lib/api/http.ts';
import { type Example, isBlankExample } from '#lib/card/examples.ts';
import type { FieldKey, FieldValues } from '#lib/note-type.ts';

let {
  request,
  blocker,
  edits,
  examples,
  onedit,
  onexamples,
  suggested = $bindable(),
}: {
  // What Claude is asked about, as the inputs hold it now.
  request: SuggestRequest;
  // Why there is nothing to ask for yet.
  blocker: string | undefined;
  edits: FieldValues;
  examples: readonly Example[];
  onedit: (field: FieldKey, value: string) => void;
  onexamples: (examples: Example[]) => void;
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
    const filledHints = SUGGESTED_HINTS.flatMap((field) => {
      const value = suggestions[field];
      return value !== undefined && isBlank(field) ? [[field, value] as const] : [];
    });
    const filledExamples =
      suggestions.examples !== undefined && examples.every(isBlankExample)
        ? suggestions.examples
        : undefined;
    for (const [field, value] of filledHints) onedit(field, value);
    if (filledExamples !== undefined) onexamples(filledExamples);
    suggested = {
      ...suggested,
      ...Object.fromEntries(filledHints),
      ...(filledExamples === undefined ? {} : { examples: filledExamples }),
    };
    asking =
      filledHints.length === 0 && filledExamples === undefined
        ? { kind: 'answered', message: 'Claude had nothing to add to the blank fields.' }
        : { kind: 'idle' };
  } catch (error) {
    asking = { kind: 'failed', message: errorMessage(error) };
  }
}
</script>

<!-- In its section's header, so the status line stacks under the button, kept narrow. -->
<div class="flex max-w-sm flex-col items-start gap-1 sm:items-end">
  <button
    type="button"
    class="inline-flex items-center gap-2 border-violet-700 bg-violet-950/40 text-violet-300 hover:bg-violet-900/50"
    disabled={blocker !== undefined || asking.kind === 'asking'}
    aria-busy={asking.kind === 'asking'}
    aria-describedby="suggest-status"
    onclick={ask}
  >
    {#if asking.kind === 'asking'}
      <span
        class="size-4 animate-spin rounded-full border-2 border-violet-900 border-t-violet-400"
        aria-hidden="true"
      ></span>
    {/if}
    Suggest with Claude
  </button>
  <p id="suggest-status" class="hint sm:text-right" aria-live="polite">
    {#if blocker !== undefined}
      {blocker}
    {:else if asking.kind === 'asking'}
      Asking Claude…
    {:else if asking.kind === 'failed'}
      <span class="text-red-400">Couldn't get suggestions: {asking.message}</span>
    {:else if asking.kind === 'answered'}
      {asking.message}
    {:else}
      Drafts the blank hints and examples. Each stays marked Suggested until you edit it.
    {/if}
  </p>
</div>
