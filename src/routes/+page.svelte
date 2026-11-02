<script lang="ts">
import CardEditor from '#lib/components/CardEditor.svelte';

let card = $state(0);
</script>

<svelte:head>
  <title>Hebrew card helper</title>
</svelte:head>

<!-- Remounted for each card, so no input, attachment or message of the last one can carry over,
     including state added later. It also rechecks Anki, which may have closed since. -->
{#key card}
  <CardEditor onnextcard={() => (card += 1)} />
{/key}
