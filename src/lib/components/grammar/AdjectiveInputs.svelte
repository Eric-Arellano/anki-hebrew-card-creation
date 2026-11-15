<script lang="ts">
import type { Snippet } from 'svelte';
import type { AdjectiveInputs } from '#lib/card/parts-of-speech/adjective.ts';
import type { PrefillChoices } from '#lib/card/prefill.ts';
import TextInput from '../ui/TextInput.svelte';
import RootInput from './RootInput.svelte';

let {
  adjective = $bindable(),
  root = $bindable(),
  held,
  heldRoot,
  choices,
  children,
}: {
  adjective: AdjectiveInputs;
  root: string;
  // What Anki holds, while editing a note.
  held: AdjectiveInputs | undefined;
  heldRoot: string | undefined;
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
      held={held?.feminine}
      bind:value={adjective.feminine}
    />
    <TextInput
      label="Masculine plural, with niqqud"
      lang="he"
      required={false}
      choices={choices.masculinePlural}
      held={held?.masculinePlural}
      bind:value={adjective.masculinePlural}
    />
    <TextInput
      label="Feminine plural, with niqqud"
      lang="he"
      required={false}
      choices={choices.femininePlural}
      held={held?.femininePlural}
      bind:value={adjective.femininePlural}
    />
    <RootInput choices={choices.root} held={heldRoot} bind:root />
  </div>
</fieldset>
