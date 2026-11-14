<script lang="ts">
import type { Snippet } from 'svelte';

let {
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: Snippet;
  children: Snippet;
} = $props();

const id = $props.id();
</script>

<section
  aria-labelledby="{id}-title"
  class="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
>
  <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
    <div class="space-y-1">
      <h2 id="{id}-title">{title}</h2>
      {#if description !== undefined}
        <p class="hint">{description}</p>
      {/if}
    </div>
    {#if actions !== undefined}
      <div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
    {/if}
  </div>
  {@render children()}
</section>
