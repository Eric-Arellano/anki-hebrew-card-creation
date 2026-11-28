<script lang="ts">
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import type { Held } from '#lib/card/changed-from.ts';
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
import QuotedText from '../ui/QuotedText.svelte';
import TextInput from '../ui/TextInput.svelte';
import AdjectiveInputs from './AdjectiveInputs.svelte';
import ChoiceChips from './ChoiceChips.svelte';
import VerbMeaningPrepositions from './VerbMeaningPrepositions.svelte';
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
  held,
  choices,
  unoffered,
  candidate,
  edits,
  shownFields,
  onedit,
}: {
  inputs: CardInputsDraft;
  held: Held<CardInputsDraft>;
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
    inputs.wordPointed.trim() !== '' &&
    !spellsWord(inputs.wordPointed, inputs.word),
);

// An infinitive is chosen as a pair, so choosing its pointed spelling writes its unpointed one.
function chooseInfinitive(pointed: string) {
  const infinitive = choices.infinitives?.find((choice) => choice.pointed === pointed);
  inputs.word = infinitive?.unpointed ?? '';
}
</script>

<div class="space-y-4">
  <div class="space-y-1">
    <ChoiceChips
      legend="Part of speech"
      name="part-of-speech"
      options={partOfSpeechOptions}
      offered={choices.partOfSpeech}
      unoffered={unoffered.partOfSpeech}
      held={held && (held.partOfSpeech ?? '')}
      bind:value={inputs.partOfSpeech}
    />
    {#if inputs.partOfSpeech !== undefined}
      <p class="hint"><QuotedText text={PART_OF_SPEECH_HELP[inputs.partOfSpeech]} /></p>
    {/if}
  </div>
  <!-- The pointed word (a verb's infinitive) leads each part of speech's row of forms, so every
       pointed form copied from a dictionary sits in one row. -->
  {#snippet pointedInput()}
    <div class="grid content-start gap-1">
      <TextInput
        label="Hebrew word, with niqqud"
        lang="he"
        choices={choices.wordPointed ??
          choices.infinitives?.map((infinitive) => infinitive.pointed)}
        onchoose={choices.infinitives === undefined ? undefined : chooseInfinitive}
        held={held?.wordPointed}
        bind:value={inputs.wordPointed}
      />
      {#if misspellsWord}
        <p class="text-sm text-amber-400" aria-live="polite">
          Doesn't spell <bdi lang="he">{inputs.word.trim()}</bdi>, the word without niqqud.
        </p>
      {/if}
    </div>
  {/snippet}
  {#if inputs.partOfSpeech === 'noun'}
    <NounInputs
      bind:noun={inputs.noun}
      bind:root={inputs.root}
      held={held?.noun}
      heldRoot={held?.root}
      {choices}
      {unoffered}
    >
      {@render pointedInput()}
    </NounInputs>
    <PluralHints
      noun={inputs.noun}
      pointed={inputs.wordPointed}
      {edits}
      {shownFields}
      onuse={onedit}
    />
  {:else if inputs.partOfSpeech === 'verb'}
    <VerbMeaningPrepositions
      bind:meanings={inputs.meanings}
      held={held?.meanings}
      word={inputs.word}
      pointed={inputs.wordPointed}
      {candidate}
    />
    <VerbInputs
      bind:verb={inputs.verb}
      bind:root={inputs.root}
      held={held?.verb}
      heldRoot={held?.root}
      {choices}
      {unoffered}
    >
      {@render pointedInput()}
    </VerbInputs>
  {:else if inputs.partOfSpeech === 'adjective'}
    <AdjectiveInputs
      bind:adjective={inputs.adjective}
      bind:root={inputs.root}
      held={held?.adjective}
      heldRoot={held?.root}
      {choices}
    >
      {@render pointedInput()}
    </AdjectiveInputs>
  {:else}
    <div class="forms-row">{@render pointedInput()}</div>
  {/if}
</div>
