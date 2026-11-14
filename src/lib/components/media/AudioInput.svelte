<script lang="ts">
// Listens on the window, beside every `ImagesInput`, which leave audio to this one wherever it is
// pasted or dropped, since a note has only one place for it.
import { untrack } from 'svelte';
import {
  type ForvoDownload,
  fetchForvoDownload,
  fetchForvoDownloads,
  forvoDownloadUrl,
} from '#lib/api/forvo.ts';
import { errorMessage } from '#lib/api/http.ts';
import {
  type Attachment,
  audioAttachment,
  isAudio,
  pastedFiles,
  showingAttachment,
} from '#lib/media/attach.ts';
import { afterTypingPauses } from '#lib/typing-pause.ts';

let { audio = $bindable(), word }: { audio: Attachment | undefined; word: string } = $props();

let refusal: string | undefined = $state.raw();
// What Downloads holds for the word, while the note has no audio: several downloads to choose
// from, or why the folder couldn't be read.
let pickup:
  | { kind: 'choices'; downloads: ForvoDownload[] }
  | { kind: 'problem'; message: string }
  | undefined = $state.raw();
// The word the attached audio was found in Downloads for. It is that word's recording, so another
// word drops it.
let foundFor: string | undefined;
// The word whose found recording the human removed. Its downloads become choices rather than
// attaching themselves again.
let declinedFor: string | undefined;

const wanted = $derived(word.trim());

// The human downloads from Forvo in another tab, so this looks when the word changes and whenever
// the tab regains focus. One download attaches itself, and several are choices, per Never guess.
async function lookInDownloads() {
  const lookingFor = wanted;
  if (audio !== undefined || lookingFor === '') {
    pickup = undefined;
    return;
  }
  try {
    const found = await afterTypingPauses(
      lookingFor,
      () => wanted,
      () => fetchForvoDownloads(lookingFor),
    );
    if (found === undefined || lookingFor !== wanted || audio !== undefined) return;
    if (found.kind === 'unreadable') {
      pickup = { kind: 'problem', message: found.message };
      return;
    }
    const [only, ...others] = found.downloads;
    if (only === undefined) {
      pickup = undefined;
    } else if (others.length === 0 && declinedFor !== lookingFor) {
      await attachDownload(only, lookingFor);
    } else {
      pickup = { kind: 'choices', downloads: found.downloads };
    }
  } catch (error) {
    pickup = { kind: 'problem', message: errorMessage(error) };
  }
}

async function attachDownload(download: ForvoDownload, forWord: string) {
  try {
    const file = await fetchForvoDownload(download);
    if (forWord !== wanted) return;
    audio = audioAttachment(file);
    foundFor = forWord;
    pickup = undefined;
    refusal = undefined;
  } catch (error) {
    pickup = { kind: 'problem', message: errorMessage(error) };
  }
}

$effect(() => {
  const current = wanted;
  untrack(() => {
    if (foundFor !== undefined && foundFor !== current) {
      audio = undefined;
      foundFor = undefined;
    }
    lookInDownloads();
  });
});

function remove() {
  if (foundFor !== undefined) declinedFor = foundFor;
  audio = undefined;
  foundFor = undefined;
  lookInDownloads();
}

// Takes nothing unless `files` holds audio, and then at most one MP3.
function attach(files: readonly File[]): boolean {
  const [recording, ...others] = files.filter(isAudio);
  if (recording === undefined) return false;
  const attachment = audioAttachment(recording);
  if (others.length > 0) {
    refusal = 'A note holds one recording. Attach just one.';
  } else if (attachment === undefined) {
    refusal = `Couldn't attach ${recording.name}: only MP3 audio is stored.`;
  } else {
    refusal = undefined;
    audio = attachment;
    foundFor = undefined;
    pickup = undefined;
  }
  return true;
}

function onpaste(event: ClipboardEvent) {
  if (attach(pastedFiles(event.clipboardData))) event.preventDefault();
}

function ondrop(event: DragEvent) {
  if (attach([...(event.dataTransfer?.files ?? [])])) event.preventDefault();
}

function onchange(event: Event & { currentTarget: HTMLInputElement }) {
  attach([...(event.currentTarget.files ?? [])]);
  // Otherwise picking the same file again, after removing it, fires no change.
  event.currentTarget.value = '';
}
</script>

<svelte:window {onpaste} {ondrop} onfocus={lookInDownloads} />

<fieldset aria-label="Audio" class="space-y-2 rounded-md border border-dashed border-gray-300 p-3">
  <div class="flex flex-wrap items-center gap-2">
    <span>Audio</span>
    <label class="chip cursor-pointer text-sm hover:bg-gray-50 has-focus-visible:ring-2">
      Choose file
      <input class="sr-only" type="file" accept=".mp3,audio/mpeg" {onchange}>
    </label>
    <span class="hint">or paste or drop an MP3, or download it from Forvo</span>
  </div>

  {#if audio === undefined}
    <!-- `{{Audio}}` is the whole Listening front, so the template makes no card without it. -->
    <p class="hint">Without audio, this note gets no Listening card.</p>
  {:else}
    <div class="flex flex-wrap items-center gap-2">
      <!-- biome-ignore lint/a11y/useMediaCaption: A pronunciation is one word, named beside it. -->
      <audio controls aria-label="Recording" {@attach showingAttachment(audio)}></audio>
      <span>{audio.filename}</span>
      <button
        type="button"
        class="h-6 w-6 p-0 leading-none"
        aria-label="Remove audio"
        onclick={remove}
      >
        ×
      </button>
    </div>
  {/if}

  {#if pickup?.kind === 'choices'}
    <ul aria-label="Found in Downloads" class="space-y-1">
      {#each pickup.downloads as download (download.filename)}
        <li class="flex flex-wrap items-center gap-2">
          <!-- biome-ignore lint/a11y/useMediaCaption: A pronunciation is one word, named beside it. -->
          <audio controls preload="none" src={forvoDownloadUrl(download.filename)}></audio>
          <span>{download.filename}</span>
          <button
            type="button"
            class="chip text-sm"
            aria-label={`Attach ${download.filename}`}
            onclick={() => attachDownload(download, wanted)}
          >
            Attach
          </button>
        </li>
      {/each}
    </ul>
  {:else if pickup?.kind === 'problem'}
    <p class="hint">Couldn't look in Downloads: {pickup.message}</p>
  {/if}

  {#if refusal !== undefined}
    <p role="alert" class="text-red-700">{refusal}</p>
  {/if}
</fieldset>
