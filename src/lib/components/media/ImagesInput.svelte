<script lang="ts">
// Every copy of this widget listens on the window, and each acts only on the images it claims, so
// exactly one takes a paste or a drop. A paste goes by focus, because the human copies in another
// tab and comes back with the focus where they left it, often on the search link they clicked. A
// drop goes by where it lands.
import type { Snippet } from 'svelte';
import { encodeImages, imageFieldAt, pastedImages, withAttached } from '#lib/media/attach.ts';
import type { ImageAttachment } from '#lib/media/image.ts';
import type { VariantPrompt } from '#lib/note-type.ts';

let {
  images = $bindable(),
  label,
  prompt,
  required = false,
  children,
}: {
  images: ImageAttachment[];
  // Names the widget for screen readers, since every copy shows "Images".
  label: string;
  // The variant prompt these images follow, whose block, marked `data-image-field`, aims pastes and
  // drops here. Without one, these are the word's `Images`, which take whatever no block claims.
  prompt?: VariantPrompt;
  required?: boolean;
  // Shown after the hint.
  children?: Snippet;
} = $props();

let refusal: string | undefined = $state.raw();
let dropLandsHere = $state(false);
let pasteLandsHere = $state(false);

function claims(element: EventTarget | null) {
  return imageFieldAt(element) === prompt;
}

async function attach(files: readonly File[]) {
  refusal = undefined;
  const result = await encodeImages(files);
  refusal = result.refusal;
  // Read after the wait, so an image removed while these encoded stays removed.
  images = withAttached(images, result.encoded);
}

function onpaste(event: ClipboardEvent) {
  if (!claims(document.activeElement)) return;
  const files = pastedImages(event.clipboardData);
  if (files.length === 0) return;
  event.preventDefault();
  attach(files);
}

function followFocus() {
  pasteLandsHere = claims(document.activeElement);
}

// While focus moves, the element losing it is no longer active, so read where it is going. Leaving
// the window has no such target and keeps the active element, which is where a paste will land.
function onfocusout(event: FocusEvent) {
  pasteLandsHere = claims(event.relatedTarget ?? document.activeElement);
}

function isTextField(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

// The whole page takes a drop, because one that misses would navigate to the file or link and lose
// the draft. A word or link dragged onto a text field still lands in the field.
function claimsDrag({ dataTransfer, target }: DragEvent) {
  const types = dataTransfer?.types ?? [];
  const droppable =
    types.includes('Files') || (types.includes('text/uri-list') && !isTextField(target));
  return droppable && claims(target);
}

function ondragover(event: DragEvent) {
  dropLandsHere = claimsDrag(event);
  if (dropLandsHere) event.preventDefault();
}

function ondragleave(event: DragEvent) {
  if (event.relatedTarget === null) dropLandsHere = false;
}

function ondrop(event: DragEvent) {
  dropLandsHere = false;
  if (!claimsDrag(event)) return;
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

<svelte:window {onpaste} onfocusin={followFocus} {onfocusout} {ondragover} {ondragleave} {ondrop} />

<fieldset
  aria-label={label}
  class={[
    'space-y-2 rounded-md border border-dashed p-3',
    dropLandsHere ? 'border-blue-600 bg-blue-50' : 'border-gray-300',
  ]}
  {@attach followFocus}
>
  <div class="flex flex-wrap items-center gap-2">
    <span class={{ 'required-mark': required }}>Images</span>
    <label class="chip cursor-pointer text-sm hover:bg-gray-50 has-focus-visible:ring-2">
      Choose files
      <input class="sr-only" type="file" accept="image/*" multiple {onchange}>
    </label>
    <span class="hint">or paste or drop one</span>
    {#if pasteLandsHere}
      <span class="hint text-blue-700"><kbd>⌘V</kbd> pastes here</span>
    {/if}
    {@render children?.()}
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
</fieldset>
