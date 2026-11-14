<script lang="ts">
import { isSamePointedText } from '#lib/hebrew/normalize.ts';
import WiktionaryHas from './WiktionaryHas.svelte';

let {
  label,
  lang,
  required = true,
  takesFocus = false,
  value = $bindable(),
  choices = [],
  onchoose,
  oninput,
}: {
  label: string;
  lang: 'he' | 'en';
  required?: boolean;
  takesFocus?: boolean;
  value: string;
  // Values the dictionary offers when it has more than one, or one that differs from a note's.
  choices?: readonly string[];
  // Called after a choice fills the input, for an input whose choice fills another input too.
  onchoose?: (choice: string) => void;
  // Called when the human types, but not when a choice or the dictionary fills the input.
  oninput?: () => void;
} = $props();

function focus(element: HTMLElement) {
  element.focus();
}

function choose(choice: string) {
  value = choice;
  onchoose?.(choice);
}
</script>

<div class="grid content-start gap-1">
  <label class="grid gap-1">
    <span class={{ 'required-mark': required }}>{label}</span>
    <input
      class="text-2xl"
      {lang}
      dir={lang === 'he' ? 'rtl' : 'ltr'}
      {required}
      {@attach takesFocus ? focus : undefined}
      bind:value
      {oninput}
    >
  </label>
  {#if choices.length > 0}
    <WiktionaryHas
      {label}
      {lang}
      options={choices}
      isChosen={(choice) => isSamePointedText(value, choice)}
      onchoose={choose}
    />
  {/if}
</div>
