<script lang="ts">
// Listens on the window, beside every `ImagesInput`, which leave audio to this one wherever it is
// pasted or dropped, since a note has only one place for it.
import { type Attachment, audioAttachment, isAudio, pastedFiles } from '#lib/media/attach.ts';

let { audio = $bindable() }: { audio: Attachment | undefined } = $props();

let refusal: string | undefined = $state.raw();

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

function playing(blob: Blob) {
  return (player: HTMLAudioElement) => {
    const url = URL.createObjectURL(blob);
    player.src = url;
    return () => URL.revokeObjectURL(url);
  };
}
</script>

<svelte:window {onpaste} {ondrop} />

<fieldset aria-label="Audio" class="space-y-2 rounded-md border border-dashed border-gray-300 p-3">
  <div class="flex flex-wrap items-center gap-2">
    <span>Audio</span>
    <label class="chip cursor-pointer text-sm hover:bg-gray-50 has-focus-visible:ring-2">
      Choose file
      <input class="sr-only" type="file" accept=".mp3,audio/mpeg" {onchange}>
    </label>
    <span class="hint">or paste or drop an MP3</span>
  </div>

  {#if audio === undefined}
    <!-- `{{Audio}}` is the whole Listening front, so the template makes no card without it. -->
    <p class="hint">Without audio, this note gets no Listening card.</p>
  {:else}
    <div class="flex flex-wrap items-center gap-2">
      <!-- biome-ignore lint/a11y/useMediaCaption: A pronunciation is one word, named beside it. -->
      <audio controls aria-label="Recording" {@attach playing(audio.blob)}></audio>
      <span>{audio.filename}</span>
      <button
        type="button"
        class="h-6 w-6 p-0 leading-none"
        aria-label="Remove audio"
        onclick={() => (audio = undefined)}
      >
        ×
      </button>
    </div>
  {/if}

  {#if refusal !== undefined}
    <p role="alert" class="text-red-700">{refusal}</p>
  {/if}
</fieldset>
