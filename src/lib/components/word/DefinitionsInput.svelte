<script lang="ts">
import {
  type Held,
  removedRows,
  restoredThrough,
  textChange,
  withoutRow,
} from '#lib/card/changed-from.ts';
import { blankMeaning, isBlankMeaning, type Meaning } from '#lib/card/definitions.ts';
import ChangedFrom from '../ui/ChangedFrom.svelte';
import RemovedRow from '../ui/RemovedRow.svelte';

let {
  definitions = $bindable(),
  held,
}: {
  definitions: Meaning[];
  // Marked meaning by meaning.
  held?: Held<readonly Meaning[]>;
} = $props();

function labelAt(index: number) {
  return index === 0 ? 'English meaning' : `English meaning ${index + 1}`;
}

// A copy, since a restored row's input writes into it.
function restoreThrough(index: number) {
  definitions = restoredThrough(definitions, held, index, (meaning) => ({ ...meaning }));
}
</script>

<!-- `grid-cols-1` lets a row shrink below its inputs' intrinsic width, which overflows a phone. -->
<fieldset class="grid grid-cols-1 content-start gap-2">
  <legend class="required-mark mb-1">English meaning</legend>
  {#each definitions as meaning, index (meaning)}
    {@const label = labelAt(index)}
    <ChangedFrom
      {label}
      lang="en"
      change={textChange(held && (held[index]?.english ?? ''), meaning.english)}
      onrestore={() => (meaning.english = held?.[index]?.english ?? '')}
    >
      <div class="flex items-center gap-2">
        <input
          class="flex-1 text-2xl"
          lang="en"
          aria-label={label}
          required={index === 0}
          bind:value={meaning.english}
        >
        <button
          type="button"
          class="w-8 shrink-0 px-0"
          aria-label="{definitions.length === 1 ? 'Clear' : 'Remove'} {label}"
          disabled={definitions.length === 1 && isBlankMeaning(meaning)}
          onclick={() => (definitions = withoutRow(definitions, index, blankMeaning))}
        >
          ×
        </button>
      </div>
    </ChangedFrom>
  {/each}
  {#each removedRows(held, definitions, isBlankMeaning) as { index, row } (index)}
    <RemovedRow label={labelAt(index)} onrestore={() => restoreThrough(index)}>
      “<bdi lang="en">{row.english}</bdi>”
    </RemovedRow>
  {/each}
  <button
    type="button"
    class="justify-self-start text-sm"
    onclick={() => (definitions = [...definitions, blankMeaning()])}
  >
    + Another meaning
  </button>
</fieldset>
