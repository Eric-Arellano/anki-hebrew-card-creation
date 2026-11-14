<script lang="ts">
import type { LoadedNote } from '#lib/api/anki.ts';
import CardEditor from '#lib/components/CardEditor.svelte';

let card = $state(0);
// The note the current card edits, or `undefined` for a new one.
let note: LoadedNote | undefined = $state.raw();

function start(next: LoadedNote | undefined) {
  note = next;
  card += 1;
}
</script>

<svelte:head>
  <title>Hebrew card helper</title>
</svelte:head>

<!-- Remounted for each card, so no input, attachment or message of the last one can carry over,
     including state added later. It also rechecks Anki, which may have closed since. A loaded
     note is a card too, so the editor reads it once, as its starting draft. -->
{#key card}
  <CardEditor {note} onnextcard={() => start(undefined)} onopennote={start} />
{/key}
