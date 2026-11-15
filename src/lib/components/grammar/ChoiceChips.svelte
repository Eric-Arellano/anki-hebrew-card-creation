<script lang="ts" generics="T extends string">
import { type Held, textChange } from '#lib/card/changed-from.ts';
import ChangedFrom from '../ui/ChangedFrom.svelte';
import WiktionaryHas from '../ui/WiktionaryHas.svelte';
import UnofferedValue from './UnofferedValue.svelte';

let {
  legend,
  name,
  options,
  value = $bindable(),
  held,
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
  // '' when unchosen.
  held?: Held<T | ''>;
  // Options the dictionary suggests, marked but never chosen.
  suggested?: readonly T[];
  // What the dictionary has where a note holds something else, offered beside the options.
  offered?: readonly T[];
  // What a loaded note holds that no option is, shown until the human chooses.
  unoffered?: string;
} = $props();

const errorId = $props.id();
const shownUnoffered = $derived(value === undefined ? unoffered : undefined);
// Compared by label, which is what the marker shows.
const change = $derived(
  held === undefined ? undefined : textChange(labelOf(held), labelOf(value ?? '')),
);

function labelOf(option: T | ''): string {
  return options.find((each) => each.value === option)?.label ?? option;
}
</script>

<div class="grid gap-1">
  <ChangedFrom label={legend} {change} onrestore={() => (value = held === '' ? undefined : held)}>
    <fieldset
      class="flex flex-wrap items-center gap-2"
      aria-describedby={shownUnoffered === undefined ? undefined : errorId}
    >
      <legend class="required-mark mb-1">{legend}</legend>
      {#each options as option (option.value)}
        {@const isSuggested = suggested.includes(option.value)}
        <label
          class={[
            'chip cursor-pointer has-checked:border-blue-600 has-checked:bg-blue-600 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-blue-400/40',
            isSuggested && 'border-dashed border-blue-600',
          ]}
          title={isSuggested ? 'Suggested by Wiktionary' : undefined}
        >
          <input
            type="radio"
            class="sr-only"
            {name}
            value={option.value}
            required
            bind:group={value}
          >
          {option.label}
        </label>
      {/each}
      {#if shownUnoffered !== undefined}
        <UnofferedValue id={errorId} value={shownUnoffered} />
      {/if}
    </fieldset>
  </ChangedFrom>
  {#if offered.length > 0}
    <WiktionaryHas
      label={legend}
      lang="en"
      options={offered}
      {labelOf}
      isChosen={(option) => option === value}
      onchoose={(option) => (value = option)}
    />
  {/if}
</div>
