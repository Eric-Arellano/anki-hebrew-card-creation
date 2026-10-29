<script lang="ts">
import type { Snippet } from 'svelte';
import { PREPOSITIONS, type Preposition, type VerbDraft } from '#lib/card/verb.ts';
import { BINYANIM, type Binyan } from '#lib/hebrew/binyan.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import ChoiceChips from './ui/ChoiceChips.svelte';
import TextInput from './ui/TextInput.svelte';

// None comes first: most verbs take a direct object, which needs no preposition.
const PREPOSITION_OPTIONS: readonly { value: Preposition | 'none'; label: string }[] = [
  { value: 'none', label: 'None' },
  ...PREPOSITIONS.map((value) => ({ value, label: value })),
];

let {
  verb = $bindable(),
  children,
}: {
  verb: VerbDraft;
  // The pointed infinitive, which leads the row as the pointed word leads a noun's forms.
  children: Snippet;
} = $props();

const formattedRoot = $derived(formatRoot(verb.root));

// The blank option stays choosable, so an unknown binyan is left blank, not guessed.
function setBinyan(value: Binyan | '') {
  verb.binyan = value === '' ? undefined : value;
}
</script>

<fieldset class="space-y-4">
  <legend class="sr-only">Verb</legend>
  <ChoiceChips
    legend="Preposition it takes"
    name="preposition"
    options={PREPOSITION_OPTIONS}
    bind:value={verb.preposition}
  />
  <div class="forms-row">
    {@render children()}
    <label class="grid gap-1">
      <span>Binyan</span>
      <select class="text-2xl" bind:value={() => verb.binyan ?? '', setBinyan}>
        <option value=""></option>
        {#each BINYANIM as binyan (binyan)}
          <option value={binyan}>{binyan}</option>
        {/each}
      </select>
    </label>
    <TextInput label="Root, like דבר or ד.ב.ר" lang="he" required={false} bind:value={verb.root} />
  </div>
  {#if verb.root.trim() !== ''}
    <p class="hint" aria-live="polite">
      {#if formattedRoot === undefined}
        The root is left blank until it is only Hebrew letters, without niqqud.
      {:else}
        Writes the root as <bdi lang="he">{formattedRoot}</bdi>.
      {/if}
    </p>
  {/if}
</fieldset>
