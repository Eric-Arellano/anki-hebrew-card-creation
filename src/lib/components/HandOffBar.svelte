<script lang="ts">
import { openAddWindow, storeMedia } from '#lib/api/anki.ts';
import { errorMessage } from '#lib/api/http.ts';
import type { NewAttachment } from '#lib/media/attach.ts';

let {
  attachments,
  fieldsWith,
  onnextcard,
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
  // Why Anki can't take the note yet. The header already shows it, so here it is only a tooltip.
  ankiBlocker: string | undefined;
  // Which inputs are still blank, spelled out in the bar.
  inputsBlocker: string | undefined;
} = $props();

type HandOff =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'opening' }
  | { kind: 'opened' }
  | { kind: 'failed'; message: string };

let handOff: HandOff = $state.raw({ kind: 'idle' });

const blocker = $derived(ankiBlocker ?? inputsBlocker);

// `guiAddCards` replaces Anki's Add window and discards whatever the human typed there, so every
// hand-off asks first.
function askToHandOff() {
  if (blocker === undefined) handOff = { kind: 'confirming' };
}

// One at a time, because each body can be megabytes and AnkiConnect handles one request at a time.
// Stored here rather than on attach, so an abandoned draft leaves nothing in Anki. Handing off
// twice is harmless, since the same bytes keep the same name.
async function storeAttachments(): Promise<ReadonlyMap<string, string>> {
  const stored: [requested: string, used: string][] = [];
  try {
    for (const { filename, blob } of attachments) {
      stored.push([filename, await storeMedia(filename, blob)]);
    }
  } catch (error) {
    throw new Error(`Add window not opened: storing media failed. ${errorMessage(error)}`);
  }
  return new Map(stored);
}

async function handOffToAnki() {
  handOff = { kind: 'opening' };
  try {
    await openAddWindow(fieldsWith(await storeAttachments()));
    handOff = { kind: 'opened' };
  } catch (error) {
    handOff = { kind: 'failed', message: errorMessage(error) };
  }
}

function onkeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
  event.preventDefault();
  askToHandOff();
}

function focus(element: HTMLElement) {
  element.focus();
}
</script>

<svelte:window {onkeydown} />

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
  {:else}
    <button
      type="button"
      class="button-primary"
      disabled={blocker !== undefined || handOff.kind === 'opening'}
      title={blocker}
      onclick={askToHandOff}
    >
      Open in Anki
    </button>
    <kbd>⌘↵</kbd>
    {#if handOff.kind === 'opened'}
      <p>Opened in Anki. Click Add there.</p>
      <!-- Focused, so coming back from Anki, Enter is all the next word takes. -->
      <button type="button" {@attach focus} onclick={onnextcard}>Next word</button>
    {:else if handOff.kind === 'failed'}
      <p role="alert" class="text-red-700">{handOff.message}</p>
    {:else if inputsBlocker !== undefined}
      <p class="text-gray-600">{inputsBlocker}</p>
    {/if}
  {/if}
</section>
