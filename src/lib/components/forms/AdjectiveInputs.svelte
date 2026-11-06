<script lang="ts">
import type { Snippet } from 'svelte';
import type { AdjectiveInputs } from '#lib/card/adjective.ts';
import type { PrefillChoices } from '#lib/card/prefill.ts';
import TextInput from '../ui/TextInput.svelte';
import RootInput from './RootInput.svelte';

let {
  adjective = $bindable(),
  root = $bindable(),
  choices,
  children,
}: {
  adjective: AdjectiveInputs;
  root: string;
  choices: PrefillChoices;
  // The pointed word, which leads the row as the pointed word leads a noun's forms.
  children: Snippet;
} = $props();
</script>

<fieldset>
  <legend class="sr-only">Adjective</legend>
  <div class="forms-row">
    {@render children()}
    <TextInput
      label="Feminine singular, with niqqud"
      lang="he"
      required={false}
      choices={choices.feminine}
      bind:value={adjective.feminine}
    />
    <TextInput
      label="Masculine plural, with niqqud"
      lang="he"
      required={false}
      choices={choices.masculinePlural}
      bind:value={adjective.masculinePlural}
    />
    <TextInput
      label="Feminine plural, with niqqud"
      lang="he"
      required={false}
      choices={choices.femininePlural}
      bind:value={adjective.femininePlural}
    />
    <RootInput choices={choices.root} bind:root />
  </div>
</fieldset>
