<script lang="ts">
let {
  label,
  checked = $bindable(),
}: {
  label: string;
  checked: boolean;
} = $props();
</script>

<!-- The native input stays, for the keyboard and screen readers, but draws only the box; the check
     mark is drawn over it. -->
<label class="flex w-fit cursor-pointer items-center gap-2">
  <span class="relative grid shrink-0 place-items-center">
    <input
      type="checkbox"
      class="peer size-5 cursor-pointer appearance-none rounded border-2 border-neutral-500 bg-neutral-900 p-0 hover:border-neutral-400 checked:border-blue-600 checked:bg-blue-600 checked:hover:border-blue-500 checked:hover:bg-blue-500"
      bind:checked
    >
    <svg
      class="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  </span>
  {label}
</label>
