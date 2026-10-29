<script lang="ts" generics="T extends string">
let {
  legend,
  name,
  options,
  value = $bindable(),
}: {
  legend: string;
  // Distinguishes this group's radios from any other group's on the page.
  name: string;
  options: readonly { value: T; label: string }[];
  // `undefined` until the human chooses, so nothing is chosen for them.
  value: T | undefined;
} = $props();
</script>

<fieldset class="flex flex-wrap items-center gap-2">
  <legend class="required-mark mb-1">{legend}</legend>
  {#each options as option (option.value)}
    <label
      class="chip cursor-pointer has-checked:border-blue-700 has-checked:bg-blue-700 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-blue-600/30"
    >
      <input type="radio" class="sr-only" {name} value={option.value} required bind:group={value}>
      {option.label}
    </label>
  {/each}
</fieldset>
