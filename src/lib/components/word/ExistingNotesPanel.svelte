<script lang="ts">
import {
  browseNotes,
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
let browseFailure: string | undefined = $state();
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

async function browse(notes: ExistingNotes) {
  browseFailure = undefined;
  const noteIds = [...notes.exactMatches, ...notes.relatedMatches].map((note) => note.noteId);
  try {
    await browseNotes(noteIds);
  } catch (error) {
    browseFailure = errorMessage(error);
  }
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

{#snippet noteList(
  label: string,
  notes: ExistingNote[],
)}
  {#if notes.length > 0}
    <p class="font-medium">{label}</p>
    <ul class="flex flex-wrap gap-x-2 text-xl">
      {#each notes as note (note.noteId)}
        <li>
          <button
            type="button"
            class="border-transparent bg-transparent px-2"
            lang="he"
            dir="rtl"
            title="Open this note in the editor"
            disabled={opening}
            onclick={() => askToOpen(note)}
          >
            {displayed(note)}
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
            'space-y-2 rounded-lg border px-4 py-3',
            found ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50',
          ]}
        >
          {@render noteList('Already in the deck', notes.exactMatches)}
          {@render noteList(found ? 'Related' : 'Related notes in the deck', notes.relatedMatches)}
          {#if confirming !== undefined}
            {@const note = confirming}
            <p role="alert">
              Opening <bdi lang="he">{displayed(note)}</bdi> replaces what you've typed here.
            </p>
            <!-- Focused, so a second Enter is a deliberate one. -->
            <button type="button" class="button-primary" {@attach focus} onclick={() => open(note)}>
              Replace and open
            </button>
            <button type="button" onclick={() => (confirming = undefined)}>Cancel</button>
          {:else}
            <button type="button" class="text-sm" onclick={() => browse(notes)}>
              Browse in Anki
            </button>
          {/if}
          {#if openFailure !== undefined}
            <p role="alert" class="text-red-700">{openFailure}</p>
          {/if}
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
