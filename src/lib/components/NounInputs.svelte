<script lang="ts">
import type { Snippet } from 'svelte';
import type { CardInputsDraft, Gender } from '#lib/card-inputs.ts';
import ChoiceChips from './ui/ChoiceChips.svelte';
import TextInput from './ui/TextInput.svelte';

const GENDERS: readonly { value: Gender; label: string }[] = [
  { value: 'm', label: 'Masculine' },
  { value: 'f', label: 'Feminine' },
  { value: 'mf', label: 'Both' },
];

let {
  noun = $bindable(),
  children,
}: {
  noun: CardInputsDraft['noun'];
  // The pointed singular, which leads the forms so every pointed form copied from a dictionary
  // sits in one row.
  children: Snippet;
} = $props();
</script>

<fieldset class="space-y-4">
  <legend class="sr-only">Noun</legend>
  <ChoiceChips legend="Gender" name="gender" options={GENDERS} bind:value={noun.gender} />
  <div class="forms-row">
    {@render children()}
    {#if noun.gender !== undefined}
      <TextInput
        label={noun.gender === 'm' ? 'Masculine plural, with niqqud' : 'Plural, with niqqud'}
        lang="he"
        required={false}
        bind:value={noun.plural}
      />
    {/if}
    <!-- Only a masculine noun has a feminine counterpart, so only it asks for one. -->
    {#if noun.gender === 'm'}
      <TextInput
        label="Feminine singular, with niqqud"
        lang="he"
        required={false}
        bind:value={noun.feminine}
      />
      <TextInput
        label="Feminine plural, with niqqud"
        lang="he"
        required={false}
        bind:value={noun.femininePlural}
      />
    {/if}
  </div>
</fieldset>
