<script lang="ts">
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import type { UnofferedValues } from '#lib/card/from-note.ts';
import type { CardInputsDraft } from '#lib/card/inputs.ts';
import type { PrefillChoices } from '#lib/card/prefill.ts';
import { PART_OF_SPEECH_HELP } from '#lib/field-help.ts';
import { spellsWord } from '#lib/hebrew/normalize.ts';
import {
  type FieldKey,
  type FieldValues,
  PARTS_OF_SPEECH,
  type PartOfSpeech,
} from '#lib/note-type.ts';
import ChoiceChips from '../ui/ChoiceChips.svelte';
import QuotedText from '../ui/QuotedText.svelte';
import TextInput from '../ui/TextInput.svelte';
import AdjectiveInputs from './AdjectiveInputs.svelte';
import NounInputs from './NounInputs.svelte';
import PluralHints from './PluralHints.svelte';
import VerbInputs from './VerbInputs.svelte';

const PART_OF_SPEECH_LABELS = {
  noun: 'Noun',
  verb: 'Verb',
  adjective: 'Adjective',
  adverb: 'Adverb',
  preposition: 'Preposition',
  phrase: 'Phrase',
  other: 'Other',
} satisfies Record<PartOfSpeech, string>;

const partOfSpeechOptions = PARTS_OF_SPEECH.map((value) => ({
  value,
  label: PART_OF_SPEECH_LABELS[value],
}));

let {
  inputs = $bindable(),
  choices,
  unoffered,
  candidate,
  edits,
  shownFields,
  onedit,
}: {
  inputs: CardInputsDraft;
  choices: PrefillChoices;
  // What a loaded note holds for a chip that no chip offers.
  unoffered: UnofferedValues;
  // The dictionary entry picked, if any.
  candidate: DictionaryCandidate | undefined;
  edits: FieldValues;
  shownFields: readonly FieldKey[];
  onedit: (field: FieldKey, value: string) => void;
} = $props();

// Only a warning, since a correct spelling can fail the comparison.
const misspellsWord = $derived(
  inputs.word.trim() !== '' &&
    inputs.pointed.trim() !== '' &&
    !spellsWord(inputs.pointed, inputs.word),
);

// An infinitive is chosen as a pair, so choosing its pointed spelling writes its unpointed one.
function chooseInfinitive(pointed: string) {
  const infinitive = choices.infinitives?.find((choice) => choice.pointed === pointed);
  inputs.word = infinitive?.unpointed ?? '';
}
</script>

<section aria-label="Word forms" class="space-y-4 border-t border-gray-200 pt-8">
  <div class="space-y-1">
    <ChoiceChips
      legend="Part of speech"
      name="part-of-speech"
      options={partOfSpeechOptions}
      offered={choices.partOfSpeech}
      unoffered={unoffered.partOfSpeech}
      bind:value={inputs.partOfSpeech}
    />
    {#if inputs.partOfSpeech !== undefined}
      <p class="hint"><QuotedText text={PART_OF_SPEECH_HELP[inputs.partOfSpeech]} /></p>
    {/if}
  </div>
  {#snippet pointedInput()}
    <div class="grid content-start gap-1">
      <TextInput
        label="Hebrew word, with niqqud"
        lang="he"
        choices={choices.pointed ?? choices.infinitives?.map((infinitive) => infinitive.pointed)}
        onchoose={choices.infinitives === undefined ? undefined : chooseInfinitive}
        bind:value={inputs.pointed}
      />
      {#if misspellsWord}
        <p class="text-sm text-amber-700" aria-live="polite">
          Doesn't spell <bdi lang="he">{inputs.word.trim()}</bdi>, the word without niqqud.
        </p>
      {/if}
    </div>
  {/snippet}
  {#if inputs.partOfSpeech === 'noun'}
    <NounInputs bind:noun={inputs.noun} bind:root={inputs.root} {choices} {unoffered}>
      {@render pointedInput()}
    </NounInputs>
    <PluralHints noun={inputs.noun} pointed={inputs.pointed} {edits} {shownFields} onuse={onedit} />
  {:else if inputs.partOfSpeech === 'verb'}
    <VerbInputs
      bind:verb={inputs.verb}
      bind:root={inputs.root}
      {choices}
      suggestedPrepositions={candidate?.partOfSpeech === 'verb' ? candidate.verb.prepositions : []}
      {unoffered}
    >
      {@render pointedInput()}
    </VerbInputs>
  {:else if inputs.partOfSpeech === 'adjective'}
    <AdjectiveInputs bind:adjective={inputs.adjective} bind:root={inputs.root} {choices}>
      {@render pointedInput()}
    </AdjectiveInputs>
  {:else}
    <div class="forms-row">{@render pointedInput()}</div>
  {/if}
</section>
