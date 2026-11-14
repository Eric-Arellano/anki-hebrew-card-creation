<script lang="ts">
import { changedFields } from '#lib/anki/changes.ts';
import type { CheckRequest } from '#lib/api/ai.ts';
import { addNote, type LoadedNote, saveNote, storeMedia } from '#lib/api/anki.ts';
import { errorMessage, RouteError } from '#lib/api/http.ts';
import type { NewAttachment } from '#lib/media/attach.ts';
import { fromAnkiFields, type PartOfSpeech } from '#lib/note-type.ts';
import ClaudeCheck from './ClaudeCheck.svelte';

let {
  attachments,
  fieldsWith,
  onnextcard,
  held,
  onsaved,
  onloadagain,
  ankiBlocker,
  inputsBlocker,
  partOfSpeech,
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
  partOfSpeech: PartOfSpeech | undefined;
} = $props();

type Saving =
  | { kind: 'idle' }
  // `check` is the note as Claude is asked to check it.
  | { kind: 'reviewing'; check: CheckRequest }
  // A check the human asked for outside a review, which saves nothing.
  | { kind: 'checked'; check: CheckRequest }
  | { kind: 'sending' }
  | { kind: 'added' }
  | { kind: 'saved' }
  | { kind: 'duplicate'; message: string }
  | { kind: 'stale'; message: string }
  | { kind: 'failed'; message: string };

let saving: Saving = $state.raw({ kind: 'idle' });

// Before storing, a new file goes by the name requested, which is all the review shows of it.
const unstored = $derived(new Map(attachments.map(({ filename }) => [filename, filename])));
const changes = $derived(
  held === undefined ? {} : changedFields(held.fields, fieldsWith(unstored)),
);

const NOTHING_CHANGED = 'Nothing to save: every field reads as Anki holds it.';

const blocker = $derived(
  ankiBlocker ??
    inputsBlocker ??
    (held !== undefined && Object.keys(changes).length === 0 ? NOTHING_CHANGED : undefined),
);

const checks = $derived(partOfSpeech !== undefined);

function noteToCheck(): CheckRequest | undefined {
  return partOfSpeech === undefined
    ? undefined
    : { partOfSpeech, fields: fromAnkiFields(fieldsWith(unstored)) };
}

// Every add and save is reviewed, so Claude checks the note and a save shows what it will change.
// The part of speech is a required input, so a note without a blocker always has a check.
function submit() {
  if (blocker !== undefined || saving.kind === 'sending') return;
  const check = noteToCheck();
  if (check !== undefined) saving = { kind: 'reviewing', check };
}

// Even when nothing changed, so a finished note can be checked again.
function checkNow() {
  const check = noteToCheck();
  if (check !== undefined && saving.kind !== 'sending') saving = { kind: 'checked', check };
}

// Whether or not the check has answered, since it only advises.
function confirm() {
  if (held === undefined) add({ allowDuplicate: false });
  else save();
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
  if (saving.kind === 'reviewing') confirm();
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
    <span class="text-neutral-400">(blank)</span>
  {:else}
    <!-- The HTML itself, since a change in markup alone is a change too. -->
    <code dir="auto" class="break-all whitespace-pre-wrap">{html}</code>
  {/if}
{/snippet}

<section
  aria-label="Save"
  class="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-t-xl border border-b-0 border-neutral-600 border-t-2 border-t-blue-500 bg-neutral-800 p-4 shadow-[0_-8px_24px_-6px_rgb(0_0_0/0.2)]"
>
  {#if saving.kind === 'reviewing'}
    {#if held === undefined}
      <p class="basis-full">Adding this note to the deck.</p>
    {:else}
      <p class="basis-full">Saving changes these fields in Anki:</p>
      <dl class="max-h-[40vh] basis-full space-y-3 overflow-y-auto">
        {#each Object.entries(changes) as [name, after] (name)}
          <div>
            <dt class="font-medium">{name}</dt>
            <dd class="rounded bg-red-950/40 px-2 py-1">
              <span class="text-neutral-400">Before:</span>
              {@render fieldHtml(held.fields[name] ?? '')}
            </dd>
            <dd class="mt-1 rounded bg-green-950/40 px-2 py-1">
              <span class="text-neutral-400">After:</span>
              {@render fieldHtml(after)}
            </dd>
          </div>
        {/each}
      </dl>
    {/if}
    <ClaudeCheck request={saving.check} />
    <!-- Focused, so the Cmd+Enter that opened this step is followed by a deliberate second one. -->
    <button
      type="button"
      class="button-primary"
      disabled={blocker !== undefined}
      {@attach focus}
      onclick={confirm}
    >
      {held === undefined ? 'Add to deck' : 'Save changes'}
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
      {held === undefined ? 'Check and add' : 'Check and save'}
    </button>
    <kbd>⌘↵</kbd>
    {#if checks}
      <button type="button" disabled={saving.kind === 'sending'} onclick={checkNow}>
        Check only
      </button>
    {/if}
    {#if saving.kind === 'checked'}
      {#key saving}
        <ClaudeCheck request={saving.check} />
      {/key}
    {:else if saving.kind === 'added' || saving.kind === 'saved'}
      <p>{saving.kind === 'added' ? 'Added to the deck.' : 'Saved to Anki.'}</p>
      <!-- Focused, so Enter is all the next word takes. -->
      <button type="button" {@attach focus} onclick={onnextcard}>Next word</button>
    {:else if saving.kind === 'duplicate'}
      <!-- Not focused, so adding a second note with the same Hebrew always takes a click. -->
      <p role="alert" class="text-red-400">
        {saving.message}
        Add this one anyway if it is another word spelled the same.
      </p>
      <button type="button" onclick={() => add({ allowDuplicate: true })}>Add anyway</button>
    {:else if saving.kind === 'stale'}
      <p role="alert" class="text-red-400">
        {saving.message}
        Load it again to see Anki's version, which replaces your changes here.
      </p>
      <button type="button" onclick={loadAgain}>Load again</button>
    {:else if saving.kind === 'failed'}
      <p role="alert" class="text-red-400">{saving.message}</p>
    {:else if inputsBlocker !== undefined}
      <p class="text-neutral-400">{inputsBlocker}</p>
    {:else if blocker === NOTHING_CHANGED}
      <p class="text-neutral-400">{NOTHING_CHANGED}</p>
    {:else if held !== undefined && Object.keys(changes).length > 0}
      <p class="text-neutral-400">Will change: {Object.keys(changes).join(', ')}</p>
    {/if}
  {/if}
</section>
