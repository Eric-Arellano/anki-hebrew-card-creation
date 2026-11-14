// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import { FIELD_HELP } from '#lib/field-help.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import {
  addRequests,
  addToDeck,
  chooseNoun,
  choosePartOfSpeech,
  fillDag,
  fillInputs,
  fillVerb,
  input,
  noteField,
  renderConnectedEditor,
  saveRequests,
  skipImage,
  stubServer,
  typeInto,
} from './CardEditor.harness.ts';
import CardEditor from './CardEditor.svelte';

describe('CardEditor', () => {
  describe('adding to the deck', () => {
    const dagFields = {
      ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
      Hebrew: 'דג',
      Pointed: 'דָּג',
      Definitions: 'fish',
      'Production answer': 'דג',
      'Part of speech': 'other',
    };

    function addButton() {
      return screen.getByRole('button', { name: 'Add to deck' }) as HTMLButtonElement;
    }

    test('sends every field, refusing a duplicate', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await skipImage();
      await fireEvent.click(addButton());
      await screen.findByText('Added to the deck.');
      expect(addRequests(requests)).toEqual([
        {
          method: 'POST',
          path: '/api/anki/notes',
          body: { fields: dagFields, allowDuplicate: false },
        },
      ]);
    });

    test('adds on Cmd+Enter too, without asking first', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await skipImage();
      await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
      await screen.findByText('Added to the deck.');
      expect(addRequests(requests)).toHaveLength(1);
    });

    describe('after adding', () => {
      test('saves a change to the added note, rather than adding another', async () => {
        const requests = await renderConnectedEditor();
        await fillDag();
        await skipImage();
        await fireEvent.click(addButton());
        await screen.findByText('Added to the deck.');
        expect(screen.queryByRole('button', { name: 'Add to deck' })).toBeNull();

        await typeInto(input('English meaning'), 'carp');
        await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
        await screen.findByText('Saved to Anki.');
        expect(addRequests(requests)).toHaveLength(1);
        expect(saveRequests(requests)).toEqual([
          {
            method: 'POST',
            path: '/api/anki/notes/1',
            body: { fields: { Definitions: 'carp' }, mod: 1 },
          },
        ]);
      });
    });

    describe('when Anki holds a note with the same Hebrew', () => {
      async function addDuplicate() {
        let refused = false;
        const requests = await renderConnectedEditor({
          addNote: ({ fields, allowDuplicate }) => {
            if (allowDuplicate) return Response.json({ noteId: 1, mod: 1, fields });
            refused = true;
            return Response.json(
              { message: 'Anki already has a note with this Hebrew.' },
              { status: 409 },
            );
          },
        });
        await fillDag();
        await skipImage();
        await fireEvent.click(addButton());
        await screen.findByRole('button', { name: 'Add anyway' });
        expect(refused).toBe(true);
        return requests;
      }

      test('says so, and adds only on Add anyway', async () => {
        const requests = await addDuplicate();
        expect(screen.getByRole('alert').textContent).toContain(
          'Anki already has a note with this Hebrew.',
        );
        expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Add anyway' }));

        await fireEvent.click(screen.getByRole('button', { name: 'Add anyway' }));
        await screen.findByText('Added to the deck.');
        expect(addRequests(requests).map(({ body }) => body)).toEqual([
          { fields: dagFields, allowDuplicate: false },
          { fields: dagFields, allowDuplicate: true },
        ]);
      });
    });

    describe('when Anki fails', () => {
      test('says why, and stays a new note', async () => {
        await renderConnectedEditor({
          addNote: () => Response.json({ message: 'collection is not available' }, { status: 502 }),
        });
        await fillDag();
        await skipImage();
        await fireEvent.click(addButton());
        expect((await screen.findByRole('alert')).textContent).toBe('collection is not available');
        expect(addButton().disabled).toBe(false);
      });
    });

    describe('while an input is blank', () => {
      test('is disabled and says what is still needed', async () => {
        await renderConnectedEditor();
        await typeInto(input('Hebrew word, without niqqud'), 'דג');
        expect(addButton().disabled).toBe(true);
        expect(
          screen.getByText(
            'Still needed: English meaning, part of speech, Hebrew word with niqqud, image',
          ),
        ).toBeTruthy();
      });
    });

    describe('while Anki has a problem', () => {
      test('is disabled and says why', async () => {
        const requests = stubServer({ status: { kind: 'error', message: 'Is Anki open?' } });
        render(CardEditor);
        await screen.findByText('Is Anki open?');
        await fillDag();
        await skipImage();

        expect(addButton().disabled).toBe(true);
        await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
        expect(addRequests(requests)).toEqual([]);
      });
    });
  });

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
        expect(screen.queryByLabelText('Notes')).toBeNull();
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

    describe('for the examples', () => {
      test('warn of a line that uses no form of the word, until it does', async () => {
        await renderConnectedEditor();
        await fillDag();
        const examples = noteField('Examples');
        await typeInto(examples, 'הדג שוחה (the fish swims)\nהחתול ישן (the cat sleeps)');
        const message = screen.getByText(/No form of/);
        expect(message.textContent).toBe('No form of דג in:');
        expect(
          within(message.parentElement as HTMLElement)
            .getAllByRole('listitem')
            .map((item) => item.textContent),
        ).toEqual(['החתול ישן (the cat sleeps)']);

        await typeInto(examples, 'הדג שוחה (the fish swims)');
        expect(screen.queryByText(/No form of/)).toBeNull();
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
