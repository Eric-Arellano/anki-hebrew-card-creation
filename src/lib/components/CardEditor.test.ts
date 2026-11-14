// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import { FIELD_HELP } from '#lib/field-help.ts';
import { loadedNote } from '#tests/real-notes.ts';
import {
  addToDeck,
  chooseNoun,
  choosePartOfSpeech,
  exampleRows,
  fillDag,
  fillInputs,
  fillVerb,
  input,
  noteField,
  renderConnectedEditor,
  skipImage,
  typeExample,
  typeInto,
} from './CardEditor.harness.ts';

describe('CardEditor', () => {
  describe('two meanings', () => {
    test('send numbered definitions, and each has its own image search', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await fireEvent.click(screen.getByRole('button', { name: '+ Another meaning' }));
      await typeInto(input('English meaning 2'), 'Pisces');

      expect(
        screen
          .getAllByRole('link', { name: 'Images (EN)' })
          .map((link) => link.getAttribute('href')),
      ).toEqual([
        'https://www.google.com/search?udm=2&q=fish',
        'https://www.google.com/search?udm=2&q=Pisces',
      ]);
      await skipImage();
      expect(await addToDeck(requests)).toMatchObject({
        fields: { Definitions: '1. fish<br>2. Pisces' },
      });
    });

    describe('after removing the first', () => {
      test('keep the second', async () => {
        await renderConnectedEditor();
        await fillDag();
        await fireEvent.click(screen.getByRole('button', { name: '+ Another meaning' }));
        await typeInto(input('English meaning 2'), 'Pisces');
        await fireEvent.click(screen.getByRole('button', { name: 'Remove English meaning' }));
        expect(input('English meaning').value).toBe('Pisces');
        expect(screen.queryByLabelText('English meaning 2')).toBeNull();
      });
    });

    describe('when only one is left', () => {
      test('clear it rather than remove it, once there is something to clear', async () => {
        await renderConnectedEditor();
        function clear() {
          return screen.getByRole('button', { name: 'Clear English meaning' }) as HTMLButtonElement;
        }
        expect(clear().disabled).toBe(true);
        await typeInto(input('English meaning'), 'fish');
        await fireEvent.click(clear());
        expect(input('English meaning').value).toBe('');
        expect(clear().disabled).toBe(true);
      });
    });

    describe('after removing the second', () => {
      test('send the first alone', async () => {
        await renderConnectedEditor();
        await fillDag();
        await fireEvent.click(screen.getByRole('button', { name: '+ Another meaning' }));
        await typeInto(input('English meaning 2'), 'Pisces');
        await fireEvent.click(screen.getByRole('button', { name: 'Remove English meaning 2' }));
        expect(screen.queryByLabelText('English meaning 2')).toBeNull();
        expect(screen.getAllByRole('link', { name: 'Images (EN)' })).toHaveLength(1);
      });
    });
  });

  describe('the note fields', () => {
    describe('before the part of speech is chosen', () => {
      test('are not shown', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'דג', pointed: 'דָּג', gloss: 'fish' });
        expect(screen.queryByLabelText('Notes', { selector: 'textarea' })).toBeNull();
      });
    });

    describe('once the part of speech is chosen', () => {
      test('are shown, even while another input is blank', async () => {
        await renderConnectedEditor();
        await choosePartOfSpeech('Other');
        expect(noteField('Notes')).toBeTruthy();
      });
    });

    test('explain when to fill a field, outside the field', async () => {
      await renderConnectedEditor();
      await choosePartOfSpeech('Other');
      const readingContext = noteField('Hint for reading the Hebrew without niqqud');
      expect(readingContext.placeholder).toBe('');
      expect(
        document.getElementById(readingContext.getAttribute('aria-describedby') ?? '')?.textContent,
      ).toBe(FIELD_HELP.readingContext.other);
    });

    test('send an edit under its name in Anki', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await typeInto(noteField('Hint for reading the Hebrew without niqqud'), 'הדג גדול');

      await skipImage();
      expect(await addToDeck(requests)).toMatchObject({
        fields: { 'Reading context': 'הדג גדול' },
      });
    });

    test('send each new line as a line break', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await typeInto(noteField('Notes'), 'first\nsecond');

      await skipImage();
      expect(await addToDeck(requests)).toMatchObject({
        fields: { Notes: 'first<br>second' },
      });
    });

    describe('for the variants', () => {
      test('explain with examples for the part of speech', async () => {
        await renderConnectedEditor();
        await choosePartOfSpeech('Verb');
        const answer = noteField('Variant 1: Hebrew answer, with niqqud');
        expect(
          document.getElementById(answer.getAttribute('aria-describedby') ?? '')?.textContent,
        ).toBe(FIELD_HELP.variant1Answer.verb);
      });
    });

    describe('for the production context', () => {
      const mechonit = {
        noteId: 1751762491688,
        unpointed: 'מכונית',
        pointed: 'מְכוֹנִית',
        sharedMeanings: ['car'],
        productionContext: '',
      };

      async function fillOto() {
        await fillInputs({ word: 'אוטו', pointed: 'אוֹטוֹ', gloss: 'car' });
        await choosePartOfSpeech('Other');
      }

      test('asks for a hint while the deck has another word for the English', async () => {
        const requests = await renderConnectedEditor({ sameMeaning: [mechonit] });
        await fillOto();
        const listed = await screen.findByText(/also means/);
        expect(listed.textContent?.replace(/\s+/g, ' ').trim()).toBe(
          'מְכוֹנִית also means “car”, and has no hint yet.',
        );
        expect(
          screen.getByText(/so say which one you want/).closest('.text-amber-700'),
        ).toBeTruthy();
        expect(requests.map((request) => request.path)).toContain(
          `/api/anki/same-meaning?meaning=car&word=${encodeURIComponent('אוטו')}`,
        );

        await typeInto(
          noteField('Hint for recalling the Hebrew from its English meaning'),
          'slang',
        );
        expect(screen.getByText('Make sure your hint tells it apart from:')).toBeTruthy();
        expect(screen.queryByText(/so say which one you want/)).toBeNull();
      });

      test("shows the other word's hint", async () => {
        await renderConnectedEditor({
          sameMeaning: [{ ...mechonit, productionContext: 'formal' }],
        });
        await fillOto();
        expect((await screen.findByText(/also means/)).textContent).toContain(
          'with the hint “formal”.',
        );
      });

      test('says nothing while the deck has no other word for the English', async () => {
        const requests = await renderConnectedEditor();
        await fillOto();
        await vi.waitFor(() =>
          expect(requests.map((request) => request.path)).toContain(
            `/api/anki/same-meaning?meaning=car&word=${encodeURIComponent('אוטו')}`,
          ),
        );
        // The reply lands after the request is made.
        await new Promise((resolve) => setTimeout(resolve));
        expect(screen.queryByText(/also means/)).toBeNull();
      });

      describe('while editing a note', () => {
        test('leaves the note itself out', async () => {
          const oto = loadedNote('אוטו');
          const otoFound = { ...mechonit, noteId: oto.noteId, unpointed: 'אוטו', pointed: 'אוֹטוֹ' };
          await renderConnectedEditor({ sameMeaning: [otoFound, mechonit], notes: [oto] }, oto);
          await choosePartOfSpeech('Other');
          expect(
            (await screen.findAllByText(/also means/)).map((item) => item.textContent),
          ).toEqual([expect.stringContaining('מְכוֹנִית')]);
        });
      });
    });

    describe('for the examples', () => {
      test('warn of a row that uses no form of the word, until it does', async () => {
        await renderConnectedEditor();
        await fillDag();
        await typeExample(1, { hebrew: 'הדג שוחה.', english: 'The fish swims.' });
        await fireEvent.click(screen.getByRole('button', { name: '+ Another example' }));
        await typeExample(2, { hebrew: 'החתול ישן.', english: 'The cat sleeps.' });
        expect(screen.getByText(/No form of/).textContent?.trim()).toBe('No form of דג');
        expect(input('Example 2 in Hebrew').getAttribute('aria-describedby')).toBe(
          screen.getByText(/No form of/).id,
        );
        expect(input('Example 1 in Hebrew').getAttribute('aria-describedby')).toBeNull();

        await typeInto(input('Example 2 in Hebrew'), 'הדג ישן.');
        expect(screen.queryByText(/No form of/)).toBeNull();
      });

      test('remove the row whose × is clicked, even the first', async () => {
        await renderConnectedEditor();
        await fillDag();
        for (const row of [1, 2, 3]) {
          if (row > 1) {
            await fireEvent.click(screen.getByRole('button', { name: '+ Another example' }));
          }
          await typeExample(row, { hebrew: `דג ${row}.`, english: `Fish ${row}.` });
        }
        await fireEvent.click(screen.getByRole('button', { name: 'Remove example 2' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Remove example 1' }));
        expect(exampleRows()).toEqual([{ hebrew: 'דג 3.', english: 'Fish 3.' }]);
      });

      test('clear the last row rather than remove it', async () => {
        await renderConnectedEditor();
        await fillDag();
        function clear() {
          return screen.getByRole('button', { name: 'Clear example 1' }) as HTMLButtonElement;
        }
        expect(clear().disabled).toBe(true);
        await typeExample(1, { hebrew: 'דג.', english: '' });
        await fireEvent.click(clear());
        expect(exampleRows()).toEqual([{ hebrew: '', english: '' }]);
        expect(clear().disabled).toBe(true);
      });
    });

    describe('for a variant', () => {
      test('search images for its prompt, once there is one', async () => {
        await renderConnectedEditor();
        await choosePartOfSpeech('Other');
        const prompt = noteField('Variant 1: English prompt');
        const promptField = prompt.closest('[data-image-field]') as HTMLElement;
        expect(within(promptField).getByText('Images (EN)').title).toBe('Type the prompt first');
        await typeInto(prompt, 'good tables');
        expect(
          within(promptField).getByRole('link', { name: 'Images (EN)' }).getAttribute('href'),
        ).toBe('https://www.google.com/search?udm=2&q=good%20tables');
      });
    });
  });

  describe('the sections', () => {
    function sectionHeadings() {
      return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    }

    test('wait for a part of speech before the note fields', async () => {
      await renderConnectedEditor();
      expect(sectionHeadings()).toEqual(['Word', 'Grammar', 'Media']);
    });

    test('come in workflow order', async () => {
      await renderConnectedEditor();
      await fillDag();
      expect(sectionHeadings()).toEqual([
        'Word',
        'Grammar',
        'Media',
        'Hints and examples',
        'Unusual variants',
        'Notes',
      ]);
    });

    test('put the grammar fields with the forms', async () => {
      await renderConnectedEditor();
      await fillDag();
      const grammar = screen.getByRole('region', { name: 'Grammar' });
      expect(within(grammar).getByLabelText('Other forms')).toBeTruthy();
    });
  });

  describe('the fields shown', () => {
    function shownFieldIds() {
      return [...document.querySelectorAll('textarea')].map((textarea) => textarea.id);
    }

    test('leave out the inputs and the media', async () => {
      await renderConnectedEditor();
      await fillDag();
      for (const field of ['unpointed', 'pointed', 'definitions', 'images', 'audio']) {
        expect(shownFieldIds()).not.toContain(`field-${field}`);
      }
    });

    test('follow the part of speech', async () => {
      await renderConnectedEditor();
      await fillDag();
      expect(shownFieldIds()).toContain('field-forms');
      await choosePartOfSpeech('Verb');
      expect(shownFieldIds()).not.toContain('field-forms');
      expect(shownFieldIds()).toContain('field-notes');
    });

    describe('when a field is hidden after being edited', () => {
      test('sends what composition gives it instead', async () => {
        const requests = await renderConnectedEditor();
        await fillDag();
        await typeInto(noteField('Other forms'), 'f: דָּגָה');
        await chooseNoun('Masculine');
        await typeInto(input('Masculine plural, with niqqud'), 'דָּגִים');

        await skipImage();
        expect(await addToDeck(requests)).toMatchObject({ fields: { Forms: 'pl: דָּגִים' } });
      });

      test('sends it blank when composition gives it nothing', async () => {
        const requests = await renderConnectedEditor();
        await fillDag();
        await typeInto(noteField('Other forms'), 'f: דָּגָה');
        await fillVerb("pa'al", 'דוג');
        await fireEvent.click(screen.getByRole('radio', { name: 'None' }));

        await skipImage();
        expect(await addToDeck(requests)).toMatchObject({ fields: { Forms: '' } });
      });
    });
  });

  describe('the deck check', () => {
    describe('when the word is in the deck', () => {
      test('warns, naming the note', async () => {
        await renderConnectedEditor({
          existing: {
            exactMatches: [
              {
                noteId: 1751686072898,
                unpointed: 'כלב',
                pointed: 'כֶּלֶב',
                partOfSpeech: '',
                definitions: '',
              },
            ],
            sameRootMatches: [],
            relatedMatches: [],
          },
        });
        await typeInto(input('Hebrew word, without niqqud'), 'כלב');
        const check = screen.getByRole('region', { name: 'Already in the deck' });
        expect(await within(check).findByText('Already in your deck. Edit it?')).toBeTruthy();
        expect(within(check).getByRole('button', { name: /כֶּלֶב/ })).toBeTruthy();
      });
    });

    describe('when only related notes are in the deck', () => {
      test('lists them without warning', async () => {
        await renderConnectedEditor({
          existing: {
            exactMatches: [],
            sameRootMatches: [],
            relatedMatches: [
              {
                noteId: 1752426864218,
                unpointed: 'בית משפט',
                pointed: 'בֵּית מִשְׁפָּט',
                partOfSpeech: '',
                definitions: '',
              },
            ],
          },
        });
        await typeInto(input('Hebrew word, without niqqud'), 'בית');
        const check = screen.getByRole('region', { name: 'Already in the deck' });
        expect(await within(check).findByText('Related notes in your deck')).toBeTruthy();
        expect(within(check).queryByText('Already in your deck. Edit it?')).toBeNull();
      });
    });

    describe('when notes share the root', () => {
      test('lists them under the root', async () => {
        const requests = await renderConnectedEditor({
          existing: {
            exactMatches: [],
            sameRootMatches: [
              {
                noteId: 1752427043636,
                unpointed: 'בית ספר',
                pointed: 'בֵּית סֵפֶר',
                partOfSpeech: '',
                definitions: 'school',
              },
            ],
            relatedMatches: [],
          },
        });
        await typeInto(input('Hebrew word, without niqqud'), 'ספר');
        await choosePartOfSpeech('Noun');
        await typeInto(input('Root, like דבר or ד.ב.ר'), 'ס.פ.ר');
        const check = screen.getByRole('region', { name: 'Already in the deck' });
        expect((await within(check).findByText('Same root')).textContent).toContain('ס־פ־ר');
        expect(within(check).getByRole('button', { name: /בֵּית סֵפֶר/ })).toBeTruthy();
        expect(requests.map((request) => request.path)).toContain(
          `/api/anki/existing?word=${encodeURIComponent('ספר')}&root=${encodeURIComponent('ס־פ־ר')}`,
        );
      });
    });

    describe('when the word is not in the deck', () => {
      test('says so quietly', async () => {
        await renderConnectedEditor();
        await typeInto(input('Hebrew word, without niqqud'), 'דג');
        expect(await screen.findByText('Not in the deck yet.')).toBeTruthy();
      });
    });
  });

  describe('a link that needs an input still blank', () => {
    test('is disabled and says which input to fill', async () => {
      await renderConnectedEditor();
      const links = screen.getByRole('navigation', { name: 'Look up' });
      expect(within(links).getByText('Wiktionary').title).toBe(
        'Type the Hebrew word without niqqud first',
      );
      await typeInto(input('Hebrew word, without niqqud'), 'דג');
      expect(within(links).getByRole('link', { name: 'Images (HE)' })).toBeTruthy();
      expect(screen.queryByRole('link', { name: 'Images (EN)' })).toBeNull();
      expect(screen.getByText('Images (EN)').title).toBe('Type the meaning first');
    });
  });
});
