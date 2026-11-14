<script lang="ts">
import type { SameMeaningNote } from '#lib/api/anki.ts';
import { errorMessage } from '#lib/api/http.ts';

let {
  search,
  hintBlank,
}: {
  // `undefined` before there is a meaning, and the promise's `undefined` while typing goes on.
  search: Promise<SameMeaningNote[] | undefined> | undefined;
  hintBlank: boolean;
} = $props();

const quotedList = new Intl.ListFormat('en', { type: 'conjunction' });

function quoted(meanings: string[]): string {
  return quotedList.format(meanings.map((meaning) => `“${meaning}”`));
}
</script>

<!-- Present from the start, so a screen reader announces what arrives in it. -->
<div aria-live="polite">
  {#if search !== undefined}
    {#await search then notes}
      {#if notes !== undefined && notes.length > 0}
        <div class={['hint', hintBlank && 'text-amber-700']}>
          <p>
            {hintBlank
              ? 'Your deck has other words for this English, so say which one you want:'
              : 'Make sure your hint tells it apart from:'}
          </p>
          <ul class="list-disc ps-5">
            {#each notes as note (note.noteId)}
              <li>
                <bdi lang="he" class="font-hebrew text-base">{note.pointed || note.unpointed}</bdi>
                also means {quoted(note.sharedMeanings)},
                {#if note.productionContext === ''}
                  and has no hint yet.
                {:else}
                  with the hint “{note.productionContext}”.
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {:catch error}
      <p class="hint">Couldn't search your deck for this English: {errorMessage(error)}</p>
    {/await}
  {/if}
</div>
