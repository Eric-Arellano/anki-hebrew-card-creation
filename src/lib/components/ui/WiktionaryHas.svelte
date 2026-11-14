<script lang="ts" generics="T extends string">
let {
  label,
  lang,
  options,
  labelOf = (option) => option,
  isChosen,
  onchoose,
}: {
  // The input's own label, naming the group for a screen reader.
  label: string;
  lang: 'he' | 'en';
  options: readonly T[];
  labelOf?: (option: T) => string;
  isChosen: (option: T) => boolean;
  onchoose: (option: T) => void;
} = $props();
</script>

<fieldset class="flex flex-wrap items-center gap-1">
  <legend class="sr-only">Choices for {label}</legend>
  <span class="hint" aria-hidden="true">Wiktionary has</span>
  {#each options as option (option)}
    <button
      type="button"
      class={[
        'chip px-2 py-0 aria-pressed:border-blue-700 aria-pressed:bg-blue-700 aria-pressed:text-white',
        lang === 'he' ? 'text-lg' : 'text-sm',
      ]}
      {lang}
      aria-pressed={isChosen(option)}
      onclick={() => onchoose(option)}
    >
      {labelOf(option)}
    </button>
  {/each}
</fieldset>
