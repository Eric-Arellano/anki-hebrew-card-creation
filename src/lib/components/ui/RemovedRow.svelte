<script lang="ts">
import type { Snippet } from 'svelte';

let {
  label,
  onrestore,
  children,
}: {
  // Names the row Restore puts back.
  label: string;
  onrestore: () => void;
  // The row as Anki holds it.
  children: Snippet;
} = $props();
</script>

<!-- Edged like a cleared value in `ChangedFrom`, which the rows above it are marked with. -->
<p class="hint -ms-2.5 border-s-2 border-red-500 ps-2">
  Removed: {@render children()} ·
  <button
    type="button"
    class="link border-0 bg-transparent p-0 hover:bg-transparent"
    aria-label="Restore {label}"
    onclick={onrestore}
  >
    Restore
  </button>
</p>
