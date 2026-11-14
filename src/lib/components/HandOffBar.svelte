<script lang="ts">
import { changedFields } from '#lib/anki/changes.ts';
import { type LoadedNote, openAddWindow, saveNote, storeMedia } from '#lib/api/anki.ts';
import { errorMessage, RouteError } from '#lib/api/http.ts';
import type { NewAttachment } from '#lib/media/attach.ts';

let {
  attachments,
  fieldsWith,
  onnextcard,
  held,
  onsaved,
  onloadagain,
  ankiBlocker,
  inputsBlocker,
}: {
  // Each file the note will hold that Anki doesn't yet, once.
  attachments: readonly NewAttachment[];
  // Keyed by Anki field name, as `/api/anki/add` takes them. Fields need the names Anki stored the
  // media under, which only exist once it has been stored, so this takes each name requested to
  // the one Anki used.
  fieldsWith: (storedAs: ReadonlyMap<string, string>) => Record<string, string>;
  // Called when the human moves on. Nothing clears by itself at the hand-off, because they may
  // still fix something and open the Add window again.
  onnextcard?: () => void;
  // The note being edited, as Anki last answered with it, or `undefined` for a new note, which
  // the Add window takes instead.
  held: LoadedNote | undefined;
  // The note as Anki holds it after a save, which the next save builds on.
  onsaved?: (note: LoadedNote) => void;
  // Replaces the draft with the note as Anki now holds it.
  onloadagain?: () => Promise<void>;
  // Why Anki can't take the note yet. The header already shows it, so here it is only a tooltip.
  ankiBlocker: string | undefined;
  // Which inputs are still blank, spelled out in the bar.
  inputsBlocker: string | undefined;
} = $props();

type HandOff =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'reviewing' }
  | { kind: 'sending' }
  | { kind: 'opened' }
  | { kind: 'saved' }
  | { kind: 'stale'; message: string }
  | { kind: 'failed'; message: string };

let handOff: HandOff = $state.raw({ kind: 'idle' });

// Before storing, a new file goes by the name requested, which is all the review shows of it.
const changes = $derived(
  held === undefined
    ? {}
    : changedFields(
        held.fields,
        fieldsWith(new Map(attachments.map(({ filename }) => [filename, filename]))),
      ),
);

const NOTHING_CHANGED = 'Nothing to save: every field reads as Anki holds it.';

const blocker = $derived(
  ankiBlocker ??
    inputsBlocker ??
    (held !== undefined && Object.keys(changes).length === 0 ? NOTHING_CHANGED : undefined),
);

// `guiAddCards` replaces Anki's Add window and discards whatever the human typed there, so every
// hand-off asks first. A save overwrites the note, so it shows what will change first.
function askToHandOff() {
  if (blocker !== undefined || handOff.kind === 'sending') return;
  handOff = { kind: held === undefined ? 'confirming' : 'reviewing' };
}

// One at a time, because each body can be megabytes and AnkiConnect handles one request at a time.
// Stored here rather than on attach, so an abandoned draft leaves nothing in Anki. Handing off
// twice is harmless, since the same bytes keep the same name.
async function storeAttachments(notDone: string): Promise<ReadonlyMap<string, string>> {
  const stored: [requested: string, used: string][] = [];
  try {
    for (const { filename, blob } of attachments) {
      stored.push([filename, await storeMedia(filename, blob)]);
    }
  } catch (error) {
    throw new Error(`${notDone}: storing media failed. ${errorMessage(error)}`);
  }
  return new Map(stored);
}

async function handOffToAnki() {
  handOff = { kind: 'sending' };
  try {
    await openAddWindow(fieldsWith(await storeAttachments('Add window not opened')));
    handOff = { kind: 'opened' };
  } catch (error) {
    handOff = { kind: 'failed', message: errorMessage(error) };
  }
}

