<script lang="ts">
import { changedFields } from '#lib/anki/changes.ts';
import { addNote, type LoadedNote, saveNote, storeMedia } from '#lib/api/anki.ts';
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
  // Keyed by Anki field name. Fields need the names Anki stored the media under, which only exist
  // once it has been stored, so this takes each name requested to the one Anki used.
  fieldsWith: (storedAs: ReadonlyMap<string, string>) => Record<string, string>;
  // Called when the human moves on. Nothing clears by itself after a save, because they may still
  // fix something and save again.
  onnextcard?: () => void;
  // The note being edited, as Anki last answered with it, or `undefined` for a new note.
  held: LoadedNote | undefined;
  // The note as Anki holds it after it is added or saved, which the next save builds on.
  onsaved?: (note: LoadedNote) => void;
  // Replaces the draft with the note as Anki now holds it.
  onloadagain?: () => Promise<void>;
  // Why Anki can't take the note yet. The header already shows it, so here it is only a tooltip.
  ankiBlocker: string | undefined;
  // Which inputs are still blank, spelled out in the bar.
  inputsBlocker: string | undefined;
} = $props();

type Saving =
  | { kind: 'idle' }
  | { kind: 'reviewing' }
  | { kind: 'sending' }
  | { kind: 'added' }
  | { kind: 'saved' }
  | { kind: 'duplicate'; message: string }
  | { kind: 'stale'; message: string }
  | { kind: 'failed'; message: string };

let saving: Saving = $state.raw({ kind: 'idle' });

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

// A save overwrites the note, so it shows what will change first. A new note overwrites nothing.
function submit() {
  if (blocker !== undefined || saving.kind === 'sending') return;
  if (held === undefined) add({ allowDuplicate: false });
  else saving = { kind: 'reviewing' };
}

function isConflict(error: unknown): boolean {
  return error instanceof RouteError && error.status === 409;
}

// One at a time, because each body can be megabytes and AnkiConnect handles one request at a time.
// Stored here rather than on attach, so an abandoned draft leaves nothing in Anki. Saving
// twice is harmless, since the same bytes keep the same name.
async function storeAttachments(): Promise<ReadonlyMap<string, string>> {
  const stored: [requested: string, used: string][] = [];
  try {
    for (const { filename, blob } of attachments) {
      stored.push([filename, await storeMedia(filename, blob)]);
    }
  } catch (error) {
    throw new Error(`Not saved: storing media failed. ${errorMessage(error)}`);
  }
  return new Map(stored);
}

// Once added, `held` is the new note, so the next save updates it rather than adding another.
async function add(options: { allowDuplicate: boolean }) {
  if (held !== undefined || blocker !== undefined) return;
  saving = { kind: 'sending' };
  try {
    onsaved?.(await addNote(fieldsWith(await storeAttachments()), options));
    saving = { kind: 'added' };
  } catch (error) {
    const message = errorMessage(error);
    saving = isConflict(error) ? { kind: 'duplicate', message } : { kind: 'failed', message };
  }
}

async function save() {
  if (held === undefined || blocker !== undefined) return;
  const note = held;
  saving = { kind: 'sending' };
  try {
    const storedAs = await storeAttachments();
    onsaved?.(await saveNote(note, changedFields(note.fields, fieldsWith(storedAs))));
    saving = { kind: 'saved' };
  } catch (error) {
    const message = errorMessage(error);
    saving = isConflict(error) ? { kind: 'stale', message } : { kind: 'failed', message };
  }
}

async function loadAgain() {
  try {
    await onloadagain?.();
  } catch (error) {
    saving = { kind: 'failed', message: errorMessage(error) };
  }
}

function onkeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
  event.preventDefault();
  if (saving.kind === 'reviewing') save();
  else submit();
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
  aria-label="Save"
  class="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white py-4"
>
  {#if saving.kind === 'reviewing' && held !== undefined}
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
    <button type="button" onclick={() => (saving = { kind: 'idle' })}>Cancel</button>
  {:else}
    <button
      type="button"
      class="button-primary"
      disabled={blocker !== undefined || saving.kind === 'sending'}
      title={blocker}
      onclick={submit}
    >
      {held === undefined ? 'Add to deck' : 'Save'}
    </button>
    <kbd>⌘↵</kbd>
    {#if saving.kind === 'added' || saving.kind === 'saved'}
      <p>{saving.kind === 'added' ? 'Added to the deck.' : 'Saved to Anki.'}</p>
      <!-- Focused, so Enter is all the next word takes. -->
      <button type="button" {@attach focus} onclick={onnextcard}>Next word</button>
    {:else if saving.kind === 'duplicate'}
      <!-- Not focused, so adding a second note with the same Hebrew always takes a click. -->
      <p role="alert" class="text-red-700">
        {saving.message}
        Add this one anyway if it is another word spelled the same.
      </p>
      <button type="button" onclick={() => add({ allowDuplicate: true })}>Add anyway</button>
    {:else if saving.kind === 'stale'}
      <p role="alert" class="text-red-700">
        {saving.message}
        Load it again to see Anki's version, which replaces your changes here.
      </p>
      <button type="button" onclick={loadAgain}>Load again</button>
    {:else if saving.kind === 'failed'}
      <p role="alert" class="text-red-700">{saving.message}</p>
    {:else if inputsBlocker !== undefined}
      <p class="text-gray-600">{inputsBlocker}</p>
    {:else if blocker === NOTHING_CHANGED}
      <p class="text-gray-600">{NOTHING_CHANGED}</p>
    {/if}
  {/if}
</section>
