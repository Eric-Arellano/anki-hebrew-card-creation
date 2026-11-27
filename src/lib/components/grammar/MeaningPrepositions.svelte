<script lang="ts">
import type { Held } from '#lib/card/changed-from.ts';
import { isBlankMeaning, type Meaning, type PrepositionChoice } from '#lib/card/definitions.ts';
import { MEANING_PREPOSITION_HELP } from '#lib/field-help.ts';
import {
  GOVERNED_PREPOSITIONS,
  type GovernedPreposition,
  POINTED_PREPOSITIONS,
} from '#lib/hebrew/preposition.ts';
import QuotedText from '../ui/QuotedText.svelte';
import ChoiceChips from './ChoiceChips.svelte';

// Pointed, as the card shows them.
const OPTIONS: readonly { value: PrepositionChoice; label: string }[] = [
  ...GOVERNED_PREPOSITIONS.map((value) => ({ value, label: POINTED_PREPOSITIONS[value] })),
  { value: 'none', label: 'None' },
];

let {
  definitions = $bindable(),
  held,
  suggested,
}: {
  definitions: Meaning[];
  held: Held<readonly Meaning[]>;
  // From the dictionary, which names them for few verbs, and for the entry, not for a meaning.
  suggested: readonly GovernedPreposition[];
} = $props();

// Each meaning with English, with its index among all the rows, which `held` is marked by.
const filled = $derived(
  definitions.flatMap((meaning, index) => (isBlankMeaning(meaning) ? [] : [{ meaning, index }])),
);
</script>

<fieldset class="grid grid-cols-1 gap-3">
  <legend class="mb-1">Preposition each meaning takes (מילת יחס)</legend>
  <p class="hint"><QuotedText text={MEANING_PREPOSITION_HELP} /></p>
  {#each filled as { meaning, index } (meaning)}
    <ChoiceChips
      legend={meaning.english.trim()}
      name="preposition-{index}"
      options={OPTIONS}
      {suggested}
      held={held && (held[index]?.preposition ?? '')}
      bind:value={meaning.preposition}
    />
  {:else}
    <p class="hint">Write an English meaning above, then choose its preposition here.</p>
  {/each}
  {#if suggested.length > 0}
    <p class="hint">
      Wiktionary suggests
      <bdi lang="he"
        >{suggested.map((preposition) => POINTED_PREPOSITIONS[preposition]).join(', ')}</bdi
      >
      for this verb, but not for which meaning.
    </p>
  {/if}
</fieldset>
