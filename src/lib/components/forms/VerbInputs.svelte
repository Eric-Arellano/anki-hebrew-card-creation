<script lang="ts">
import type { Snippet } from 'svelte';
import type { UnofferedValues } from '#lib/card/from-note.ts';
import type { VerbDraft } from '#lib/card/parts-of-speech/verb.ts';
import type { PrefillChoices } from '#lib/card/prefill.ts';
import { BINYANIM, type Binyan } from '#lib/hebrew/binyan.ts';
import { GOVERNED_PREPOSITIONS, type GovernedPreposition } from '#lib/hebrew/preposition.ts';
import ChoiceChips from '../ui/ChoiceChips.svelte';
import TextInput from '../ui/TextInput.svelte';
import UnofferedValue from '../ui/UnofferedValue.svelte';
import WiktionaryHas from '../ui/WiktionaryHas.svelte';
import RootInput from './RootInput.svelte';

const PREPOSITION_OPTIONS: readonly { value: GovernedPreposition | 'none'; label: string }[] = [
  ...GOVERNED_PREPOSITIONS.map((value) => ({ value, label: value })),
  { value: 'none', label: 'None' },
];

let {
  verb = $bindable(),
  root = $bindable(),
  choices,
  suggestedPrepositions,
  unoffered,
  children,
}: {
  verb: VerbDraft;
  root: string;
  choices: PrefillChoices;
  // From the dictionary, which names one for few verbs.
  suggestedPrepositions: readonly GovernedPreposition[];
  unoffered: UnofferedValues;
  // The pointed infinitive, which leads the row as the pointed word leads a noun's forms.
  children: Snippet;
} = $props();

const binyanErrorId = $props.id();
const shownUnofferedBinyan = $derived(verb.binyan === undefined ? unoffered.binyan : undefined);

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
    unoffered={unoffered.preposition}
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
    <TextInput
      label="Past (he), with niqqud"
      lang="he"
      required={false}
      choices={choices.past}
      bind:value={verb.past}
    />
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
    <div class="grid content-start gap-1">
      <label class="grid gap-1">
        <span class="required-mark">Binyan</span>
        <select
          class="text-2xl"
          required
          aria-describedby={shownUnofferedBinyan === undefined ? undefined : binyanErrorId}
          bind:value={() => verb.binyan ?? '', setBinyan}
        >
          <option value=""></option>
          {#each BINYANIM as binyan (binyan)}
            <option value={binyan}>{binyan}</option>
          {/each}
        </select>
      </label>
      {#if choices.binyan !== undefined}
        <WiktionaryHas
          label="Binyan"
          lang="en"
          options={choices.binyan}
          isChosen={(binyan) => binyan === verb.binyan}
          onchoose={(binyan) => (verb.binyan = binyan)}
        />
      {/if}
      {#if shownUnofferedBinyan !== undefined}
        <UnofferedValue id={binyanErrorId} value={shownUnofferedBinyan} />
      {/if}
    </div>
    <RootInput choices={choices.root} bind:root />
  </div>
</fieldset>
