<script lang="ts">
let {
  label,
  lang,
  required = true,
  value = $bindable(),
  choices = [],
  onchoose,
  oninput,
}: {
  label: string;
  lang: 'he' | 'en';
  required?: boolean;
  value: string;
  // Values the dictionary offers when it has more than one, for the human to choose between.
  choices?: readonly string[];
  // Called after a choice fills the input, for an input whose choice fills another input too.
  onchoose?: (choice: string) => void;
  // Called when the human types, but not when a choice or the dictionary fills the input.
  oninput?: () => void;
} = $props();

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
      bind:value
      {oninput}
    >
  </label>
  {#if choices.length > 0}
    <fieldset class="flex flex-wrap items-center gap-1">
      <legend class="sr-only">Choices for {label}</legend>
      <span class="hint" aria-hidden="true">Wiktionary has</span>
      {#each choices as choice (choice)}
        <button
          type="button"
          class="chip text-lg aria-pressed:border-blue-700 aria-pressed:bg-blue-700 aria-pressed:text-white"
          {lang}
          aria-pressed={value === choice}
          onclick={() => choose(choice)}
        >
          {choice}
        </button>
      {/each}
    </fieldset>
  {/if}
</div>
