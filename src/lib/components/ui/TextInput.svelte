<script lang="ts">
import { textChange } from '#lib/card/change.ts';
import { isSamePointedText } from '#lib/hebrew/normalize.ts';
import ChangedFrom from './ChangedFrom.svelte';
import WiktionaryHas from './WiktionaryHas.svelte';

let {
  label,
  lang,
  required = true,
  takesFocus = false,
  value = $bindable(),
  held,
  choices = [],
  onchoose,
  oninput,
}: {
  label: string;
  lang: 'he' | 'en';
  required?: boolean;
  takesFocus?: boolean;
  value: string;
  // What Anki holds, while editing a note, so a change from it is marked.
  held?: string;
  // Values the dictionary offers when it has more than one, or one that differs from a note's.
  choices?: readonly string[];
  // Called after a choice fills the input, for an input whose choice fills another input too.
  onchoose?: (choice: string) => void;
  // Called when the human types or restores, but not when a choice or the dictionary fills it.
  oninput?: () => void;
} = $props();

function focus(element: HTMLElement) {
  element.focus();
}

function restore() {
  if (held === undefined) return;
  value = held;
  oninput?.();
}

function choose(choice: string) {
  value = choice;
  onchoose?.(choice);
}
</script>

<div class="grid content-start gap-1">
  <ChangedFrom {label} {lang} change={textChange(held, value)} onrestore={restore}>
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
  </ChangedFrom>
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
