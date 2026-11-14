<script lang="ts">
import { removedRows, textChange } from '#lib/card/changed-from.ts';
import ChangedFrom from '../ui/ChangedFrom.svelte';
import RemovedRow from '../ui/RemovedRow.svelte';

let {
  definitions = $bindable(),
  held,
}: {
  definitions: string[];
  // What Anki holds, while editing a note, so each change from it is marked, meaning by meaning.
  held?: readonly string[];
} = $props();

function isBlank(meaning: string) {
  return meaning.trim() === '';
}

function labelAt(index: number) {
  return index === 0 ? 'English meaning' : `English meaning ${index + 1}`;
}

// Up to and including the meaning at `index`, so it lands back at its own index.
function restoreThrough(index: number) {
  definitions = [...definitions, ...(held ?? []).slice(definitions.length, index + 1)];
}

// The last row is cleared rather than removed, so there is always one to type in.
function remove(index: number) {
  definitions = definitions.length === 1 ? [''] : definitions.toSpliced(index, 1);
}
</script>

<!-- `grid-cols-1` lets a row shrink below its inputs' intrinsic width, which overflows a phone. -->
<fieldset class="grid grid-cols-1 content-start gap-2">
  <legend class="required-mark mb-1">English meaning</legend>
  {#each definitions, index}
    {@const label = labelAt(index)}
    <ChangedFrom
      {label}
      lang="en"
      change={textChange(held && (held[index] ?? ''), definitions[index] ?? '')}
      onrestore={() => (definitions[index] = held?.[index] ?? '')}
    >
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
    </ChangedFrom>
  {/each}
  {#each removedRows(held, definitions, isBlank) as { index, row } (index)}
    <RemovedRow label={labelAt(index)} onrestore={() => restoreThrough(index)}>
      “<bdi lang="en">{row}</bdi>”
    </RemovedRow>
  {/each}
  <button
    type="button"
    class="justify-self-start text-sm"
    onclick={() => (definitions = [...definitions, ''])}
  >
    + Another meaning
  </button>
</fieldset>
