<script lang="ts">
import { onMount } from 'svelte';
import { ankiStatusProblem, fieldOrder } from '#lib/anki/status.ts';
import { type AnkiStatus, fetchAnkiStatus } from '#lib/api/anki.ts';
import { type DictionaryCandidate, fetchDictionaryLookup } from '#lib/api/dictionary.ts';
import { errorMessage } from '#lib/api/http.ts';
import { composeFields } from '#lib/card/compose.ts';
import { handOffFields } from '#lib/card/hand-off.ts';
import {
  type CardInputsDraft,
  completeInputs,
  emptyDraft,
  INPUT_NAMES,
  missingInputs,
} from '#lib/card/inputs.ts';
import {
  type PrefillChoices,
  prefillDraft,
  stillSpellsEntry,
  undoPrefill,
} from '#lib/card/prefill.ts';
import {
  type FieldValues,
  PARTS_OF_SPEECH,
  type PartOfSpeech,
  shownFieldGroups,
} from '#lib/note-type.ts';
import { afterTypingPauses } from '#lib/typing-pause.ts';
import ConnectionStatus from './ConnectionStatus.svelte';
import DefinitionsInput from './DefinitionsInput.svelte';
import DictionaryPanel from './DictionaryPanel.svelte';
import ExistingNotesPanel from './ExistingNotesPanel.svelte';
import HandOffBar from './HandOffBar.svelte';
import LookupLinks from './LookupLinks.svelte';
import NoteFields from './NoteFields.svelte';
import NounInputs from './NounInputs.svelte';
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

let draft: CardInputsDraft = $state(emptyDraft());
// The dictionary entry the inputs were last filled from, until the human types another word. The
// draft from before, and the word the entry filled in, are what undo it.
let picked:
  | {
      candidate: DictionaryCandidate;
      choices: PrefillChoices;
      before: CardInputsDraft;
      filledWord: string;
    }
  | undefined = $state.raw();
// `undefined` while the check is in flight.
let status: AnkiStatus | undefined = $state.raw();
let edits: FieldValues = $state({});

// Composition waits for every input, since each one shapes it. The fields shown depend only on
// the part of speech.
const inputs = $derived(completeInputs(draft));
const composed = $derived(inputs === undefined ? {} : composeFields(inputs));
const shownGroups = $derived(
  draft.partOfSpeech === undefined ? [] : shownFieldGroups(fieldOrder(status), draft.partOfSpeech),
);
const ankiFields = $derived(
  handOffFields({ composed, edits, shownFields: shownGroups.flatMap((group) => group.fields) }),
);
const ankiProblem = $derived(status && ankiStatusProblem(status));
const missingInputsMessage = $derived.by(() => {
  const missing = missingInputs(draft);
  if (missing.length === 0) return undefined;
  return `Still needed: ${missing.map((key) => INPUT_NAMES[key]).join(', ')}`;
});

// Once an entry is picked, the word it filled in isn't looked up again.
const lookupWord = $derived(picked === undefined ? draft.word.trim() : '');
// `{#await}` shows only the latest promise, so an older lookup's reply never lands.
const lookup = $derived(
  lookupWord === ''
    ? undefined
    : afterTypingPauses(
        lookupWord,
        () => lookupWord,
        () => fetchDictionaryLookup(lookupWord),
      ),
);
const wiktionaryEntry = $derived(
  picked !== undefined ? true : lookup?.then((result) => result?.titleHasEntry),
);
const choices = $derived(picked?.choices ?? {});

function pick(candidate: DictionaryCandidate) {
  const before = $state.snapshot(draft);
  const prefill = prefillDraft(before, candidate);
  draft = prefill.draft;
  picked = { candidate, choices: prefill.choices, before, filledWord: prefill.draft.word };
}

// Back to the word as typed, so its entries are offered again.
function unpick() {
  if (picked === undefined) return;
  draft = undoPrefill($state.snapshot(draft), picked.before);
  picked = undefined;
}

// Another word, which the entry's forms don't fit.
function retype() {
  if (picked === undefined || stillSpellsEntry(draft.word, picked.filledWord)) return;
  draft = { ...undoPrefill($state.snapshot(draft), picked.before), word: draft.word };
  picked = undefined;
}

// An infinitive is chosen as a pair, so choosing its pointed spelling writes its unpointed one.
function chooseInfinitive(pointed: string) {
  const infinitive = picked?.choices.infinitives?.find((choice) => choice.pointed === pointed);
  draft.word = infinitive?.unpointed ?? '';
}

async function checkAnki() {
  status = undefined;
  try {
    status = await fetchAnkiStatus();
  } catch (error) {
    status = { kind: 'error', message: errorMessage(error) };
  }
}

onMount(checkAnki);
</script>

<main class="mx-auto max-w-240 space-y-8 p-4">
  <header class="flex flex-wrap items-center justify-between gap-4">
    <h1>Hebrew card helper</h1>
    <ConnectionStatus {status} problem={ankiProblem} onrecheck={checkAnki} />
  </header>

  <!-- The word and its meanings come first, because they are all the lookups need, and the
       lookups are where the niqqud, gender and forms below come from. -->
  <section aria-label="Word" class="space-y-4">
    <div class="grid items-start gap-4 sm:grid-cols-2">
      <TextInput
        label="Hebrew word, without niqqud"
        lang="he"
        bind:value={draft.word}
        oninput={retype}
      />
      <DefinitionsInput bind:definitions={draft.definitions} />
    </div>
    <DictionaryPanel {lookup} picked={picked?.candidate} onpick={pick} onunpick={unpick} />
    <ExistingNotesPanel words={[draft.word, ...(picked ? [picked.candidate.title] : [])]} />
    <LookupLinks word={draft.word} lemmaTitle={picked?.candidate.title} {wiktionaryEntry} />
  </section>

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
    {:else if draft.partOfSpeech === 'verb'}
      <VerbInputs
        bind:verb={draft.verb}
        {choices}
        suggestedPrepositions={picked?.candidate.partOfSpeech === 'verb'
          ? picked.candidate.verb.prepositions
          : []}
      >
        {@render pointedInput()}
      </VerbInputs>
    {:else}
      <div class="forms-row">{@render pointedInput()}</div>
    {/if}
  </section>

  {#if draft.partOfSpeech !== undefined}
    <NoteFields
      groups={shownGroups}
      partOfSpeech={draft.partOfSpeech}
      {edits}
      onedit={(field, value) => {
        edits[field] = value;
      }}
    />
  {/if}

  <HandOffBar
    fields={ankiFields}
    ankiBlocker={status === undefined ? 'Checking Anki…' : ankiProblem}
    inputsBlocker={missingInputsMessage}
  />
</main>