async function save() {
  if (held === undefined || blocker !== undefined) return;
  const note = held;
  handOff = { kind: 'sending' };
  try {
    const storedAs = await storeAttachments('Not saved');
    onsaved?.(await saveNote(note, changedFields(note.fields, fieldsWith(storedAs))));
    handOff = { kind: 'saved' };
  } catch (error) {
    const message = errorMessage(error);
    handOff =
      error instanceof RouteError && error.status === 409
        ? { kind: 'stale', message }
        : { kind: 'failed', message };
  }
}

async function loadAgain() {
  try {
    await onloadagain?.();
  } catch (error) {
    handOff = { kind: 'failed', message: errorMessage(error) };
  }
}

function onkeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
  event.preventDefault();
  if (handOff.kind === 'reviewing') save();
  else askToHandOff();
}

function focus(element: HTMLElement) {
  element.focus();
}
</script>

<svelte:window {onkeydown} />

{#snippet fieldHtml(
  html: string,
)}
  {#if html === ''}
    <span class="text-gray-600">(blank)</span>
  {:else}
    <!-- The HTML itself, since a change in markup alone is a change too. -->
    <code dir="auto" class="break-all whitespace-pre-wrap">{html}</code>
  {/if}
{/snippet}

<section
  aria-label="Hand-off"
  class="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white py-4"
>
  {#if handOff.kind === 'confirming'}
    <p role="alert" class="basis-full">
      This replaces whatever is in Anki's Add window, including anything typed there.
    </p>
    <!-- Focused, so Cmd+Enter only opens this step and a second key press is a deliberate one. -->
    <button type="button" class="button-primary" {@attach focus} onclick={handOffToAnki}>
      Replace and open
    </button>
    <button type="button" onclick={() => (handOff = { kind: 'idle' })}>Cancel</button>
  {:else if handOff.kind === 'reviewing' && held !== undefined}
    <p class="basis-full">Saving changes these fields in Anki:</p>
    <dl class="max-h-[50vh] basis-full space-y-3 overflow-y-auto">
      {#each Object.entries(changes) as [name, after] (name)}
        <div>
          <dt class="font-medium">{name}</dt>
          <dd>
            <span class="text-gray-600">Before:</span> {@render fieldHtml(held.fields[name] ?? '')}
          </dd>
          <dd><span class="text-gray-600">After:</span> {@render fieldHtml(after)}</dd>
        </div>
      {/each}
    </dl>
    <!-- Focused, so the Cmd+Enter that opened this step is followed by a deliberate second one. -->
    <button
      type="button"
      class="button-primary"
      disabled={blocker !== undefined}
      {@attach focus}
      onclick={save}
    >
      Save changes
    </button>
    <kbd>⌘↵</kbd>
    <button type="button" onclick={() => (handOff = { kind: 'idle' })}>Cancel</button>
  {:else}
    <button
      type="button"
      class="button-primary"
      disabled={blocker !== undefined || handOff.kind === 'sending'}
      title={blocker}
      onclick={askToHandOff}
    >
      {held === undefined ? 'Open in Anki' : 'Save'}
    </button>
    <kbd>⌘↵</kbd>
    {#if handOff.kind === 'opened'}
      <p>Opened in Anki. Click Add there.</p>
      <!-- Focused, so coming back from Anki, Enter is all the next word takes. -->
      <button type="button" {@attach focus} onclick={onnextcard}>Next word</button>
    {:else if handOff.kind === 'saved'}
      <p>Saved to Anki.</p>
      <button type="button" {@attach focus} onclick={onnextcard}>Next word</button>
    {:else if handOff.kind === 'stale'}
      <p role="alert" class="text-red-700">
        {handOff.message}
        Load it again to see Anki's version, which replaces your changes here.
      </p>
      <button type="button" onclick={loadAgain}>Load again</button>
    {:else if handOff.kind === 'failed'}
      <p role="alert" class="text-red-700">{handOff.message}</p>
    {:else if inputsBlocker !== undefined}
      <p class="text-gray-600">{inputsBlocker}</p>
    {:else if blocker === NOTHING_CHANGED}
      <p class="text-gray-600">{NOTHING_CHANGED}</p>
    {/if}
  {/if}
</section>
