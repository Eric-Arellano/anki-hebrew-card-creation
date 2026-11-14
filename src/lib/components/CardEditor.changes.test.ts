// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { LoadedNote } from '#lib/api/anki.ts';
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import { loadedNote } from '#tests/real-notes.ts';
import {
  fillInputs,
  input,
  noteField,
  renderConnectedEditor,
  typeInto,
} from './CardEditor.harness.ts';

const PLURAL = 'Masculine plural, with niqqud';

// As the lookup answers for the fixture dictionary.
const kelevEntry: DictionaryCandidate = {
  id: 1,
  title: 'כלב',
  pointed: 'כֶּלֶב',
  wiktionaryPartOfSpeech: 'noun',
  definitions: ['dog', '(derogatory) scoundrel, bitch'],
  roots: [],
  partOfSpeech: 'noun',
  noun: {
    gender: { gender: 'm', pluralOnly: false },
    plurals: ['כְּלָבִים'],
    feminineSingulars: ['כַּלְבָּה'],
    femininePlurals: ['כְּלָבוֹת'],
  },
};

function kelev(fields: Record<string, string> = {}): LoadedNote {
  const note = loadedNote('כלב');
  return { ...note, fields: { ...note.fields, 'Part of speech': 'noun', ...fields } };
}

// The line under an input or textarea, as its marker writes it.
function markerAfter(element: Element | null) {
  return element?.nextElementSibling?.textContent?.replace(/\s+/g, ' ');
}

function marker(label: string) {
  return markerAfter(input(label).closest('label'));
}

function saveBar() {
  return screen.getByRole('region', { name: 'Save' });
}

describe('CardEditor', () => {
  describe('while editing a note', () => {
    test('marks a changed value with what Anki holds, and restores it', async () => {
      await renderConnectedEditor({}, kelev());
      await typeInto(input(PLURAL), 'כְּלָבוֹת');

      expect(marker(PLURAL)).toBe('Was “כְּלָבִים” · Restore');
      await fireEvent.click(screen.getByRole('button', { name: `Restore ${PLURAL}` }));
      expect(input(PLURAL).value).toBe('כְּלָבִים');
      expect(marker(PLURAL)).toBeUndefined();
    });

    test('marks a cleared value', async () => {
      await renderConnectedEditor({}, kelev());
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
        kelev({ Forms: '' }),
      );
      await fireEvent.click(await screen.findByText(/Fill blanks from Wiktionary/));
      const dictionary = screen.getByRole('region', { name: 'Dictionary' });
      await fireEvent.click(within(dictionary).getByRole('button', { name: /כֶּלֶב/ }));

      expect(input(PLURAL).value).toBe('כְּלָבִים');
      expect(marker(PLURAL)).toBe('Added');
    });

    test('marks a changed note field', async () => {
      await renderConnectedEditor({}, kelev());
      await typeInto(noteField('Variant 1: Hebrew answer, with niqqud'), 'כַּלְבָּה קְטַנָּה');
      expect(markerAfter(noteField('Variant 1: Hebrew answer, with niqqud'))).toBe(
        'Was “כַּלְבָּה” · Restore',
      );
    });

    test('lists the fields a save would change', async () => {
      await renderConnectedEditor({}, kelev());
      await typeInto(input(PLURAL), 'כְּלָבוֹת');
      expect(within(saveBar()).getByText('Will change: Forms')).toBeTruthy();
    });

    describe('after a save', () => {
      test('clears the markers', async () => {
        await renderConnectedEditor({ notes: [kelev()] }, kelev());
        await typeInto(input(PLURAL), 'כְּלָבוֹת');
        await fireEvent.click(screen.getByRole('button', { name: 'Check and save' }));
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
