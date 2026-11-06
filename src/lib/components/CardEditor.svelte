<script lang="ts">
import { onMount } from 'svelte';
import { ankiStatusProblem, fieldOrder } from '#lib/anki/status.ts';
import { type AnkiStatus, fetchAnkiStatus } from '#lib/api/anki.ts';
import { type DictionaryCandidate, fetchDictionaryLookup } from '#lib/api/dictionary.ts';
import { errorMessage } from '#lib/api/http.ts';
import { composeFields } from '#lib/card/compose.ts';
import { type CardDraft, emptyCardDraft, stillNeeded } from '#lib/card/draft.ts';
import { handOffFields, type StoredMedia } from '#lib/card/hand-off.ts';
import { type CardInputsDraft, completeInputs } from '#lib/card/inputs.ts';
import {
  type PrefillChoices,
  prefillDraft,
  stillSpellsEntry,
  undoPrefill,
} from '#lib/card/prefill.ts';
import { type FieldKey, shownFieldGroups } from '#lib/note-type.ts';
import { afterTypingPauses } from '#lib/typing-pause.ts';
import ConnectionStatus from './ConnectionStatus.svelte';
import WordForms from './forms/WordForms.svelte';
import HandOffBar from './HandOffBar.svelte';
import ImagesInput from './media/ImagesInput.svelte';
import NoteFields from './NoteFields.svelte';
import TextInput from './ui/TextInput.svelte';
import DefinitionsInput from './word/DefinitionsInput.svelte';
import DictionaryPanel from './word/DictionaryPanel.svelte';
import ExistingNotesPanel from './word/ExistingNotesPanel.svelte';
import LookupLinks from './word/LookupLinks.svelte';

let { onnextcard }: { onnextcard?: () => void } = $props();

let draft: CardDraft = $state(emptyCardDraft());
// The dictionary entry the inputs were last filled from, until the human types another word. The
// inputs from before, and the word the entry filled in, are what undo it.
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

// Composition waits for every input, since each one shapes it. The fields shown depend only on
// the part of speech.
const completed = $derived(completeInputs(draft.inputs));
const composed = $derived(completed === undefined ? {} : composeFields(completed));
const shownGroups = $derived(
  draft.inputs.partOfSpeech === undefined
    ? []
    : shownFieldGroups(fieldOrder(status), draft.inputs.partOfSpeech),
);
const shownFields = $derived(shownGroups.flatMap((group) => group.fields));
const ankiProblem = $derived(status && ankiStatusProblem(status));
const stillNeededMessage = $derived.by(() => {
  const needed = stillNeeded(draft);
  return needed.length === 0 ? undefined : `Still needed: ${needed.join(', ')}`;
});

// Once an entry is picked, the word it filled in isn't looked up again.
const lookupWord = $derived(picked === undefined ? draft.inputs.word.trim() : '');
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
  const before = $state.snapshot(draft.inputs);
  const prefill = prefillDraft(before, candidate);
  draft.inputs = prefill.draft;
  picked = { candidate, choices: prefill.choices, before, filledWord: prefill.draft.word };
}

// Back to the word as typed, so its entries are offered again.
function unpick() {
  if (picked === undefined) return;
  draft.inputs = undoPrefill($state.snapshot(draft.inputs), picked.before);
  picked = undefined;
}

// Another word, which the entry's forms don't fit.
function retype() {
  if (picked === undefined || stillSpellsEntry(draft.inputs.word, picked.filledWord)) return;
  draft.inputs = {
    ...undoPrefill($state.snapshot(draft.inputs), picked.before),
    word: draft.inputs.word,
  };
  picked = undefined;
}

function setEdit(field: FieldKey, value: string) {
  draft.edits[field] = value;
}

function ankiFields(media: StoredMedia) {
  return handOffFields({ composed, edits: draft.edits, shownFields, media });
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
        takesFocus
        bind:value={draft.inputs.word}
        oninput={retype}
      />
      <DefinitionsInput bind:definitions={draft.inputs.definitions} />
    </div>
    <DictionaryPanel {lookup} picked={picked?.candidate} onpick={pick} onunpick={unpick} />
    <ExistingNotesPanel words={[draft.inputs.word, ...(picked ? [picked.candidate.title] : [])]} />
    <LookupLinks word={draft.inputs.word} lemmaTitle={picked?.candidate.title} {wiktionaryEntry} />
    <section aria-label="Media">
      <ImagesInput bind:images={draft.media.images} bind:noImage={draft.media.noImage} />
    </section>
  </section>

  <WordForms
    bind:draft={draft.inputs}
    {choices}
    candidate={picked?.candidate}
    edits={draft.edits}
    {shownFields}
    onedit={setEdit}
  />

  {#if draft.inputs.partOfSpeech !== undefined}
    <NoteFields
      groups={shownGroups}
      partOfSpeech={draft.inputs.partOfSpeech}
      edits={draft.edits}
      onedit={setEdit}
    />
  {/if}

  <HandOffBar
    media={draft.media}
    fieldsWith={ankiFields}
    {onnextcard}
    ankiBlocker={status === undefined ? 'Checking Anki…' : ankiProblem}
    inputsBlocker={stillNeededMessage}
  />
</main>
