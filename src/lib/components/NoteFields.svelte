<script lang="ts">
import { type FieldKey, type FieldValues, FIELDS, type ShownFieldGroup } from '#lib/note-type.ts';

let {
  groups,
  suggestions,
  edits,
  onedit,
  onreset,
}: {
  groups: ShownFieldGroup[];
  suggestions: FieldValues;
  // Only the fields the human has edited, which no suggestion overwrites.
  edits: FieldValues;
  onedit: (field: FieldKey, value: string) => void;
  onreset: (field: FieldKey) => void;
} = $props();
</script>

{#each groups as { group, fields } (group)}
  <div class="grid gap-x-6 gap-y-2 border-t border-gray-100 pt-4 md:grid-cols-[7rem_1fr]">
    <h3 class="text-gray-600">{group}</h3>
    <!-- Two columns pair a variant's prompt with its answer. -->
    <div class="grid gap-4 sm:grid-cols-2">
      {#each fields as field (field)}
        {@const fieldName = FIELDS[field].name}
        {@const edit = edits[field]}
        {@const suggestion = suggestions[field] ?? ''}
        <div class="grid content-start gap-1">
          <label for="field-{field}">{fieldName}</label>
          <!-- `dir="auto"`: some fields hold Hebrew and some English. The value is raw Anki HTML. -->
          <textarea
            id="field-{field}"
            dir="auto"
            rows="2"
            class="font-hebrew text-xl"
            value={edit ?? suggestion}
            oninput={(event) => onedit(field, event.currentTarget.value)}
          ></textarea>
          <!-- Only where there is a suggestion to go back to: clearing a field needs no button. -->
          {#if edit !== undefined && suggestion !== '' && edit !== suggestion}
            <button
              type="button"
              class="justify-self-start text-sm"
              aria-label="Reset {fieldName} to suggestion"
              onclick={() => onreset(field)}
            >
              Use “{suggestion}”
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/each}
