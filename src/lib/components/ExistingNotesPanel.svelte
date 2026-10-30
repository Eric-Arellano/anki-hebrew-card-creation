<script lang="ts">
import {
  browseNotes,
  type ExistingNote,
  type ExistingNotes,
  errorMessage,
  fetchExistingNotes,
} from '#lib/api.ts';
import { afterTypingPauses } from '#lib/typing-pause.ts';

// The word as typed, and once a dictionary entry is picked, its title too, which finds old notes
// that hold a verb's past tense rather than its infinitive.
let { words }: { words: string[] } = $props();

const searchedWords = $derived(words.map((word) => word.trim()).filter((word) => word !== ''));
const query = $derived(searchedWords.join('\n'));
// `{#await}` shows only the latest promise, so an older search's reply never lands.
const search = $derived(
  query === ''
    ? undefined
    : afterTypingPauses(
        query,
        () => query,
        () => fetchExistingNotes(searchedWords),
      ),
);
let browseFailure: string | undefined = $state();

async function browse(notes: ExistingNotes) {
  browseFailure = undefined;
  const noteIds = [...notes.exactMatches, ...notes.relatedMatches].map((note) => note.noteId);
  try {
    await browseNotes(noteIds);
  } catch (error) {
    browseFailure = errorMessage(error);
  }
}
</script>

{#snippet noteList(
  label: string,
  notes: ExistingNote[],
)}
  {#if notes.length > 0}
    <p class="font-medium">{label}</p>
    <ul class="flex flex-wrap gap-x-6 text-xl">
      {#each notes as note (note.noteId)}
        <li lang="he" dir="rtl">{note.pointed || note.unpointed}</li>
      {/each}
    </ul>
  {/if}
{/snippet}

{#snippet searching()}
  <p class="text-sm text-gray-500">Searching the deck…</p>
{/snippet}

<section aria-label="Already in the deck">
  {#if search !== undefined}
    {#await search}
      {@render searching()}
    {:then notes}
      {#if notes === undefined}
        {@render searching()}
      {:else if notes.exactMatches.length === 0 && notes.relatedMatches.length === 0}
        <p class="text-sm text-gray-500">Not in the deck yet.</p>
      {:else}
        {@const found = notes.exactMatches.length > 0}
        <div
          class={[
            'space-y-2 rounded-lg border px-4 py-3',
            found ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50',
          ]}
        >
          {@render noteList('Already in the deck', notes.exactMatches)}
          {@render noteList(found ? 'Related' : 'Related notes in the deck', notes.relatedMatches)}
          <button type="button" class="text-sm" onclick={() => browse(notes)}>
            Browse in Anki
          </button>
          {#if browseFailure !== undefined}
            <p role="alert" class="text-red-700">{browseFailure}</p>
          {/if}
        </div>
      {/if}
    {:catch error}
      <p role="alert" class="text-red-700">{errorMessage(error)}</p>
    {/await}
  {/if}
</section>
