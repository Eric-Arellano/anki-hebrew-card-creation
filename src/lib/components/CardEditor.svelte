<script lang="ts">
import { onMount, untrack } from 'svelte';
import { ankiStatusProblem, fieldOrder } from '#lib/anki/status.ts';
import { type AnkiStatus, fetchAnkiStatus, fetchNote, type LoadedNote } from '#lib/api/anki.ts';
import { type DictionaryCandidate, fetchDictionaryLookup } from '#lib/api/dictionary.ts';
import { errorMessage } from '#lib/api/http.ts';
import { composeFields } from '#lib/card/compose.ts';
import { type CardDraft, changedBeyondWord, emptyCardDraft, stillNeeded } from '#lib/card/draft.ts';
import { examplesWithoutWord } from '#lib/card/examples.ts';
import { draftFromNote, type NoteDraft } from '#lib/card/from-note.ts';
import { attachmentsToStore, noteFields } from '#lib/card/to-note.ts';
import { type CardInputsDraft, completeInputs, draftRoot } from '#lib/card/inputs.ts';
import {
  type PrefillChoices,
  prefillBlanks,
  prefillDraft,
  stillSpellsEntry,
  undoPrefill,
} from '#lib/card/prefill.ts';
import { type FieldKey, shownFieldGroups } from '#lib/note-type.ts';
import { afterTypingPauses } from '#lib/typing-pause.ts';
import ConnectionStatus from './ConnectionStatus.svelte';
import WordForms from './forms/WordForms.svelte';
import SaveBar from './SaveBar.svelte';
import AudioInput from './media/AudioInput.svelte';
import ImagesInput from './media/ImagesInput.svelte';
import NoteFields from './NoteFields.svelte';
import Checkbox from './ui/Checkbox.svelte';
import TextInput from './ui/TextInput.svelte';
import DefinitionsInput from './word/DefinitionsInput.svelte';
import DictionaryPanel from './word/DictionaryPanel.svelte';
import ExistingNotesPanel from './word/ExistingNotesPanel.svelte';
import LookupLinks from './word/LookupLinks.svelte';

let {
  note,
  onnextcard,
  onopennote,
}: {
  // The note this editor edits, or `undefined` for a new one. Read once, since the page remounts
  // the editor for each card.
  note?: LoadedNote;
  onnextcard?: () => void;
  onopennote?: (note: LoadedNote) => void;
} = $props();

function startingDraft(): NoteDraft {
  return note === undefined ? { ...emptyCardDraft(), unoffered: {} } : draftFromNote(note.fields);
}

const { unoffered, ...start } = startingDraft();
// The note as Anki last answered with it: as loaded, then as each save left it.
let held: LoadedNote | undefined = $state.raw(untrack(() => note));
// A state proxy never writes back to `start`, so it stays what the editor began with.
let draft: CardDraft = $state(start);
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
const attachments = $derived(attachmentsToStore(draft.media, shownFields));
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
const replacesDraft = $derived(changedBeyondWord(start, draft));

function pick(candidate: DictionaryCandidate) {
  const before = $state.snapshot(draft.inputs);
  const prefill = (note === undefined ? prefillDraft : prefillBlanks)(before, candidate);
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

function ankiFields(storedAs: ReadonlyMap<string, string>) {
  return noteFields({ composed, edits: draft.edits, shownFields, media: draft.media, storedAs });
}

async function loadAgain() {
  if (held !== undefined) onopennote?.(await fetchNote(held.noteId));
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

  {#if note !== undefined}
    <section
      aria-label="Editing"
      class="flex flex-wrap items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
    >
      <p>
        Editing the note for
        <bdi lang="he" class="text-xl">{start.inputs.pointed || start.inputs.word}</bdi>
      </p>
      <button type="button" onclick={onnextcard}>New word</button>
    </section>
  {/if}

  <!-- The word and its meanings come first, because they are all the lookups need, and the
       lookups are where the niqqud, gender and forms below come from. -->
  <section aria-label="Word" class="space-y-4">
    <div class="grid items-start gap-4 sm:grid-cols-2">
      <TextInput
        label="Hebrew word, without niqqud"
        lang="he"
        takesFocus
        choices={choices.word}
        bind:value={draft.inputs.word}
        oninput={retype}
      />
      <DefinitionsInput bind:definitions={draft.inputs.definitions} />
    </div>
    <ExistingNotesPanel
      words={[draft.inputs.word, ...(picked ? [picked.candidate.title] : [])]}
      root={draftRoot(draft.inputs)}
      editingNoteId={note?.noteId}
      {replacesDraft}
      onopen={(opened) => onopennote?.(opened)}
    />
    <DictionaryPanel
      {lookup}
      picked={picked?.candidate}
      editing={note !== undefined}
      onpick={pick}
      onunpick={unpick}
    />
    <LookupLinks word={draft.inputs.word} lemmaTitle={picked?.candidate.title} {wiktionaryEntry} />
    <section aria-label="Media" class="space-y-2">
      <ImagesInput
        label="Images"
        required={draft.media.images.length === 0 && !draft.media.noImage}
        bind:images={draft.media.images}
      >
        <!-- The human's say that this word has no image worth finding. -->
        {#if draft.media.images.length === 0}
          <span class="ml-auto text-sm text-gray-600">
            <Checkbox label="No image for this word" bind:checked={draft.media.noImage} />
          </span>
        {/if}
      </ImagesInput>
      <AudioInput bind:audio={draft.media.audio} word={draft.inputs.word} />
    </section>
  </section>

  <WordForms
    bind:draft={draft.inputs}
    {choices}
    {unoffered}
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
      word={draft.inputs.word.trim()}
      examplesWithoutWord={examplesWithoutWord({
        examples: draft.edits.examples ?? '',
        inputs: draft.inputs,
        formsField: draft.edits.forms ?? '',
      })}
      onedit={setEdit}
      bind:promptImages={draft.media.promptImages}
    />
  {/if}

  <SaveBar
    {attachments}
    fieldsWith={ankiFields}
    {onnextcard}
    {held}
    onsaved={(saved) => (held = saved)}
    onloadagain={loadAgain}
    ankiBlocker={status === undefined ? 'Checking Anki…' : ankiProblem}
    inputsBlocker={stillNeededMessage}
  />
</main>
