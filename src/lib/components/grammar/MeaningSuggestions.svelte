<script lang="ts">
import { fetchMeaningSuggestions, type MeaningsRequest } from '#lib/api/ai.ts';
import { errorMessage } from '#lib/api/http.ts';
import type { Meaning, PrepositionChoice } from '#lib/card/definitions.ts';
import {
  meaningsBlocker,
  type Origin,
  type ProposedMeaning,
  proposedMeanings,
  withProposal,
} from '#lib/card/meaning-suggestions.ts';
import { POINTED_PREPOSITIONS } from '#lib/hebrew/preposition.ts';
import Checkbox from '../ui/Checkbox.svelte';

let {
  request,
  onuse,
}: {
  // What Claude is asked about, as the inputs hold it now.
  request: MeaningsRequest;
  onuse: (meanings: Meaning[]) => void;
} = $props();

// `asked` is the request as sent, which the proposal's lines point into.
type Asking =
  | { kind: 'idle' }
  | { kind: 'asking' }
  | { kind: 'said'; message: string }
  | { kind: 'failed'; message: string }
  | { kind: 'proposed'; asked: string; meanings: Meaning[]; proposed: ProposedMeaning[] };

let asking = $state.raw<Asking>({ kind: 'idle' });
// The indices of the proposed meanings the human unchecked.
let skipped: number[] = $state.raw([]);

const blocker = $derived(meaningsBlocker(request));
// Its lines point at meanings the human has since changed, so it can't be used as it stands.
const stale = $derived(asking.kind === 'proposed' && asking.asked !== JSON.stringify(request));
const used = $derived(
  asking.kind === 'proposed' ? withProposal(asking.meanings, asking.proposed, skipped) : [],
);
const changesAnything = $derived(
  asking.kind === 'proposed' && JSON.stringify(used) !== JSON.stringify(asking.meanings),
);

function prepositionLabel(choice: PrepositionChoice): string {
  return choice === 'none' ? 'None' : POINTED_PREPOSITIONS[choice];
}

function toggle(index: number, taken: boolean) {
  skipped = taken ? skipped.filter((each) => each !== index) : [...skipped, index];
}

async function ask() {
  if (blocker !== undefined || asking.kind === 'asking') return;
  const asked = JSON.stringify(request);
  const sent: MeaningsRequest = JSON.parse(asked);
  asking = { kind: 'asking' };
  try {
    const { meanings } = await fetchMeaningSuggestions(sent);
    if (JSON.stringify(request) !== asked) {
      asking = {
        kind: 'said',
        message: 'The meanings changed while Claude was answering, so its answer was set aside.',
      };
      return;
    }
    const proposed = proposedMeanings(sent.meanings, meanings);
    if (proposed.every(({ origin }) => origin.kind === 'unchanged')) {
      asking = {
        kind: 'said',
        message:
          proposed.length === 0
            ? 'Claude had no meanings to suggest.'
            : 'Claude would keep the meanings and prepositions as they are.',
      };
      return;
    }
    skipped = [];
    asking = { kind: 'proposed', asked, meanings: sent.meanings, proposed };
  } catch (error) {
    asking = { kind: 'failed', message: errorMessage(error) };
  }
}

function use() {
  onuse(used);
  asking = { kind: 'said', message: 'Claude’s meanings are in, above, to edit as you like.' };
}
</script>

{#snippet originTag(origin: Origin)}
  <!-- The human's own words and choice are isolated, since either may be in the other script. -->
  <span class="text-sm text-violet-300">
    {#if origin.kind === 'unchanged'}
      Unchanged
    {:else if origin.kind === 'yours' && origin.chose !== undefined}
      You chose <bdi lang="he">{prepositionLabel(origin.chose)}</bdi>
    {:else if origin.kind === 'yours'}
      Your meaning
    {:else if origin.kind === 'reworded'}
      From your “<bdi lang="en">{origin.from}</bdi>”
    {:else}
      Added
    {/if}
  </span>
{/snippet}

<div class="grid gap-2">
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <button
      type="button"
      class="inline-flex items-center gap-2 border-violet-700 bg-violet-950/40 text-violet-300 hover:bg-violet-900/50"
      disabled={blocker !== undefined || asking.kind === 'asking'}
      aria-busy={asking.kind === 'asking'}
      aria-describedby="meanings-status"
      onclick={ask}
    >
      {#if asking.kind === 'asking'}
        <span
          class="size-4 animate-spin rounded-full border-2 border-violet-900 border-t-violet-400"
          aria-hidden="true"
        ></span>
      {/if}
      Suggest meanings with Claude
    </button>
    <p id="meanings-status" class="hint" aria-live="polite">
      {#if blocker !== undefined}
        {blocker}
      {:else if asking.kind === 'asking'}
        Asking Claude…
      {:else if asking.kind === 'failed'}
        <span class="text-red-400">Couldn't get meanings: {asking.message}</span>
      {:else if asking.kind === 'said'}
        {asking.message}
      {:else if asking.kind === 'idle'}
        Drafts each meaning with its preposition, for you to check before using.
      {/if}
    </p>
  </div>
  {#if asking.kind === 'proposed'}
    <section
      class="grid gap-3 rounded-lg border border-violet-800 bg-violet-950/20 p-3"
      aria-label="Claude’s meanings"
    >
      <ul class="grid gap-3">
        {#each asking.proposed as meaning, index (meaning)}
          <li class="grid gap-1">
            {#snippet line()}
              <span class="flex flex-wrap items-baseline gap-x-2">
                <span lang="en">{meaning.english}</span>
                <bdi lang="he" class="chip px-2 py-0 text-lg"
                  >{prepositionLabel(meaning.preposition)}</bdi
                >
                {@render originTag(meaning.origin)}
              </span>
            {/snippet}
            {#if meaning.origin.kind === 'unchanged'}
              <!-- Nothing to take, so nothing to check: the box's width keeps it in line. -->
              <span class="flex items-center gap-2 text-neutral-400">
                <span class="w-5 shrink-0" aria-hidden="true"></span>
                {@render line()}
              </span>
            {:else}
              <Checkbox
                label={line}
                bind:checked={() => !skipped.includes(index), (taken) => toggle(index, taken)}
              />
            {/if}
            {#if meaning.usage !== undefined}
              <p class="ps-7"><bdi lang="he">{meaning.usage}</bdi></p>
            {/if}
            {#if meaning.note !== undefined}
              <p class="hint ps-7">{meaning.note}</p>
            {/if}
          </li>
        {/each}
      </ul>
      <p class="hint">
        An unchecked meaning is left out.
        {#if asking.meanings.length > 0}
          A meaning of yours stays as it was if you take nothing from it.
        {/if}
      </p>
      {#if stale}
        <p class="text-sm text-amber-400" aria-live="polite">
          The meanings changed since Claude answered. Ask again to use a suggestion for them.
        </p>
      {/if}
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="button-primary"
          disabled={stale || !changesAnything}
          onclick={use}
        >
          Use these
        </button>
        <button type="button" onclick={() => (asking = { kind: 'idle' })}>Dismiss</button>
      </div>
    </section>
  {/if}
</div>
