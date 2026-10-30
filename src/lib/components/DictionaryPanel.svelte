<script lang="ts">
import type { DictionaryCandidate, DictionaryLookup } from '#lib/api/dictionary.ts';
import { errorMessage } from '#lib/api/http.ts';

let {
  lookup,
  picked,
  onpick,
  onunpick,
}: {
  // `undefined` while there's nothing to look up; resolves to `undefined` while typing goes on.
  lookup: Promise<DictionaryLookup | undefined> | undefined;
  picked: DictionaryCandidate | undefined;
  onpick: (candidate: DictionaryCandidate) => void;
  onunpick: () => void;
} = $props();
</script>

{#snippet headline(
  candidate: DictionaryCandidate,
)}
  <span class="text-2xl" lang="he" dir="rtl">{candidate.pointed ?? candidate.title}</span>
  <span class="text-sm text-gray-600">{candidate.pos}</span>
  {#if candidate.roots.length > 0}
    <span class="text-sm text-gray-600">
      root <bdi lang="he">{candidate.roots.join(', ')}</bdi>
    </span>
  {/if}
{/snippet}

{#snippet lookingUp()}
  <p class="hint">Looking it up in the dictionary…</p>
{/snippet}

<section aria-label="Dictionary">
  {#if picked !== undefined}
    <div class="space-y-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="text-sm text-gray-600">Filled in from Wiktionary:</span>
        {@render headline(picked)}
        <button type="button" class="ms-auto text-sm" onclick={onunpick}>Choose another</button>
      </div>
      <!-- Read-only: the human writes their own meaning, with these beside it. -->
      <ol aria-label="Wiktionary's meanings" class="list-decimal space-y-0.5 ps-6">
        {#each picked.glosses as gloss, index (index)}
          <li>{gloss}</li>
        {/each}
      </ol>
    </div>
  {:else if lookup !== undefined}
    {#await lookup}
      {@render lookingUp()}
    {:then result}
      {#if result === undefined}
        {@render lookingUp()}
      {:else}
        {#if result.staleIndex}
          <p class="mb-2 text-sm text-amber-800">
            The dictionary file changed after it was indexed. Run <code>npm run build-index</code>
            to look words up in the new one.
          </p>
        {/if}
        {#if result.candidates.length === 0}
          <p class="hint">Not in the dictionary.</p>
        {:else}
          <p class="mb-2 font-medium">
            {result.match === 'exact'
              ? 'Which word is it?'
              : 'Not in the dictionary as typed. Possible matches, spelled differently:'}
          </p>
          <ul class="grid gap-2 sm:grid-cols-2">
            {#each result.candidates as candidate (candidate.id)}
              <li class="grid">
                <button
                  type="button"
                  class="grid gap-1 rounded-lg px-4 py-2 text-start"
                  onclick={() => onpick(candidate)}
                >
                  <span class="flex flex-wrap items-baseline gap-x-3">
                    {@render headline(candidate)}
                  </span>
                  {#if candidate.glosses[0] !== undefined}
                    <span class="line-clamp-2 text-sm">{candidate.glosses[0]}</span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    {:catch error}
      <p role="alert" class="text-red-700">{errorMessage(error)}</p>
    {/await}
  {/if}
</section>
