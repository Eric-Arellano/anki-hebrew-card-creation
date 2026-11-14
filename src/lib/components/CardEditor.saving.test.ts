// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import type { LoadedNote } from '#lib/api/anki.ts';
import { loadedNote } from '#tests/real-notes.ts';
import {
  input,
  renderConnectedEditor,
  saveRequests,
  stubServer,
  typeInto,
} from './CardEditor.harness.ts';
import CardEditor from './CardEditor.svelte';

// With its part of speech filled in, the one input the fixture lacks.
const kelev: LoadedNote = (() => {
  const note = loadedNote('כלב');
  return { ...note, fields: { ...note.fields, 'Part of speech': 'noun' } };
})();

function saveButton() {
  return screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
}

async function changeMeaning(meaning: string) {
  await typeInto(input('English meaning'), meaning);
}

describe('CardEditor', () => {
  describe('saving a loaded note', () => {
    test('shows what will change, then writes only that', async () => {
      const requests = await renderConnectedEditor({ notes: [kelev] }, kelev);
      await changeMeaning('hound');

      await fireEvent.click(saveButton());
      const changed = [...document.querySelectorAll('dt')].map((term) => term.parentElement);
      expect(changed.map((change) => change?.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        'Definitions Before: dog After: hound',
      ]);
      expect(saveRequests(requests)).toEqual([]);

      await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await screen.findByText('Saved to Anki.');
      expect(saveRequests(requests)).toEqual([
        {
          method: 'POST',
          path: `/api/anki/notes/${kelev.noteId}`,
          body: { fields: { Definitions: 'hound' }, mod: kelev.mod },
        },
      ]);
    });

    test('takes Cmd+Enter twice', async () => {
      const requests = await renderConnectedEditor({ notes: [kelev] }, kelev);
      await changeMeaning('hound');
      await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
      await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
      await screen.findByText('Saved to Anki.');
      expect(saveRequests(requests)).toHaveLength(1);
    });

    test('builds the next save on the note as the last one left it', async () => {
      const requests = await renderConnectedEditor({ notes: [kelev] }, kelev);
      await changeMeaning('hound');
      await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
      await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
      await screen.findByText('Saved to Anki.');
      expect(saveButton().disabled).toBe(true);

      await changeMeaning('mutt');
      await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
      await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
      await vi.waitFor(() => expect(saveRequests(requests)).toHaveLength(2));
      expect(saveRequests(requests)[1]?.body).toEqual({
        fields: { Definitions: 'mutt' },
        mod: kelev.mod + 1,
      });
    });

    describe('when nothing reads differently', () => {
      test('is disabled, and says so', async () => {
        await renderConnectedEditor({ notes: [kelev] }, kelev);
        expect(saveButton().disabled).toBe(true);
        expect(screen.getByText(/Nothing to save/)).toBeTruthy();
      });
    });

    describe('when an input is still blank', () => {
      test('is disabled, and names the input', async () => {
        await renderConnectedEditor({ notes: [kelev] }, loadedNote('כלב'));
        expect(saveButton().disabled).toBe(true);
        expect(screen.getByText('Still needed: part of speech')).toBeTruthy();
      });
    });

    describe('when the note changed in Anki since it loaded', () => {
      test('offers to load it again', async () => {
        const inAnki = { ...kelev, mod: kelev.mod + 1 };
        stubServer({
          notes: [inAnki],
          saveNote: () =>
            Response.json(
              { message: 'The note changed in Anki since it loaded here.' },
              { status: 409 },
            ),
        });
        const onopennote = vi.fn();
        render(CardEditor, { note: kelev, onopennote });
        await screen.findByText(/Connected to Anki/);
        await changeMeaning('hound');
        await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
        await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });

        const bar = screen.getByRole('region', { name: 'Hand-off' });
        expect((await within(bar).findByRole('alert')).textContent).toContain(
          'The note changed in Anki since it loaded here.',
        );
        await fireEvent.click(within(bar).getByRole('button', { name: 'Load again' }));
        await vi.waitFor(() => expect(onopennote).toHaveBeenCalledWith(inAnki));
      });
    });

    describe('when Anki refuses the write', () => {
      test('shows its reason', async () => {
        await renderConnectedEditor(
          {
            notes: [kelev],
            saveNote: () =>
              Response.json(
                { message: 'AnkiConnect refused updateNoteFields: Close the affected editor' },
                { status: 502 },
              ),
          },
          kelev,
        );
        await changeMeaning('hound');
        await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
        await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
        expect((await screen.findByRole('alert')).textContent).toBe(
          'AnkiConnect refused updateNoteFields: Close the affected editor',
        );
      });
    });
  });
});
