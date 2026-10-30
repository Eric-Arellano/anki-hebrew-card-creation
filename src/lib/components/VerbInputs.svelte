<script lang="ts">
import type { Snippet } from 'svelte';
import type { PrefillChoices } from '#lib/card/prefill.ts';
import { PREPOSITIONS, type Preposition, type VerbDraft } from '#lib/card/verb.ts';
import { BINYANIM, type Binyan } from '#lib/hebrew/binyan.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import ChoiceChips from './ui/ChoiceChips.svelte';
import TextInput from './ui/TextInput.svelte';

const PREPOSITION_OPTIONS: readonly { value: Preposition | 'none'; label: string }[] = [
  ...PREPOSITIONS.map((value) => ({ value, label: value })),
  { value: 'none', label: 'None' },
];

let {
  verb = $bindable(),
  choices,
  suggestedPrepositions,
  children,
}: {
  verb: VerbDraft;
  choices: PrefillChoices;
  // From the dictionary, which names one for few verbs.
  suggestedPrepositions: readonly Preposition[];
  // The pointed infinitive, which leads the row as the pointed word leads a noun's forms.
  children: Snippet;
} = $props();

const formattedRoot = $derived(formatRoot(verb.root));

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
    <label class="grid gap-1">
      <span class="required-mark">Binyan</span>
      <select class="text-2xl" required bind:value={() => verb.binyan ?? '', setBinyan}>
        <option value=""></option>
        {#each BINYANIM as binyan (binyan)}
          <option value={binyan}>{binyan}</option>
        {/each}
      </select>
    </label>
    <TextInput
      label="Root, like דבר or ד.ב.ר"
      lang="he"
      choices={choices.root}
      bind:value={verb.root}
    />
  </div>
  {#if verb.root.trim() !== ''}
    <p class="hint" aria-live="polite">
      {#if formattedRoot === undefined}
        Type only the root's Hebrew letters, without niqqud.
      {:else}
        Writes the root as <bdi lang="he">{formattedRoot}</bdi>.
      {/if}
    </p>
  {/if}
</fieldset>
