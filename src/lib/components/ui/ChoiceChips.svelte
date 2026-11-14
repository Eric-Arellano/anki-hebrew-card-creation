<script lang="ts" generics="T extends string">
import UnofferedValue from './UnofferedValue.svelte';
import WiktionaryHas from './WiktionaryHas.svelte';

let {
  legend,
  name,
  options,
  value = $bindable(),
  suggested = [],
  offered = [],
  unoffered,
}: {
  legend: string;
  // Distinguishes this group's radios from any other group's on the page.
  name: string;
  options: readonly { value: T; label: string }[];
  // `undefined` until the human chooses, so nothing is chosen for them.
  value: T | undefined;
  // Options the dictionary suggests, marked but never chosen.
  suggested?: readonly T[];
  // What the dictionary has where a note holds something else, offered beside the options.
  offered?: readonly T[];
  // What a loaded note holds that no option is, shown until the human chooses.
  unoffered?: string;
} = $props();

const errorId = $props.id();
const shownUnoffered = $derived(value === undefined ? unoffered : undefined);
</script>

<div class="grid gap-1">
  <fieldset
    class="flex flex-wrap items-center gap-2"
    aria-describedby={shownUnoffered === undefined ? undefined : errorId}
  >
    <legend class="required-mark mb-1">{legend}</legend>
    {#each options as option (option.value)}
      {@const isSuggested = suggested.includes(option.value)}
      <label
        class={[
          'chip cursor-pointer has-checked:border-blue-700 has-checked:bg-blue-700 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-blue-600/30',
          isSuggested && 'border-dashed border-blue-700',
        ]}
        title={isSuggested ? 'Suggested by Wiktionary' : undefined}
      >
        <input type="radio" class="sr-only" {name} value={option.value} required bind:group={value}>
        {option.label}
      </label>
    {/each}
    {#if shownUnoffered !== undefined}
      <UnofferedValue id={errorId} value={shownUnoffered} />
    {/if}
  </fieldset>
  {#if offered.length > 0}
    <WiktionaryHas
      label={legend}
      lang="en"
      options={offered}
      labelOf={(option) => options.find((each) => each.value === option)?.label ?? option}
      isChosen={(option) => option === value}
      onchoose={(option) => (value = option)}
    />
  {/if}
</div>
