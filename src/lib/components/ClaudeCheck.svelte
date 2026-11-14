<script lang="ts">
import { onMount } from 'svelte';
import { type CheckRequest, fetchNoteCheck, type Finding } from '#lib/api/ai.ts';
import { errorMessage } from '#lib/api/http.ts';
import { FIELDS } from '#lib/note-type.ts';

let {
  request,
}: {
  // The note as it stood when the review opened.
  request: CheckRequest;
} = $props();

type Checking =
  | { kind: 'checking' }
  | { kind: 'checked'; findings: Finding[] }
  | { kind: 'failed'; message: string };

let checking: Checking = $state.raw({ kind: 'checking' });

async function check(signal: AbortSignal) {
  try {
    checking = { kind: 'checked', findings: (await fetchNoteCheck(request, signal)).findings };
  } catch (error) {
    if (!signal.aborted) checking = { kind: 'failed', message: errorMessage(error) };
  }
}

// Asked once per review. Leaving the review, by saving or cancelling, abandons the answer, since
// the check only advises and a save never waits on it.
onMount(() => {
  const controller = new AbortController();
  check(controller.signal);
  return () => controller.abort();
});
</script>

<section
  aria-label="Claude's check"
  aria-live="polite"
  aria-busy={checking.kind === 'checking'}
  class="max-h-[30vh] basis-full overflow-y-auto border-l-2 border-violet-300 pl-3"
>
  {#if checking.kind === 'checking'}
    <p class="hint flex items-center gap-2">
      <span
        class="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-violet-700"
        aria-hidden="true"
      ></span>
      Claude is checking the note…
    </p>
  {:else if checking.kind === 'failed'}
    <p class="text-red-700">Couldn't check the note: {checking.message}</p>
  {:else if checking.findings.length === 0}
    <p class="text-gray-600">Claude found no problems.</p>
  {:else}
    <p>Claude found these. Fix what you agree with:</p>
    <ul class="space-y-2">
      {#each checking.findings as { field, problem, rewrite }, index (index)}
        <li>
          <span class="font-medium">{FIELDS[field].name}:</span>
          {problem}
          {#if rewrite !== undefined}
            <span class="block">
              <span class="text-gray-600">Try:</span>
              <bdi class="font-hebrew text-lg">{rewrite}</bdi>
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
