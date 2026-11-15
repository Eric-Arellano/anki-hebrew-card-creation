<script lang="ts">
import { untrack } from 'svelte';
import type { DictionaryCandidate, DictionaryLookup } from '#lib/api/dictionary.ts';
import { errorMessage } from '#lib/api/http.ts';
import { INPUT_NAMES } from '#lib/card/inputs.ts';
import { toComparisonKey } from '#lib/hebrew/normalize.ts';
import { buildLinkUrl, LINKS } from '#lib/links.ts';
import LinkChip from '../ui/LinkChip.svelte';

let {
  word,
  lookup,
  picked,
  editing,
  startsOpen,
  onpick,
  onunpick,
}: {
  word: string;
  // `undefined` while there's nothing to look up; resolves to `undefined` while typing goes on.
  lookup: Promise<DictionaryLookup | undefined> | undefined;
  picked: DictionaryCandidate | undefined;
  // While editing, a pick only fills blanks, so the entries say so.
  editing: boolean;
  // While editing, whether the entries show before the human asks for them.
  startsOpen: boolean;
  onpick: (candidate: DictionaryCandidate) => void;
  onunpick: () => void;
} = $props();

// Kept across a pick, so Choose another shows the entries again.
let open = $state(untrack(() => startsOpen));

function heading(match: DictionaryLookup['match']): string {
  return match === 'exact'
    ? 'Start from Wiktionary: which word is it?'
    : 'Start from Wiktionary: not in the dictionary as typed. Possible matches, spelled differently:';
}

function summary({ match, candidates }: DictionaryLookup): string {
  const count = `${candidates.length} ${candidates.length === 1 ? 'entry' : 'entries'}`;
  return `Fill blanks from Wiktionary (${match === 'exact' ? count : `${count}, spelled differently`})`;
}
</script>

{#snippet headline(
  candidate: DictionaryCandidate,
)}
  <span class="text-2xl" lang="he" dir="rtl">{candidate.pointed ?? candidate.title}</span>
  <span class="text-sm text-neutral-400">{candidate.wiktionaryPartOfSpeech}</span>
  {#if candidate.roots.length > 0}
    <span class="text-sm text-neutral-400">
      root <bdi lang="he">{candidate.roots.join(', ')}</bdi>
    </span>
  {/if}
{/snippet}

<!-- The picked entry's page, or else the word's, whose titles never carry niqqud. -->
{#snippet wiktionaryChip(
  hasEntry: boolean | undefined,
)}
  <LinkChip
    label={LINKS.wiktionary.label}
    url={buildLinkUrl(LINKS.wiktionary, picked?.title ?? toComparisonKey(word))}
    blankInput={INPUT_NAMES.word}
    note={hasEntry === false ? 'no entry' : undefined}
  />
{/snippet}

{#snippet candidateList(
  candidates: DictionaryCandidate[],
)}
  <ul class="grid gap-2 sm:grid-cols-2">
    {#each candidates as candidate (candidate.id)}
      <li class="grid">
        <button
          type="button"
          class="grid gap-1 rounded-lg px-4 py-2 text-start"
          onclick={() => onpick(candidate)}
        >
          <span class="flex flex-wrap items-baseline gap-x-3"> {@render headline(candidate)} </span>
          {#if candidate.definitions[0] !== undefined}
            <span class="line-clamp-2 text-sm">{candidate.definitions[0]}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
{/snippet}

{#snippet lookingUp()}
  <p class="hint">Looking it up in the dictionary…</p>
{/snippet}

<section aria-label="Dictionary">
  {#if picked !== undefined}
    <div class="space-y-2 rounded-lg border border-blue-800 bg-blue-950/40 px-4 py-3">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="text-sm text-neutral-400">
          {editing ? 'Filled in the blanks from Wiktionary:' : 'Filled in from Wiktionary:'}
        </span>
        {@render headline(picked)}
        <span class="ms-auto flex flex-wrap items-center gap-2">
          {@render wiktionaryChip(true)}
          <button type="button" class="text-sm" onclick={onunpick}>Choose another</button>
        </span>
      </div>
      <!-- Read-only: the human writes their own meaning, with these beside it. -->
      <ol aria-label="Wiktionary's meanings" class="list-decimal space-y-0.5 ps-6">
        {#each picked.definitions as definition, index (index)}
          <li>{definition}</li>
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
          <p class="mb-2 text-sm text-amber-300">
            The dictionary file changed after it was indexed. Run <code>npm run build-index</code>
            to look words up in the new one.
          </p>
        {/if}
        {#if result.candidates.length === 0}
          <p class="flex flex-wrap items-center gap-2">
            <span class="hint">Not in the dictionary.</span>
            {@render wiktionaryChip(result.titleHasEntry)}
          </p>
        {:else}
          {#if editing}
            <!-- The link stays outside, so it is there while the entries are collapsed. -->
            <div class="flex flex-wrap items-start gap-x-3 gap-y-1">
              <details class="min-w-0 flex-1" bind:open>
                <summary class="cursor-pointer font-medium">{summary(result)}</summary>
                <p class="hint my-2">
                  Keeps everything the note already has. Where Wiktionary differs, its value is
                  offered beside the input.
                </p>
                {@render candidateList(result.candidates)}
              </details>
              {@render wiktionaryChip(result.titleHasEntry)}
            </div>
          {:else}
            <p class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span class="font-medium">{heading(result.match)}</span>
              {@render wiktionaryChip(result.titleHasEntry)}
            </p>
            {@render candidateList(result.candidates)}
          {/if}
        {/if}
      {/if}
    {:catch error}
      <p class="flex flex-wrap items-center gap-2">
        <span role="alert" class="text-red-400">{errorMessage(error)}</span>
        {@render wiktionaryChip(undefined)}
      </p>
    {/await}
  {/if}
</section>
