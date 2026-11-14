<script lang="ts">
import { blankExample, type Example, isBlankExample } from '#lib/card/examples.ts';

let {
  examples = $bindable(),
  labelledBy,
  describedBy,
  word,
  withoutWord,
}: {
  examples: Example[];
  labelledBy: string;
  describedBy: string | undefined;
  // The word without niqqud, which the examples should use.
  word: string;
  // The index of each row whose Hebrew uses no form of the word.
  withoutWord: readonly number[];
} = $props();

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
        <!-- The Hebrew and its English sit side by side, and stack on a phone. -->
        <div class="grid min-w-0 flex-1 gap-1 sm:grid-cols-2 sm:gap-2">
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
          <input
            class="text-base sm:text-xl"
            lang="en"
            aria-label="Example {number} in English"
            placeholder="English"
            bind:value={example.english}
          >
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
        <p id="example-{index}-without-word" class="hint text-amber-700" aria-live="polite">
          No form of <bdi lang="he">{word}</bdi>
        </p>
      {/if}
    </div>
  {/each}
  <button
    type="button"
    class="justify-self-start text-sm"
    onclick={() => (examples = [...examples, blankExample()])}
  >
    + Another example
  </button>
</fieldset>
