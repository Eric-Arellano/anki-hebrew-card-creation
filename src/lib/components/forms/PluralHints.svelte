<script lang="ts">
import { pluralHints } from '#lib/card/checks/plural-hints.ts';
import type { NounDraft } from '#lib/card/parts-of-speech/noun.ts';
import { includesPointedText } from '#lib/hebrew/normalize.ts';
import type { IrregularPlural } from '#lib/hebrew/plural.ts';
import { type FieldKey, type FieldValues, VARIANT_ANSWERS } from '#lib/note-type.ts';

const REASONS = {
  'masculine-with-ot': 'a masculine noun, but its plural ends in ־ות',
  'feminine-with-im': 'a feminine noun, but its plural ends in ־ים',
  'changed-stem': 'its plural changes the word itself',
} satisfies Record<IrregularPlural, string>;

// Each variant's answer field, and the number the editor's labels give it.
const ANSWER_FIELDS = Object.values(VARIANT_ANSWERS).map((field, index) => ({
  field,
  number: index + 1,
}));

let {
  noun,
  pointed,
  edits,
  shownFields,
  onuse,
}: {
  noun: NounDraft;
  pointed: string;
  edits: FieldValues;
  // A hidden variant is never offered.
  shownFields: readonly FieldKey[];
  onuse: (field: FieldKey, answer: string) => void;
} = $props();

const hints = $derived(pluralHints(noun, pointed));
const variants = $derived(
  ANSWER_FIELDS.filter(({ field }) => shownFields.includes(field)).map((variant) => ({
    ...variant,
    answer: edits[variant.field] ?? '',
  })),
);
const freeVariant = $derived(variants.find((variant) => variant.answer.trim() === ''));
</script>

{#each hints as hint (hint.plural)}
  {@const usedBy = variants.find((variant) => includesPointedText(variant.answer, hint.plural))}
  <section aria-label="Irregular plural" class="space-y-2 rounded-lg bg-amber-50 px-4 py-3">
    <p>
      <bdi lang="he" class="text-xl">{hint.plural}</bdi>
      is irregular: {REASONS[hint.reason]}. It may deserve a variant card.
    </p>
    {#if usedBy !== undefined}
      <p class="hint">Variant {usedBy.number} has it.</p>
    {:else if freeVariant === undefined}
      <p class="hint">Both variants are in use.</p>
    {:else}
      <div class="flex flex-wrap gap-2">
        {#each hint.answers as answer (answer)}
          <button type="button" class="text-sm" onclick={() => onuse(freeVariant.field, answer)}>
            Use <bdi lang="he" class="text-lg">{answer}</bdi> as Variant {freeVariant.number}
          </button>
        {/each}
      </div>
    {/if}
  </section>
{/each}
