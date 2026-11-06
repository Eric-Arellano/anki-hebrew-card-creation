<script lang="ts">
import { encodeImage, type ImageAttachment, pastedImages } from '#lib/card/image.ts';
import Checkbox from './ui/Checkbox.svelte';

let {
  images = $bindable(),
  noImage = $bindable(),
}: {
  images: ImageAttachment[];
  // The human's say that this word has no image worth finding.
  noImage: boolean;
} = $props();

let refusal: string | undefined = $state.raw();
let dragging = $state(false);

async function attach(files: readonly File[]) {
  refusal = undefined;
  const results = await Promise.allSettled(files.map(encodeImage));
  const refused = files.filter((_, index) => results[index]?.status === 'rejected');
  if (refused.length > 0) {
    refusal = `Couldn't read ${refused.map((file) => file.name).join(', ')} as an image.`;
  }

  // One image gets one name, so this catches a second paste, and a clipboard offering two formats.
  const encoded = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  images = [...images, ...encoded].filter(
    ({ filename }, index, all) => all.findIndex((image) => image.filename === filename) === index,
  );
}

function onpaste(event: ClipboardEvent) {
  const files = pastedImages(event.clipboardData);
  if (files.length === 0) return;
  event.preventDefault();
  attach(files);
}

function isTextField(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

// The whole page takes a drop, because one that misses would navigate to the file or link and lose
// the draft. A word or link dragged onto a text field still lands in the field.
function takesDrag({ dataTransfer, target }: DragEvent) {
  const types = dataTransfer?.types ?? [];
  return types.includes('Files') || (types.includes('text/uri-list') && !isTextField(target));
}

function ondragover(event: DragEvent) {
  if (!takesDrag(event)) return;
  event.preventDefault();
  dragging = true;
}

function ondragleave(event: DragEvent) {
  if (event.relatedTarget === null) dragging = false;
}

function ondrop(event: DragEvent) {
  dragging = false;
  if (!takesDrag(event)) return;
  event.preventDefault();

  const files = [...(event.dataTransfer?.files ?? [])];
  if (files.length > 0) {
    attach(files);
  } else {
    // Dragging from a web page can carry only the URL, and the tool never fetches.
    refusal = 'That drop only carried a link. Copy the image, then paste it here.';
  }
}

function onchange(event: Event & { currentTarget: HTMLInputElement }) {
  attach([...(event.currentTarget.files ?? [])]);
  // Otherwise picking the same file again, after removing it, fires no change.
  event.currentTarget.value = '';
}

function showing(blob: Blob) {
  return (image: HTMLImageElement) => {
    const url = URL.createObjectURL(blob);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  };
}
</script>

<svelte:window {onpaste} {ondragover} {ondragleave} {ondrop} />

<div
  class={[
    'space-y-2 rounded-md border border-dashed p-3',
    dragging ? 'border-blue-600 bg-blue-50' : 'border-gray-300',
  ]}
>
  <div class="flex flex-wrap items-center gap-2">
    <span class={{ 'required-mark': images.length === 0 && !noImage }}>Images</span>
    <label class="chip cursor-pointer text-sm hover:bg-gray-50 has-focus-visible:ring-2">
      Choose files
      <input class="sr-only" type="file" accept="image/*" multiple {onchange}>
    </label>
    <span class="hint">or paste or drop one anywhere</span>
    {#if images.length === 0}
      <span class="ml-auto text-sm text-gray-600">
        <Checkbox label="No image for this word" bind:checked={noImage} />
      </span>
    {/if}
  </div>

  {#if images.length > 0}
    <ul class="flex flex-wrap gap-2">
      {#each images as image, index (image.filename)}
        <li class="relative">
          <img
            class="h-24 rounded-md border border-gray-200"
            alt="Attachment {index + 1}"
            {@attach showing(image.blob)}
          >
          <button
            type="button"
            class="absolute top-1 right-1 h-6 w-6 p-0 leading-none"
            aria-label="Remove image {index + 1}"
            onclick={() => (images = images.toSpliced(index, 1))}
          >
            ×
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if refusal !== undefined}
    <p role="alert" class="text-red-700">{refusal}</p>
  {/if}
</div>
