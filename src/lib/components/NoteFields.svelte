<script lang="ts">
import type { ShownFieldGroup } from '#lib/note-type.ts';

let {
  groups,
  suggestions,
  edits,
  onedit,
  onreset,
}: {
  groups: ShownFieldGroup[];
  suggestions: Record<string, string>;
  // Only the fields I've edited, which no suggestion overwrites.
  edits: Record<string, string>;
  onedit: (fieldName: string, value: string) => void;
  onreset: (fieldName: string) => void;
} = $props();
</script>

{#each groups as { group, fieldNames }, groupIndex (group)}
  <div class="grid gap-x-6 gap-y-2 border-t border-gray-100 pt-4 md:grid-cols-[7rem_1fr]">
    <h3 class="text-gray-600">{group}</h3>
    <!-- Two columns pair a variant's prompt with its answer. -->
    <div class="grid gap-4 sm:grid-cols-2">
      {#each fieldNames as fieldName, index (fieldName)}
        {@const edit = edits[fieldName]}
        {@const suggestion = suggestions[fieldName] ?? ''}
        <div class="grid content-start gap-1">
          <label for="field-{groupIndex}-{index}">{fieldName}</label>
          <!-- `dir="auto"`: some fields hold Hebrew and some English. The value is raw Anki HTML. -->
          <textarea
            id="field-{groupIndex}-{index}"
            dir="auto"
            rows="2"
            class="font-hebrew text-xl"
            value={edit ?? suggestion}
            oninput={(event) => onedit(fieldName, event.currentTarget.value)}
          ></textarea>
          <!-- Only where there is a suggestion to go back to: clearing a field needs no button. -->
          {#if edit !== undefined && suggestion !== '' && edit !== suggestion}
            <button
              type="button"
              class="justify-self-start text-sm"
              aria-label="Reset {fieldName} to suggestion"
              onclick={() => onreset(fieldName)}
            >
              Use “{suggestion}”
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/each}
