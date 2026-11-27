<script lang="ts">
import type { Snippet } from 'svelte';
import type { UnofferedValues } from '#lib/card/from-note.ts';
import type { VerbDraft } from '#lib/card/parts-of-speech/verb.ts';
import type { PrefillChoices } from '#lib/card/prefill.ts';
import { type Held, textChange } from '#lib/card/changed-from.ts';
import { BINYANIM, type Binyan } from '#lib/hebrew/binyan.ts';
import ChangedFrom from '../ui/ChangedFrom.svelte';
import TextInput from '../ui/TextInput.svelte';
import WiktionaryHas from '../ui/WiktionaryHas.svelte';
import RootInput from './RootInput.svelte';
import UnofferedValue from './UnofferedValue.svelte';

let {
  verb = $bindable(),
  root = $bindable(),
  held,
  heldRoot,
  choices,
  unoffered,
  children,
}: {
  verb: VerbDraft;
  root: string;
  held: Held<VerbDraft>;
  heldRoot: string | undefined;
  choices: PrefillChoices;
  unoffered: UnofferedValues;
  children: Snippet;
} = $props();

const binyanErrorId = $props.id();
const shownUnofferedBinyan = $derived(verb.binyan === undefined ? unoffered.binyan : undefined);

// The blank option is there only to start unchosen, so the editor never guesses the binyan.
function setBinyan(value: Binyan | '') {
  verb.binyan = value === '' ? undefined : value;
}
</script>

<fieldset>
  <legend class="sr-only">Verb</legend>
  <div class="forms-row">
    {@render children()}
    <TextInput
      label="Past (he), with niqqud"
      lang="he"
      required={false}
      choices={choices.past}
      held={held?.past}
      bind:value={verb.past}
    />
    <TextInput
      label="Present (he), with niqqud"
      lang="he"
      required={false}
      choices={choices.present}
      held={held?.present}
      bind:value={verb.present}
    />
    <TextInput
      label="Future (he), with niqqud"
      lang="he"
      required={false}
      choices={choices.future}
      held={held?.future}
      bind:value={verb.future}
    />
    <div class="grid content-start gap-1">
      <ChangedFrom
        label="Binyan"
        change={textChange(held && (held.binyan ?? ''), verb.binyan ?? '')}
        onrestore={() => (verb.binyan = held?.binyan)}
      >
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
      </ChangedFrom>
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
    <RootInput choices={choices.root} held={heldRoot} bind:root />
  </div>
</fieldset>
