<script lang="ts">
import { listChange } from '#lib/card/change.ts';
import { filledDefinitions } from '#lib/card/inputs.ts';
import ChangedFrom from '../ui/ChangedFrom.svelte';

let {
  definitions = $bindable(),
  held,
}: {
  definitions: string[];
  // What Anki holds, while editing a note, so a change from it is marked.
  held?: readonly string[];
} = $props();

const change = $derived(
  listChange(held && filledDefinitions(held), filledDefinitions(definitions), (meanings) =>
    meanings.join('; '),
  ),
);

// The last row is cleared rather than removed, so there is always one to type in.
function remove(index: number) {
  definitions = definitions.length === 1 ? [''] : definitions.toSpliced(index, 1);
}
</script>

<ChangedFrom label="English meaning" {change} onrestore={() => (definitions = [...(held ?? [''])])}>
  <!-- `grid-cols-1` lets a row shrink below its inputs' intrinsic width, which overflows a phone. -->
  <fieldset class="grid grid-cols-1 content-start gap-2">
    <legend class="required-mark mb-1">English meaning</legend>
    {#each definitions, index}
      {@const label = index === 0 ? 'English meaning' : `English meaning ${index + 1}`}
      <div class="flex items-center gap-2">
        <input
          class="flex-1 text-2xl"
          lang="en"
          aria-label={label}
          required={index === 0}
          bind:value={definitions[index]}
        >
        <button
          type="button"
          class="w-8 shrink-0 px-0"
          aria-label="{definitions.length === 1 ? 'Clear' : 'Remove'} {label}"
          disabled={definitions.length === 1 && definitions[0]?.trim() === ''}
          onclick={() => remove(index)}
        >
          ×
        </button>
      </div>
    {/each}
    <button
      type="button"
      class="justify-self-start text-sm"
      onclick={() => (definitions = [...definitions, ''])}
    >
      + Another meaning
    </button>
  </fieldset>
</ChangedFrom>
