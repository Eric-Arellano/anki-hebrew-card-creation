<script lang="ts">
import type { PluralHint } from '#lib/card/noun.ts';
import type { IrregularPlural } from '#lib/hebrew/plural.ts';
import type { FieldKey } from '#lib/note-type.ts';

const REASONS = {
  'masculine-with-ot': 'a masculine noun, but its plural ends in ־וֹת',
  'feminine-with-im': 'a feminine noun, but its plural ends in ־ִים',
  'changed-stem': 'its plural changes the word itself',
} satisfies Record<IrregularPlural, string>;

let {
  hints,
  variants,
  onuse,
}: {
  hints: PluralHint[];
  // The variant answers the editor shows, with what each holds now.
  variants: { field: FieldKey; number: number; answer: string }[];
  onuse: (field: FieldKey, answer: string) => void;
} = $props();

const freeVariant = $derived(variants.find((variant) => variant.answer.trim() === ''));
</script>

{#each hints as hint (hint.plural)}
  {@const usedBy = variants.find((variant) => variant.answer.includes(hint.plural))}
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
