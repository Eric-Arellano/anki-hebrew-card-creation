<script lang="ts">
import type { Snippet } from 'svelte';
import { PREPOSITIONS, type Preposition, type VerbDraft } from '#lib/card/verb.ts';
import { BINYANIM, type Binyan } from '#lib/hebrew/binyan.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import ChoiceChips from './ui/ChoiceChips.svelte';
import TextInput from './ui/TextInput.svelte';

// Most verbs take a direct object with את, or no object at all, and neither puts a preposition in
// the answer, so this comes first and starts chosen.
const PREPOSITION_OPTIONS: readonly { value: Preposition | 'none'; label: string }[] = [
  { value: 'none', label: 'את or none' },
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

// The blank option is there only to start unchosen, so the editor never guesses the binyan.
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
      <span class="required-mark">Binyan</span>
      <select class="text-2xl" required bind:value={() => verb.binyan ?? '', setBinyan}>
        <option value=""></option>
        {#each BINYANIM as binyan (binyan)}
          <option value={binyan}>{binyan}</option>
        {/each}
      </select>
    </label>
    <TextInput label="Root, like דבר or ד.ב.ר" lang="he" bind:value={verb.root} />
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
