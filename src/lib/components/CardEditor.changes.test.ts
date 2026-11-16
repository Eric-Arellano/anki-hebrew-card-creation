// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import { loadedNote } from '#tests/real-notes.ts';
import {
  choosePartOfSpeech,
  claudeAnswered,
  exampleRows,
  fillInputs,
  input,
  kelevEntry,
  kelevNote,
  noteField,
  renderConnectedEditor,
  typeExample,
  typeInto,
} from './CardEditor.harness.ts';

const PLURAL = 'Masculine plural, with niqqud';

// The line under an input or textarea, as its marker writes it.
function markerAfter(element: Element | null) {
  return element?.nextElementSibling?.textContent?.replace(/\s+/g, ' ');
}

function marker(label: string) {
  return markerAfter(input(label).closest('label'));
}

function groupMarker(name: string) {
  return markerAfter(screen.getByRole('group', { name }));
}

function saveBar() {
  return screen.getByRole('region', { name: 'Save' });
}

describe('CardEditor', () => {
  describe('while editing a note', () => {
    test('marks a changed value with what Anki holds, and restores it', async () => {
      await renderConnectedEditor({}, kelevNote());
      await typeInto(input(PLURAL), 'כְּלָבוֹת');

      expect(marker(PLURAL)).toBe('Was “כְּלָבִים” · Restore');
      await fireEvent.click(screen.getByRole('button', { name: `Restore ${PLURAL}` }));
      expect(input(PLURAL).value).toBe('כְּלָבִים');
      expect(marker(PLURAL)).toBeUndefined();
    });

    test('marks a cleared value', async () => {
      await renderConnectedEditor({}, kelevNote());
      await typeInto(input(PLURAL), '');
      expect(marker(PLURAL)).toBe('Cleared. Was “כְּלָבִים” · Restore');
    });

    test('marks a blank filled from the dictionary as added', async () => {
      await renderConnectedEditor(
        {
          lookup: {
            match: 'exact',
            candidates: [kelevEntry],
            titleHasEntry: true,
            staleIndex: false,
          },
        },
        kelevNote({ Forms: '' }),
      );
      await fireEvent.click(await screen.findByText(/Fill blanks from Wiktionary/));
      const dictionary = screen.getByRole('region', { name: 'Dictionary' });
      await fireEvent.click(within(dictionary).getByRole('button', { name: /כֶּלֶב/ }));

      expect(input(PLURAL).value).toBe('כְּלָבִים');
      expect(marker(PLURAL)).toBe('Added');
    });

    test('marks a changed note field', async () => {
      await renderConnectedEditor({}, kelevNote());
      await typeInto(noteField('Variant 1: Hebrew answer, with niqqud'), 'כַּלְבָּה קְטַנָּה');
      expect(markerAfter(noteField('Variant 1: Hebrew answer, with niqqud'))).toBe(
        'Was “כַּלְבָּה” · Restore',
      );
    });

    test('lists the fields a save would change', async () => {
      await renderConnectedEditor({}, kelevNote());
      await typeInto(input(PLURAL), 'כְּלָבוֹת');
      expect(within(saveBar()).getByText('Will change: Forms')).toBeTruthy();
    });

    test('marks a changed chip by its label, and restores it', async () => {
      await renderConnectedEditor({}, kelevNote());
      await fireEvent.click(screen.getByRole('radio', { name: 'Feminine' }));

      expect(groupMarker('Gender')).toBe('Was “Masculine” · Restore');
      await fireEvent.click(screen.getByRole('button', { name: 'Restore Gender' }));
      expect(screen.getByRole('radio', { name: 'Masculine', checked: true })).toBeTruthy();
    });

    test('marks a part of speech chosen for a note without one as added', async () => {
      await renderConnectedEditor({}, loadedNote('כלב'));
      await choosePartOfSpeech('Verb');
      expect(groupMarker('Part of speech')).toBe('Added');
    });

    test('marks a binyan chosen for a note without one as added', async () => {
      await renderConnectedEditor({}, loadedNote('כלב'));
      await choosePartOfSpeech('Verb');
      const binyan = screen.getByRole('combobox', { name: 'Binyan' });
      await fireEvent.change(binyan, { target: { value: "pi'el" } });
      expect(markerAfter(binyan.closest('label'))).toBe('Added');
    });

    test('marks each changed meaning, and restores it', async () => {
      await renderConnectedEditor({}, kelevNote());
      await typeInto(input('English meaning'), 'hound');
      expect(markerAfter(input('English meaning').parentElement)).toBe('Was “dog” · Restore');

      await fireEvent.click(screen.getByRole('button', { name: 'Restore English meaning' }));
      expect(input('English meaning').value).toBe('dog');
    });

    test('marks only the meaning added', async () => {
      await renderConnectedEditor({}, kelevNote());
      await fireEvent.click(screen.getByRole('button', { name: '+ Another meaning' }));
      await typeInto(input('English meaning 2'), 'hound');

      expect(markerAfter(input('English meaning 2').parentElement)).toBe('Added');
      expect(markerAfter(input('English meaning').parentElement)).toBeUndefined();
    });

    test('marks each side of an example on its own', async () => {
      await renderConnectedEditor({}, loadedNote('אמא'));
      await typeInto(input('Example 1 in English'), 'My mom is making dinner.');

      expect(markerAfter(input('Example 1 in English'))).toBe(
        'Was “My mom is cooking dinner.” · Restore',
      );
      expect(markerAfter(input('Example 1 in Hebrew'))).toBeUndefined();
      await fireEvent.click(screen.getByRole('button', { name: 'Restore Example 1 in English' }));
      expect(input('Example 1 in English').value).toBe('My mom is cooking dinner.');
    });

    test('marks both sides of examples written for a note without any as added', async () => {
      await renderConnectedEditor({}, kelevNote());
      await typeExample(1, { hebrew: 'הַכֶּלֶב נוֹבֵחַ', english: 'The dog barks' });
      expect(markerAfter(input('Example 1 in Hebrew'))).toBe('Added');
      expect(markerAfter(input('Example 1 in English'))).toBe('Added');
    });

    describe('once a row Anki holds is gone from the end', () => {
      test('lists it as removed, and restores it at its place', async () => {
        await renderConnectedEditor({}, loadedNote('אמא'));
        const rows = exampleRows();
        await fireEvent.click(screen.getByRole('button', { name: 'Remove example 2' }));

        const examples = noteField('Examples');
        expect(within(examples).getByText(/^Removed:/).textContent).toContain(rows[1]?.english);
        await fireEvent.click(screen.getByRole('button', { name: 'Restore example 2' }));
        expect(exampleRows()).toEqual(rows);
        expect(within(examples).queryByText(/^Removed:/)).toBeNull();
      });
    });

    test('marks a removed image by how many there were, and restores it', async () => {
      await renderConnectedEditor({}, kelevNote());
      const images = screen.getByRole('group', { name: 'Images' });
      await fireEvent.click(within(images).getByRole('button', { name: 'Remove image 1' }));

      expect(groupMarker('Images')).toBe('Cleared. Was 1 image · Restore');
      await fireEvent.click(screen.getByRole('button', { name: 'Restore Images' }));
      expect(within(images).getByRole('img', { name: 'Attachment 1' })).toBeTruthy();
    });

    test('marks removed audio', async () => {
      await renderConnectedEditor({}, kelevNote());
      await fireEvent.click(screen.getByRole('button', { name: 'Remove audio' }));
      expect(groupMarker('Audio')).toBe('Cleared. Was 1 recording · Restore');
    });

    describe('after a save', () => {
      test('clears the markers', async () => {
        await renderConnectedEditor({ notes: [kelevNote()] }, kelevNote());
        await typeInto(input(PLURAL), 'כְּלָבוֹת');
        await fireEvent.click(screen.getByRole('button', { name: 'Check and save' }));
        await claudeAnswered();
        await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
        await screen.findByText('Saved to Anki.');

        expect(input(PLURAL).value).toBe('כְּלָבוֹת');
        expect(marker(PLURAL)).toBeUndefined();
      });
    });
  });

  describe('for a new word', () => {
    test('marks nothing', async () => {
      await renderConnectedEditor();
      await fillInputs({ word: 'דג', pointed: 'דָּג', gloss: 'fish' });
      expect(marker('Hebrew word, with niqqud')).toBeUndefined();
      expect(screen.queryByText('Added')).toBeNull();
    });
  });
});
