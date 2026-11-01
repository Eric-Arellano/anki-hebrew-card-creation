// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import {
  addRequests,
  chooseNoun,
  choosePartOfSpeech,
  fillInputs,
  fillVerb,
  handOff,
  input,
  noteField,
  renderConnectedEditor,
  typeInto,
} from './CardEditor.harness.ts';

describe('CardEditor', () => {
  describe('a noun', () => {
    test('sends its production answer, gender and forms', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'כלב', pointed: 'כֶּלֶב', gloss: 'dog' });
      await chooseNoun('Masculine');
      await typeInto(input('Masculine plural, with niqqud'), 'כְּלָבִים');
      await typeInto(input('Feminine singular, with niqqud'), 'כַּלְבָּה');
      await typeInto(input('Feminine plural, with niqqud'), 'כְּלָבוֹת');

      expect(await handOff(requests)).toEqual({
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'כלב',
          Pointed: 'כֶּלֶב',
          Definitions: 'dog',
          'Production answer': 'כלב טוב',
          Gender: 'm',
          Forms: 'f: כַּלְבָּה<br>m.pl: כְּלָבִים<br>f.pl: כְּלָבוֹת',
        },
      });
    });

    test('requires only the pointed word of its forms', async () => {
      await renderConnectedEditor();
      await chooseNoun('Masculine');
      expect(
        [
          'Hebrew word, with niqqud',
          'Masculine plural, with niqqud',
          'Feminine singular, with niqqud',
          'Feminine plural, with niqqud',
        ].map((label) => input(label).required),
      ).toEqual([true, false, false, false]);
    });

    describe('of feminine gender', () => {
      test('asks only for its plural, and sends no counterpart typed under masculine', async () => {
        const requests = await renderConnectedEditor();
        await fillInputs({ word: 'שנה', pointed: 'שָׁנָה', gloss: 'year' });
        await chooseNoun('Masculine');
        await typeInto(input('Feminine singular, with niqqud'), 'שָׁנָה');
        await chooseNoun('Feminine');
        expect(screen.queryByLabelText('Feminine singular, with niqqud')).toBeNull();
        await typeInto(input('Plural, with niqqud'), 'שָׁנִים');

        expect(await handOff(requests)).toEqual({
          fields: {
            ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
            Hebrew: 'שנה',
            Pointed: 'שָׁנָה',
            Definitions: 'year',
            'Production answer': 'שנה טובה',
            Gender: 'f',
            Forms: 'pl: שָׁנִים',
          },
        });
      });
    });

    describe('that is only plural', () => {
      test('asks for no forms, and answers in the plural', async () => {
        const requests = await renderConnectedEditor();
        await fillInputs({ word: 'מים', pointed: 'מַיִם', gloss: 'water' });
        await chooseNoun('Masculine');
        await typeInto(input('Masculine plural, with niqqud'), 'מַיִם');
        await fireEvent.click(screen.getByRole('checkbox', { name: /Only plural/ }));
        expect(screen.queryByLabelText(/plural, with niqqud/i)).toBeNull();

        expect(await handOff(requests)).toEqual({
          fields: {
            ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
            Hebrew: 'מים',
            Pointed: 'מַיִם',
            Definitions: 'water',
            'Production answer': 'מים טובים',
            Gender: 'm',
          },
        });
      });
    });

    describe('while its gender is unchosen', () => {
      test('asks for no forms and says the gender is needed', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'כלב', pointed: 'כֶּלֶב', gloss: 'dog' });
        await choosePartOfSpeech('Noun');
        expect(screen.queryByLabelText(/plural, with niqqud/i)).toBeNull();
        expect(screen.getByText('Still needed: gender')).toBeTruthy();
      });
    });

    describe('after switching away and back', () => {
      test('keeps its inputs', async () => {
        await renderConnectedEditor();
        await chooseNoun('Feminine');
        await typeInto(input('Plural, with niqqud'), 'שָׁנִים');
        await choosePartOfSpeech('Other');
        await choosePartOfSpeech('Noun');
        expect((input('Plural, with niqqud') as HTMLInputElement).value).toBe('שָׁנִים');
        expect((screen.getByRole('radio', { name: 'Feminine' }) as HTMLInputElement).checked).toBe(
          true,
        );
      });
    });
  });

  describe('a verb', () => {
    test('sends its production answer with its preposition, and its binyan and root', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'לדבר', pointed: 'לְדַבֵּר', gloss: 'to speak' });
      await fillVerb("pi'el", 'ד.ב.ר');
      await fireEvent.click(screen.getByRole('radio', { name: 'עם' }));
      expect(screen.getByText(/Writes the root as/).textContent?.trim()).toBe(
        'Writes the root as ד־ב־ר.',
      );

      await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
      await screen.findByText(/Opened in Anki/);
      expect(addRequests(requests)[0]?.body).toEqual({
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'לדבר',
          Pointed: 'לְדַבֵּר',
          Definitions: 'to speak',
          'Production answer': 'לדבר עם',
          Binyan: "pi'el",
          Root: 'ד־ב־ר',
        },
      });
    });

    test('starts with nothing chosen, and needs its preposition, binyan and root', async () => {
      await renderConnectedEditor();
      await fillInputs({ word: 'לראות', pointed: 'לִרְאוֹת', gloss: 'to see' });
      await choosePartOfSpeech('Verb');
      expect(
        screen.getAllByRole('radio', { checked: true }).map((radio) => radio.getAttribute('name')),
      ).toEqual(['part-of-speech']);
      expect(screen.getByText('Still needed: preposition, binyan, root')).toBeTruthy();
    });

    describe('with a root that is not only letters', () => {
      test('says what to type, and still needs the root', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'לדבר', pointed: 'לְדַבֵּר', gloss: 'to speak' });
        await fillVerb("pi'el", 'דִּבֵּר');
        await fireEvent.click(screen.getByRole('radio', { name: 'את' }));
        expect(screen.getByText(/Type only the root's Hebrew letters/)).toBeTruthy();
        expect(screen.getByText('Still needed: root')).toBeTruthy();
      });
    });
  });

  describe('an adjective', () => {
    test('sends its word and composed forms, and requires none of them', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'גדול', pointed: 'גָּדוֹל', gloss: 'big' });
      await choosePartOfSpeech('Adjective');
      expect(screen.queryByLabelText('Other forms')).toBeNull();
      expect(
        [
          'Feminine singular, with niqqud',
          'Masculine plural, with niqqud',
          'Feminine plural, with niqqud',
        ].map((label) => input(label).required),
      ).toEqual([false, false, false]);
      await typeInto(input('Feminine singular, with niqqud'), 'גְּדוֹלָה');
      await typeInto(input('Masculine plural, with niqqud'), 'גְּדוֹלִים');
      await typeInto(input('Feminine plural, with niqqud'), 'גְּדוֹלוֹת');

      expect(await handOff(requests)).toEqual({
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'גדול',
          Pointed: 'גָּדוֹל',
          Definitions: 'big',
          'Production answer': 'גדול',
          Forms: 'f: גְּדוֹלָה<br>m.pl: גְּדוֹלִים<br>f.pl: גְּדוֹלוֹת',
        },
      });
    });

    test('asks for variants', async () => {
      await renderConnectedEditor();
      await choosePartOfSpeech('Adjective');
      expect(screen.getByText('Unusual variants')).toBeTruthy();
    });

    describe('after switching away and back', () => {
      test('keeps its inputs', async () => {
        await renderConnectedEditor();
        await choosePartOfSpeech('Adjective');
        await typeInto(input('Feminine singular, with niqqud'), 'גְּדוֹלָה');
        await choosePartOfSpeech('Other');
        await choosePartOfSpeech('Adjective');
        expect(input('Feminine singular, with niqqud').value).toBe('גְּדוֹלָה');
      });
    });
  });

  describe('an adverb', () => {
    test('sends only its word, and asks for neither forms nor variants', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'מהר', pointed: 'מַהֵר', gloss: 'quickly' });
      await choosePartOfSpeech('Adverb');
      expect(screen.queryByLabelText('Other forms')).toBeNull();
      expect(screen.queryByText('Unusual variants')).toBeNull();

      expect(await handOff(requests)).toEqual({
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'מהר',
          Pointed: 'מַהֵר',
          Definitions: 'quickly',
          'Production answer': 'מהר',
        },
      });
    });

    describe('after variants were typed under another part of speech', () => {
      test('sends them blank', async () => {
        const requests = await renderConnectedEditor();
        await fillInputs({ word: 'מהר', pointed: 'מַהֵר', gloss: 'quickly' });
        await choosePartOfSpeech('Other');
        await typeInto(noteField('Variant 1: English prompt'), 'quick');
        await choosePartOfSpeech('Adverb');

        expect(await handOff(requests)).toMatchObject({ fields: { 'Variant 1 prompt': '' } });
      });
    });
  });

  describe('a phrase', () => {
    test('sends its word and variants, and asks for no forms', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'ברוך הבא', pointed: 'בָּרוּךְ הַבָּא', gloss: 'welcome' });
      await choosePartOfSpeech('Phrase');
      expect(screen.queryByLabelText('Other forms')).toBeNull();
      await typeInto(noteField('Variant 1: English prompt'), 'welcome (to a woman)');
      await typeInto(noteField('Variant 1: Hebrew answer, with niqqud'), 'בְּרוּכָה הַבָּאָה');

      expect(await handOff(requests)).toEqual({
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'ברוך הבא',
          Pointed: 'בָּרוּךְ הַבָּא',
          Definitions: 'welcome',
          'Production answer': 'ברוך הבא',
          'Variant 1 prompt': 'welcome (to a woman)',
          'Variant 1 answer': 'בְּרוּכָה הַבָּאָה',
        },
      });
    });
  });

  describe('the help under the part of speech', () => {
    test('waits for a choice, then follows it', async () => {
      await renderConnectedEditor();
      const forms = screen.getByRole('region', { name: 'Word forms' });
      expect(forms.querySelector('p.hint')).toBeNull();
      await choosePartOfSpeech('Adverb');
      expect(forms.querySelector('p.hint')?.textContent).toContain('never changes');
      await choosePartOfSpeech('Phrase');
      expect(forms.querySelector('p.hint')?.textContent).toContain('said as a whole');
    });
  });

  describe('an irregular plural', () => {
    test('offers to fill the first free variant with it', async () => {
      await renderConnectedEditor();
      await fillInputs({ word: 'שולחן', pointed: 'שֻׁלְחָן', gloss: 'table' });
      await chooseNoun('Masculine');
      await typeInto(input('Masculine plural, with niqqud'), 'שֻׁלְחָנוֹת');
      await typeInto(noteField('Variant 1: Hebrew answer, with niqqud'), 'שֻׁלְחָן');

      const hint = screen.getByRole('region', { name: 'Irregular plural' });
      expect(hint.textContent).toContain('a masculine noun, but its plural ends in ־ות');
      await fireEvent.click(within(hint).getByRole('button', { name: /as Variant 2/ }));

      expect(noteField('Variant 2: Hebrew answer, with niqqud').value).toBe('שֻׁלְחָנוֹת טוֹבִים');
      expect(hint.textContent).toContain('Variant 2 has it.');
    });

    describe('once both variants hold other answers', () => {
      test('says so, and offers nothing', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'שולחן', pointed: 'שֻׁלְחָן', gloss: 'table' });
        await chooseNoun('Masculine');
        await typeInto(input('Masculine plural, with niqqud'), 'שֻׁלְחָנוֹת');
        await typeInto(noteField('Variant 1: Hebrew answer, with niqqud'), 'שֻׁלְחָן');
        await typeInto(noteField('Variant 2: Hebrew answer, with niqqud'), 'שֻׁלְחָן גָּדוֹל');

        const hint = screen.getByRole('region', { name: 'Irregular plural' });
        expect(hint.textContent).toContain('Both variants are in use.');
        expect(within(hint).queryByRole('button')).toBeNull();
      });
    });

    describe('for a regular plural', () => {
      test('offers nothing', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'כלב', pointed: 'כֶּלֶב', gloss: 'dog' });
        await chooseNoun('Masculine');
        await typeInto(input('Masculine plural, with niqqud'), 'כְּלָבִים');
        expect(screen.queryByRole('region', { name: 'Irregular plural' })).toBeNull();
      });
    });
  });
});
