<script lang="ts">
import type { Snippet } from 'svelte';
import type { Change } from '#lib/card/change.ts';

let {
  label,
  change,
  quoted = true,
  onrestore,
  children,
}: {
  // The input's own label, naming what Restore puts back.
  label: string;
  change: Change | undefined;
  // Off where what it was is a count, not a value.
  quoted?: boolean;
  onrestore: () => void;
  children: Snippet;
} = $props();

const EDGE = {
  added: 'border-green-500',
  changed: 'border-blue-500',
  cleared: 'border-red-500',
} satisfies Record<Change['kind'], string>;
</script>

<!-- The edge sits in a negative margin, so marking a value never shifts the input. `grid-cols-1`
     lets what it wraps shrink below its intrinsic width, as a phone needs. -->
<div
  class={[
    'grid grid-cols-1 gap-1 border-s-2 -ms-2.5 ps-2',
    change ? EDGE[change.kind] : 'border-transparent',
  ]}
>
  {@render children()}
  {#if change !== undefined}
    <p class="hint">
      {#if change.kind === 'added'}
        Added
      {:else}
        {change.kind === 'cleared' ? 'Cleared. Was' : 'Was'}
        {#if quoted}
          “<bdi class="break-words">{change.was}</bdi>” ·
        {:else}
          {change.was}
          ·
        {/if}
        <button
          type="button"
          class="link border-0 bg-transparent p-0 hover:bg-transparent"
          aria-label="Restore {label}"
          onclick={onrestore}
        >
          Restore
        </button>
      {/if}
    </p>
  {/if}
</div>
