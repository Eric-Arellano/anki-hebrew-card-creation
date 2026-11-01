<script lang="ts">
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import type { CardInputsDraft } from '#lib/card/inputs.ts';
import type { PrefillChoices } from '#lib/card/prefill.ts';
import {
  type FieldKey,
  type FieldValues,
  PARTS_OF_SPEECH,
  type PartOfSpeech,
} from '#lib/note-type.ts';
import NounInputs from './NounInputs.svelte';
import PluralHints from './PluralHints.svelte';
import ChoiceChips from './ui/ChoiceChips.svelte';
import TextInput from './ui/TextInput.svelte';
import VerbInputs from './VerbInputs.svelte';

const PART_OF_SPEECH_LABELS = {
  noun: 'Noun',
  verb: 'Verb',
  other: 'Other',
} satisfies Record<PartOfSpeech, string>;

const partOfSpeechOptions = PARTS_OF_SPEECH.map((value) => ({
  value,
  label: PART_OF_SPEECH_LABELS[value],
}));

let {
  draft = $bindable(),
  choices,
  candidate,
  edits,
  shownFields,
  onedit,
}: {
  draft: CardInputsDraft;
  choices: PrefillChoices;
  // The dictionary entry picked, if any.
  candidate: DictionaryCandidate | undefined;
  edits: FieldValues;
  shownFields: readonly FieldKey[];
  onedit: (field: FieldKey, value: string) => void;
} = $props();

// An infinitive is chosen as a pair, so choosing its pointed spelling writes its unpointed one.
function chooseInfinitive(pointed: string) {
  const infinitive = choices.infinitives?.find((choice) => choice.pointed === pointed);
  draft.word = infinitive?.unpointed ?? '';
}
</script>

<section aria-label="Word forms" class="space-y-4 border-t border-gray-200 pt-8">
  <ChoiceChips
    legend="Part of speech"
    name="part-of-speech"
    options={partOfSpeechOptions}
    bind:value={draft.partOfSpeech}
  />
  {#snippet pointedInput()}
    <TextInput
      label="Hebrew word, with niqqud"
      lang="he"
      choices={choices.infinitives?.map((infinitive) => infinitive.pointed)}
      onchoose={chooseInfinitive}
      bind:value={draft.pointed}
    />
  {/snippet}
  {#if draft.partOfSpeech === 'noun'}
    <NounInputs bind:noun={draft.noun} {choices}> {@render pointedInput()} </NounInputs>
    <PluralHints noun={draft.noun} pointed={draft.pointed} {edits} {shownFields} onuse={onedit} />
  {:else if draft.partOfSpeech === 'verb'}
    <VerbInputs
      bind:verb={draft.verb}
      bind:root={draft.root}
      {choices}
      suggestedPrepositions={candidate?.partOfSpeech === 'verb' ? candidate.verb.prepositions : []}
    >
      {@render pointedInput()}
    </VerbInputs>
  {:else}
    <div class="forms-row">{@render pointedInput()}</div>
  {/if}
</section>
