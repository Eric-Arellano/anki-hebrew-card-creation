<script lang="ts">
import type { Snippet } from 'svelte';
import type { PrefillChoices } from '#lib/card/prefill.ts';
import type { VerbDraft } from '#lib/card/verb.ts';
import { BINYANIM, type Binyan } from '#lib/hebrew/binyan.ts';
import { GOVERNED_PREPOSITIONS, type GovernedPreposition } from '#lib/hebrew/preposition.ts';
import RootInput from './RootInput.svelte';
import ChoiceChips from './ui/ChoiceChips.svelte';
import TextInput from './ui/TextInput.svelte';

const PREPOSITION_OPTIONS: readonly { value: GovernedPreposition | 'none'; label: string }[] = [
  ...GOVERNED_PREPOSITIONS.map((value) => ({ value, label: value })),
  { value: 'none', label: 'None' },
];

let {
  verb = $bindable(),
  root = $bindable(),
  choices,
  suggestedPrepositions,
  children,
}: {
  verb: VerbDraft;
  root: string;
  choices: PrefillChoices;
  // From the dictionary, which names one for few verbs.
  suggestedPrepositions: readonly GovernedPreposition[];
  // The pointed infinitive, which leads the row as the pointed word leads a noun's forms.
  children: Snippet;
} = $props();

// The blank option is there only to start unchosen, so the editor never guesses the binyan.
function setBinyan(value: Binyan | '') {
  verb.binyan = value === '' ? undefined : value;
}
</script>

<fieldset class="space-y-4">
  <legend class="sr-only">Verb</legend>
  <ChoiceChips
    legend="Preposition it takes (מילת יחס)"
    name="preposition"
    options={PREPOSITION_OPTIONS}
    suggested={suggestedPrepositions}
    bind:value={verb.preposition}
  />
  {#if suggestedPrepositions.length > 0}
    <p class="hint">
      Wiktionary suggests
      <bdi lang="he">{suggestedPrepositions.join(', ')}</bdi>. Check it's the one you'll use.
    </p>
  {/if}
  <div class="forms-row">
    {@render children()}
    <TextInput label="Past (he), with niqqud" lang="he" required={false} bind:value={verb.past} />
    <TextInput
      label="Present (he), with niqqud"
      lang="he"
      required={false}
      choices={choices.present}
      bind:value={verb.present}
    />
    <TextInput
      label="Future (he), with niqqud"
      lang="he"
      required={false}
      choices={choices.future}
      bind:value={verb.future}
    />
    <label class="grid gap-1">
      <span class="required-mark">Binyan</span>
      <select class="text-2xl" required bind:value={() => verb.binyan ?? '', setBinyan}>
        <option value=""></option>
        {#each BINYANIM as binyan (binyan)}
          <option value={binyan}>{binyan}</option>
        {/each}
      </select>
    </label>
    <RootInput choices={choices.root} bind:root />
  </div>
</fieldset>
