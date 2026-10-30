<script lang="ts">
import { openAddWindow } from '#lib/api/anki.ts';
import { errorMessage } from '#lib/api/http.ts';

let {
  fields,
  ankiBlocker,
  inputsBlocker,
}: {
  // Keyed by Anki field name, as `/api/anki/add` takes them.
  fields: Record<string, string>;
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

async function handOffToAnki() {
  handOff = { kind: 'opening' };
  try {
    await openAddWindow(fields);
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
      <p>Opened in Anki. Finish the note there and click Add.</p>
    {:else if handOff.kind === 'failed'}
      <p role="alert" class="text-red-700">{handOff.message}</p>
    {:else if inputsBlocker !== undefined}
      <p class="text-gray-600">{inputsBlocker}</p>
    {/if}
  {/if}
</section>
