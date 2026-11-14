<script lang="ts">
import { removedRows, textChange } from '#lib/card/changed-from.ts';
import { blankExample, type Example, isBlankExample } from '#lib/card/examples.ts';
import ChangedFrom from '../ui/ChangedFrom.svelte';
import RemovedRow from '../ui/RemovedRow.svelte';

let {
  examples = $bindable(),
  held,
  labelledBy,
  describedBy,
  word,
  withoutWord,
}: {
  examples: Example[];
  // What Anki holds, while editing a note, so each change from it is marked, row by row.
  held: readonly Example[] | undefined;
  labelledBy: string;
  describedBy: string | undefined;
  // The word without niqqud, which the examples should use.
  word: string;
  // The index of each row whose Hebrew uses no form of the word.
  withoutWord: readonly number[];
} = $props();

// Up to and including the row at `index`, so it lands back at its own index.
function restoreThrough(index: number) {
  examples = [
    ...examples,
    ...(held ?? []).slice(examples.length, index + 1).map((example) => ({ ...example })),
  ];
}

// The last row is cleared rather than removed, so there is always one to type in.
function remove(index: number) {
  examples = examples.length === 1 ? [blankExample()] : examples.toSpliced(index, 1);
}
</script>

<!-- `grid-cols-1` lets a row shrink below its inputs' intrinsic width, which overflows a phone. -->
<fieldset
  aria-labelledby={labelledBy}
  aria-describedby={describedBy}
  class="grid grid-cols-1 gap-3 sm:gap-2"
>
  {#each examples as example, index (example)}
    {@const number = index + 1}
    <div class="grid grid-cols-1 gap-1">
      <div class="flex items-start gap-2">
        <!-- The Hebrew and its English sit side by side, and stack on a phone. The gap leaves
             room for a marker's edge, which sits in a negative margin. -->
        <div class="grid min-w-0 flex-1 gap-1 sm:grid-cols-2 sm:gap-3">
          <ChangedFrom
            label="Example {number} in Hebrew"
            lang="he"
            change={textChange(held && (held[index]?.hebrew ?? ''), example.hebrew)}
            onrestore={() => (example.hebrew = held?.[index]?.hebrew ?? '')}
          >
            <input
              class="font-hebrew text-xl"
              lang="he"
              dir="rtl"
              aria-label="Example {number} in Hebrew"
              placeholder="Hebrew"
              aria-describedby={withoutWord.includes(index)
                ? `example-${index}-without-word`
                : undefined}
              bind:value={example.hebrew}
            >
          </ChangedFrom>
          <ChangedFrom
            label="Example {number} in English"
            lang="en"
            change={textChange(held && (held[index]?.english ?? ''), example.english)}
            onrestore={() => (example.english = held?.[index]?.english ?? '')}
          >
            <input
              class="text-base sm:text-xl"
              lang="en"
              aria-label="Example {number} in English"
              placeholder="English"
              bind:value={example.english}
            >
          </ChangedFrom>
        </div>
        <button
          type="button"
          class="w-8 shrink-0 self-center px-0"
          aria-label="{examples.length === 1 ? 'Clear' : 'Remove'} example {number}"
          disabled={examples.length === 1 && isBlankExample(example)}
          onclick={() => remove(index)}
        >
          ×
        </button>
      </div>
      {#if withoutWord.includes(index)}
        <p id="example-{index}-without-word" class="hint text-amber-400" aria-live="polite">
          No form of <bdi lang="he">{word}</bdi>
        </p>
      {/if}
    </div>
  {/each}
  {#each removedRows(held, examples, isBlankExample) as { index, row } (index)}
    <RemovedRow label="example {index + 1}" onrestore={() => restoreThrough(index)}>
      <bdi lang="he">{row.hebrew}</bdi>
      — <bdi lang="en">{row.english}</bdi>
    </RemovedRow>
  {/each}
  <button
    type="button"
    class="justify-self-start text-sm"
    onclick={() => (examples = [...examples, blankExample()])}
  >
    + Another example
  </button>
</fieldset>
