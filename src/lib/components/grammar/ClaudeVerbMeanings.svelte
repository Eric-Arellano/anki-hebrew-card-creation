<script lang="ts">
import { fetchVerbMeaningSuggestions, type VerbMeaningsRequest } from '#lib/api/ai.ts';
import { errorMessage } from '#lib/api/http.ts';
import type { Meaning, PrepositionChoice } from '#lib/card/meanings.ts';
import {
  type ProposedVerbMeaning,
  proposedVerbMeanings,
  type VerbMeaningChange,
  verbMeaningsAfterUse,
  verbMeaningsBlocker,
} from '#lib/card/verb-meaning-suggestions.ts';
import { POINTED_PREPOSITIONS } from '#lib/hebrew/preposition.ts';
import Checkbox from '../ui/Checkbox.svelte';

let {
  request,
  onuse,
}: {
  /** What Claude is asked about, as the inputs hold it now. */
  request: VerbMeaningsRequest;
  onuse: (meanings: Meaning[]) => void;
} = $props();

type Status =
  | { kind: 'idle' }
  | { kind: 'asking' }
  | { kind: 'notice'; message: string }
  | { kind: 'failed'; message: string }
  | {
      kind: 'proposed';
      /** The request as sent, to tell when the inputs have moved on from it. */
      askedJson: string;
      /** The meanings as sent, which each proposed meaning's `fromIndex` points into. */
      askedMeanings: Meaning[];
      proposed: ProposedVerbMeaning[];
    };

let status = $state.raw<Status>({ kind: 'idle' });
/** The indices of the proposed meanings the human unchecked. */
let skipped: number[] = $state.raw([]);

const blocker = $derived(verbMeaningsBlocker(request));
/** Its meanings point at ones the human has since changed, so it can't be used as it stands. */
const stale = $derived(status.kind === 'proposed' && status.askedJson !== JSON.stringify(request));
/** Whether anything in it changes a meaning, rather than only saying why one stays. */
const offersChanges = $derived(
  status.kind === 'proposed' && status.proposed.some(({ change }) => change.kind !== 'unchanged'),
);
const meaningsIfUsed = $derived(
  status.kind === 'proposed'
    ? verbMeaningsAfterUse(status.askedMeanings, status.proposed, skipped)
    : [],
);
const changesAnything = $derived(
  status.kind === 'proposed' &&
    JSON.stringify(meaningsIfUsed) !== JSON.stringify(status.askedMeanings),
);

function prepositionLabel(choice: PrepositionChoice): string {
  return choice === 'none' ? 'None' : POINTED_PREPOSITIONS[choice];
}

function toggle(index: number, taken: boolean) {
  skipped = taken ? skipped.filter((each) => each !== index) : [...skipped, index];
}

async function ask() {
  if (blocker !== undefined || status.kind === 'asking') return;
  const askedJson = JSON.stringify(request);
  const sent: VerbMeaningsRequest = JSON.parse(askedJson);
  status = { kind: 'asking' };
  try {
    const { meanings } = await fetchVerbMeaningSuggestions(sent);
    if (JSON.stringify(request) !== askedJson) {
      status = {
        kind: 'notice',
        message: 'The meanings changed while Claude was answering, so its answer was set aside.',
      };
      return;
    }
    const proposed = proposedVerbMeanings(sent.meanings, meanings);
    // A note on a meaning Claude kept is still worth reading: it is where Claude names another
    // preposition that fits as well as the human's.
    const keepsAll = proposed.every(({ change }) => change.kind === 'unchanged');
    if (keepsAll && proposed.every(({ note }) => note === undefined)) {
      status = {
        kind: 'notice',
        message:
          proposed.length === 0
            ? 'Claude had no meanings to suggest.'
            : 'Claude would keep the meanings and prepositions as they are.',
      };
      return;
    }
    skipped = [];
    status = { kind: 'proposed', askedJson, askedMeanings: sent.meanings, proposed };
  } catch (error) {
    status = { kind: 'failed', message: errorMessage(error) };
  }
}

function use() {
  onuse(meaningsIfUsed);
  status = { kind: 'notice', message: 'Claude’s meanings are in, above, to edit as you like.' };
}
</script>

{#snippet changeTag(change: VerbMeaningChange)}
  <!-- The human's own words and choice are isolated, since either may be in the other script. -->
  <span class="text-sm text-violet-300">
    {#if change.kind === 'unchanged'}
      Unchanged
    {:else if change.kind === 'newPreposition' && change.replaced !== undefined}
      You chose <bdi lang="he">{prepositionLabel(change.replaced)}</bdi>
    {:else if change.kind === 'newPreposition'}
      Your meaning
    {:else if change.kind === 'reworded'}
      From your “<bdi lang="en">{change.original}</bdi>”
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
      disabled={blocker !== undefined || status.kind === 'asking'}
      aria-busy={status.kind === 'asking'}
      aria-describedby="verb-meanings-status"
      onclick={ask}
    >
      {#if status.kind === 'asking'}
        <span
          class="size-4 animate-spin rounded-full border-2 border-violet-900 border-t-violet-400"
          aria-hidden="true"
        ></span>
      {/if}
      Suggest meanings with Claude
    </button>
    <p id="verb-meanings-status" class="hint" aria-live="polite">
      {#if blocker !== undefined}
        {blocker}
      {:else if status.kind === 'asking'}
        Asking Claude…
      {:else if status.kind === 'failed'}
        <span class="text-red-400">Couldn't get meanings: {status.message}</span>
      {:else if status.kind === 'notice'}
        {status.message}
      {:else if status.kind === 'idle'}
        Drafts each meaning with its preposition, for you to check before using.
      {:else if !offersChanges}
        Claude would keep the meanings and prepositions as they are, with a note.
      {/if}
    </p>
  </div>
  {#if status.kind === 'proposed'}
    <section
      class="grid gap-3 rounded-lg border border-violet-800 bg-violet-950/20 p-3"
      aria-label="Claude’s meanings"
    >
      <ul class="grid gap-3">
        {#each status.proposed as meaning, index (meaning)}
          <li class="grid gap-1">
            {#snippet line()}
              <span class="flex flex-wrap items-baseline gap-x-2">
                <span lang="en">{meaning.english}</span>
                <bdi lang="he" class="chip px-2 py-0 text-lg"
                  >{prepositionLabel(meaning.preposition)}</bdi
                >
                {@render changeTag(meaning.change)}
              </span>
            {/snippet}
            {#if meaning.change.kind === 'unchanged'}
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
      {#if offersChanges}
        <p class="hint">
          An unchecked meaning is left out.
          {#if status.askedMeanings.length > 0}
            A meaning of yours stays as it was if you take nothing from it.
          {/if}
        </p>
        {#if stale}
          <p class="text-sm text-amber-400" aria-live="polite">
            The meanings changed since Claude answered. Ask again to use a suggestion for them.
          </p>
        {/if}
      {/if}
      <div class="flex flex-wrap gap-2">
        {#if offersChanges}
          <button
            type="button"
            class="button-primary"
            disabled={stale || !changesAnything}
            onclick={use}
          >
            Use these
          </button>
        {/if}
        <button type="button" onclick={() => (status = { kind: 'idle' })}>Dismiss</button>
      </div>
    </section>
  {/if}
</div>
