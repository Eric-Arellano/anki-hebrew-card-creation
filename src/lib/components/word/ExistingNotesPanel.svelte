<script lang="ts">
import {
  type ExistingNote,
  type ExistingNotes,
  fetchExistingNotes,
  fetchNote,
  type LoadedNote,
} from '#lib/api/anki.ts';
import { errorMessage } from '#lib/api/http.ts';
import { afterTypingPauses } from '#lib/typing-pause.ts';

let {
  words,
  editingNoteId,
  replacesDraft,
  onopen,
}: {
  // The word as typed, and once a dictionary entry is picked, its title too, which finds old notes
  // that hold a verb's past tense rather than its infinitive.
  words: string[];
  // Left out of the list, where it would report itself as already in the deck.
  editingNoteId: number | undefined;
  // Whether opening a note would lose something typed, so it asks first.
  replacesDraft: boolean;
  onopen: (note: LoadedNote) => void;
} = $props();

const searchedWords = $derived(words.map((word) => word.trim()).filter((word) => word !== ''));
const query = $derived(searchedWords.join('\n'));
// `{#await}` shows only the latest promise, so an older search's reply never lands.
const search = $derived(
  query === ''
    ? undefined
    : afterTypingPauses(
        query,
        () => query,
        async () => withoutEditedNote(await fetchExistingNotes(searchedWords)),
      ),
);
let confirming: ExistingNote | undefined = $state.raw();
let opening = $state(false);
let openFailure: string | undefined = $state();

function withoutEditedNote({ exactMatches, relatedMatches }: ExistingNotes): ExistingNotes {
  function isOther(note: ExistingNote) {
    return note.noteId !== editingNoteId;
  }
  return {
    exactMatches: exactMatches.filter(isOther),
    relatedMatches: relatedMatches.filter(isOther),
  };
}

function displayed(note: ExistingNote): string {
  return note.pointed || note.unpointed;
}

function askToOpen(note: ExistingNote) {
  openFailure = undefined;
  if (replacesDraft) confirming = note;
  else open(note);
}

async function open(note: ExistingNote) {
  confirming = undefined;
  opening = true;
  try {
    onopen(await fetchNote(note.noteId));
  } catch (error) {
    openFailure = errorMessage(error);
  } finally {
    opening = false;
  }
}

function focus(element: HTMLElement) {
  element.focus();
}
</script>

<!-- Laid out like the dictionary's choices below it, since both are a choice of where the note
     starts: from one already in the deck, or from a dictionary entry. -->
{#snippet noteList(
  label: string,
  notes: ExistingNote[],
)}
  {#if notes.length > 0}
    <p class="mb-2 font-medium">{label}</p>
    <ul class="grid gap-2 sm:grid-cols-2">
      {#each notes as note (note.noteId)}
        <li class="grid">
          <button
            type="button"
            class="grid gap-1 rounded-lg bg-white px-4 py-2 text-start"
            disabled={opening}
            onclick={() => askToOpen(note)}
          >
            <span class="flex flex-wrap items-baseline gap-x-3">
              <span class="text-2xl" lang="he" dir="rtl">{displayed(note)}</span>
              {#if note.partOfSpeech !== ''}
                <span class="text-sm text-gray-600">{note.partOfSpeech}</span>
              {/if}
              <span class="ms-auto text-sm font-medium text-blue-700">Edit</span>
            </span>
            {#if note.definitions !== ''}
              <span class="line-clamp-2 text-sm">{note.definitions}</span>
            {/if}
          </button>
        </li>
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
        <!-- While editing, the note itself was found, so the word is in the deck after all. -->
        {#if editingNoteId === undefined}
          <p class="text-sm text-gray-500">Not in the deck yet.</p>
        {/if}
      {:else}
        {@const found = notes.exactMatches.length > 0}
        <div
          class={[
            'space-y-3 rounded-lg border px-4 py-3',
            found ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50',
          ]}
        >
          {@render noteList('Already in your deck. Edit it?', notes.exactMatches)}
          {@render noteList(
            found ? 'Related notes' : 'Related notes in your deck',
            notes.relatedMatches,
          )}
          {#if confirming !== undefined}
            {@const note = confirming}
            <p role="alert">
              Editing <bdi lang="he">{displayed(note)}</bdi> replaces what you've typed here.
            </p>
            <!-- Focused, so a second Enter is a deliberate one. -->
            <button type="button" class="button-primary" {@attach focus} onclick={() => open(note)}>
              Replace and edit
            </button>
            <button type="button" onclick={() => (confirming = undefined)}>Cancel</button>
          {/if}
          {#if openFailure !== undefined}
            <p role="alert" class="text-red-700">{openFailure}</p>
          {/if}
        </div>
      {/if}
    {:catch error}
      <p role="alert" class="text-red-700">{errorMessage(error)}</p>
    {/await}
  {/if}
</section>
