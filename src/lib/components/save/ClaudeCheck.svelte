<script module lang="ts">
import type { Finding } from '#lib/api/ai.ts';

export type Checking =
  | { kind: 'checking' }
  | { kind: 'checked'; findings: Finding[] }
  | { kind: 'failed'; message: string };
</script>

<script lang="ts">
import { FIELDS } from '#lib/note-type.ts';

let { checking }: { checking: Checking } = $props();
</script>

<section
  aria-label="Claude's check"
  aria-live="polite"
  aria-busy={checking.kind === 'checking'}
  class="max-h-[30vh] basis-full overflow-y-auto border-l-2 border-violet-700 pl-3"
>
  {#if checking.kind === 'checking'}
    <p class="hint flex items-center gap-2">
      <span
        class="size-4 animate-spin rounded-full border-2 border-neutral-600 border-t-violet-400"
        aria-hidden="true"
      ></span>
      Claude is checking the note…
    </p>
  {:else if checking.kind === 'failed'}
    <p class="text-red-400">Couldn't check the note: {checking.message}</p>
  {:else if checking.findings.length === 0}
    <p class="text-neutral-400">Claude found no problems.</p>
  {:else}
    <p>Claude found these. Fix what you agree with:</p>
    <ul class="space-y-2">
      {#each checking.findings as { field, problem, rewrite }, index (index)}
        <li>
          <span class="font-medium">{FIELDS[field].name}:</span>
          {problem}
          {#if rewrite !== undefined}
            <span class="block">
              <span class="text-neutral-400">Try:</span>
              <!-- Each side of an example's ` — ` isolated, so its English stays after its Hebrew. -->
              {#each rewrite.split(/ [-–—] /) as part, partIndex (partIndex)}
                {#if partIndex > 0}
                  {' — '}
                {/if}
                <bdi class="font-hebrew text-lg">{part}</bdi>
              {/each}
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
