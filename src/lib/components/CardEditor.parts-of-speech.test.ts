// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { loadedNote } from '#tests/real-notes.ts';
import {
  addToDeck,
  chooseNoun,
  choosePartOfSpeech,
  fillInputs,
  fillVerb,
  input,
  kelevNote,
  noteField,
  renderConnectedEditor,
  skipImage,
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

      await skipImage();
      expect(await addToDeck(requests)).toEqual({
        allowDuplicate: false,
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'כלב',
          Pointed: 'כֶּלֶב',
          Definitions: 'dog',
          'Production answer': 'כלב טוב',
          'Part of speech': 'noun',
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
          'Root, like דבר or ד.ב.ר',
        ].map((label) => input(label).required),
      ).toEqual([true, false, false, false, false]);
    });

    test('sends its root', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'כתובת', pointed: 'כְּתֹבֶת', gloss: 'address' });
      await chooseNoun('Feminine');
      await typeInto(input('Root, like דבר or ד.ב.ר'), 'כתב');

      await skipImage();
      expect(await addToDeck(requests)).toMatchObject({ fields: { Root: 'כ־ת־ב' } });
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

        await skipImage();
        expect(await addToDeck(requests)).toEqual({
          allowDuplicate: false,
          fields: {
            ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
            Hebrew: 'שנה',
            Pointed: 'שָׁנָה',
            Definitions: 'year',
            'Production answer': 'שנה טובה',
            'Part of speech': 'noun',
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

        await skipImage();
        expect(await addToDeck(requests)).toEqual({
          allowDuplicate: false,
          fields: {
            ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
            Hebrew: 'מים',
            Pointed: 'מַיִם',
            Definitions: 'water',
            'Production answer': 'מים טובים',
            'Part of speech': 'noun',
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
        expect(screen.getByText('Still needed: gender, image')).toBeTruthy();
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
    test('sends its infinitive and past as its production answer, its meaning’s preposition, and its binyan, root and forms', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'לדבר', pointed: 'לְדַבֵּר', gloss: 'to speak' });
      await fillVerb("pi'el", 'ד.ב.ר', 'דיבר');
      await fireEvent.click(screen.getByRole('radio', { name: 'עִם' }));
      await typeInto(input('Past (he), with niqqud'), 'דִּבֵּר');
      await typeInto(input('Present (he), with niqqud'), 'מְדַבֵּר');
      await typeInto(input('Future (he), with niqqud'), 'יְדַבֵּר');
      expect(screen.getByText(/Writes the root as/).textContent?.trim()).toBe(
        'Writes the root as ד־ב־ר.',
      );

      await skipImage();
      expect(await addToDeck(requests)).toEqual({
        allowDuplicate: false,
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'לדבר',
          Pointed: 'לְדַבֵּר',
          Definitions: 'to speak <span class="prep"><bdi lang="he">עִם</bdi></span>',
          'Production answer': 'לדבר דיבר',
          'Part of speech': 'verb',
          Binyan: "pi'el",
          Root: 'ד־ב־ר',
          Forms: 'past: דִּבֵּר<br>pres: מְדַבֵּר<br>fut: יְדַבֵּר',
        },
      });
    });

    test('sends each meaning with its own preposition, or none', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'לדבר', pointed: 'לְדַבֵּר', gloss: 'to talk with' });
      await fireEvent.click(screen.getByRole('button', { name: '+ Another meaning' }));
      await typeInto(input('English meaning 2'), 'to talk about');
      await fireEvent.click(screen.getByRole('button', { name: '+ Another meaning' }));
      await typeInto(input('English meaning 3'), 'to speak');
      await fillVerb("pi'el", '', 'דיבר');
      expect(screen.getByText('Still needed: preposition, image')).toBeTruthy();
      for (const [meaning, preposition] of [
        ['to talk with', 'עִם'],
        ['to talk about', 'עַל'],
        ['to speak', 'None'],
      ] as const) {
        const group = screen.getByRole('group', { name: meaning });
        await fireEvent.click(within(group).getByRole('radio', { name: preposition }));
      }

      await skipImage();
      expect(await addToDeck(requests)).toMatchObject({
        fields: {
          Definitions:
            '1. to talk with <span class="prep"><bdi lang="he">עִם</bdi></span>' +
            '<br>2. to talk about <span class="prep"><bdi lang="he">עַל</bdi></span>' +
            '<br>3. to speak<span class="no-prep"></span>',
          'Production answer': 'לדבר דיבר',
        },
      });
    });

    test('starts with nothing chosen, and needs its preposition, past and binyan', async () => {
      await renderConnectedEditor();
      await fillInputs({ word: 'לראות', pointed: 'לִרְאוֹת', gloss: 'to see' });
      await choosePartOfSpeech('Verb');
      expect(
        screen.getAllByRole('radio', { checked: true }).map((radio) => radio.getAttribute('name')),
      ).toEqual(['part-of-speech']);
      expect(
        screen.getByText('Still needed: preposition, past (he) without niqqud, binyan, image'),
      ).toBeTruthy();
    });

    describe('with a past that doesn’t spell the pointed past', () => {
      test('warns, and still sends it', async () => {
        const requests = await renderConnectedEditor();
        await fillInputs({ word: 'להגיד', pointed: 'לְהַגִּיד', gloss: 'to say' });
        await fillVerb("hif'il", '', 'אמר');
        await fireEvent.click(screen.getByRole('radio', { name: 'אֶת' }));
        await typeInto(input('Past (he), with niqqud'), 'הִגִּיד');
        expect(screen.getByText(/Doesn't spell/).textContent).toBe(
          "Doesn't spell הִגִּיד, the past with niqqud.",
        );

        await skipImage();
        expect(await addToDeck(requests)).toMatchObject({
          fields: { 'Production answer': 'להגיד אמר' },
        });
      });
    });

    describe("in pu'al, which has no infinitive", () => {
      test('asks for no second past, and answers with the word alone', async () => {
        const requests = await renderConnectedEditor();
        await fillInputs({ word: 'דובר', pointed: 'דֻּבַּר', gloss: 'to be spoken' });
        await fillVerb("pu'al", '');
        await fireEvent.click(screen.getByRole('radio', { name: 'None' }));
        expect(screen.queryByLabelText('Past (he), without niqqud')).toBeNull();

        await skipImage();
        expect(await addToDeck(requests)).toMatchObject({
          fields: { Hebrew: 'דובר', 'Production answer': 'דובר' },
        });
      });
    });

    describe('with a blank root', () => {
      test('sends it blank', async () => {
        const requests = await renderConnectedEditor();
        await fillInputs({ word: 'לדבר', pointed: 'לְדַבֵּר', gloss: 'to speak' });
        await fillVerb("pi'el", '', 'דיבר');
        await fireEvent.click(screen.getByRole('radio', { name: 'עִם' }));

        await skipImage();
        expect(await addToDeck(requests)).toMatchObject({ fields: { Root: '' } });
      });
    });

    describe('with a root that is not only letters', () => {
      test('says what to type, and still needs the root', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'לדבר', pointed: 'לְדַבֵּר', gloss: 'to speak' });
        await fillVerb("pi'el", 'דִּבֵּר', 'דיבר');
        await fireEvent.click(screen.getByRole('radio', { name: 'אֶת' }));
        expect(screen.getByText(/Type only the root's Hebrew letters/)).toBeTruthy();
        expect(screen.getByText('Still needed: root, image')).toBeTruthy();
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

      await skipImage();
      expect(await addToDeck(requests)).toEqual({
        allowDuplicate: false,
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'גדול',
          Pointed: 'גָּדוֹל',
          Definitions: 'big',
          'Production answer': 'גדול',
          'Part of speech': 'adjective',
          Forms: 'f: גְּדוֹלָה<br>m.pl: גְּדוֹלִים<br>f.pl: גְּדוֹלוֹת',
        },
      });
    });

    test('sends its root', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'גדול', pointed: 'גָּדוֹל', gloss: 'big' });
      await choosePartOfSpeech('Adjective');
      await typeInto(input('Root, like דבר or ד.ב.ר'), 'גדל');

      await skipImage();
      expect(await addToDeck(requests)).toMatchObject({ fields: { Root: 'ג־ד־ל' } });
    });

    describe('with a root that is not only letters', () => {
      test('still needs the root', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'גדול', pointed: 'גָּדוֹל', gloss: 'big' });
        await choosePartOfSpeech('Adjective');
        await typeInto(input('Root, like דבר or ד.ב.ר'), 'gdl');
        expect(screen.getByText('Still needed: root, image')).toBeTruthy();
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
      expect(screen.queryByLabelText(/^Root/)).toBeNull();
      expect(screen.queryByText('Unusual variants')).toBeNull();

      await skipImage();
      expect(await addToDeck(requests)).toEqual({
        allowDuplicate: false,
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'מהר',
          Pointed: 'מַהֵר',
          Definitions: 'quickly',
          'Production answer': 'מהר',
          'Part of speech': 'adverb',
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

        await skipImage();
        expect(await addToDeck(requests)).toMatchObject({ fields: { 'Variant 1 prompt': '' } });
      });
    });
  });

  describe('a preposition', () => {
    test('sends the forms and variants typed for it', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'עם', pointed: 'עִם', gloss: 'with' });
      await choosePartOfSpeech('Preposition');
      await typeInto(noteField('Other forms'), 'me: אִתִּי');
      await typeInto(noteField('Variant 1: English prompt'), 'with me');
      await typeInto(noteField('Variant 1: Hebrew answer, with niqqud'), 'אִתִּי');

      await skipImage();
      expect(await addToDeck(requests)).toEqual({
        allowDuplicate: false,
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'עם',
          Pointed: 'עִם',
          Definitions: 'with',
          'Production answer': 'עם',
          'Part of speech': 'preposition',
          Forms: 'me: אִתִּי',
          'Variant 1 prompt': 'with me',
          'Variant 1 answer': 'אִתִּי',
        },
      });
    });

    test('answers without a trailing maqaf', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'חוץ מ־', pointed: 'חוּץ מִ־', gloss: 'except for' });
      await choosePartOfSpeech('Preposition');

      await skipImage();
      expect(await addToDeck(requests)).toMatchObject({
        fields: { Hebrew: 'חוץ מ־', 'Production answer': 'חוץ מ', 'Part of speech': 'preposition' },
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

      await skipImage();
      expect(await addToDeck(requests)).toEqual({
        allowDuplicate: false,
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'ברוך הבא',
          Pointed: 'בָּרוּךְ הַבָּא',
          Definitions: 'welcome',
          'Production answer': 'ברוך הבא',
          'Part of speech': 'phrase',
          'Variant 1 prompt': 'welcome (to a woman)',
          'Variant 1 answer': 'בְּרוּכָה הַבָּאָה',
        },
      });
    });
  });

  describe('the help under the part of speech', () => {
    test('waits for a choice, then follows it', async () => {
      await renderConnectedEditor();
      const forms = screen.getByRole('region', { name: 'Grammar' });
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

  describe('the pointed word', () => {
    describe('when it holds more than the word', () => {
      test('warns', async () => {
        const bayit = loadedNote('בית');
        await renderConnectedEditor(
          {},
          { ...bayit, fields: { ...bayit.fields, 'Part of speech': 'noun' } },
        );
        expect(input('Hebrew word, with niqqud').value).toBe('(ms) בַּיִת (mp)\u00a0בָּתִּים');
        expect(screen.getByText(/Doesn't spell/).textContent?.trim()).toBe(
          "Doesn't spell בית, the word without niqqud.",
        );
      });
    });

    describe('when it spells the word', () => {
      test('says nothing', async () => {
        await renderConnectedEditor({}, kelevNote());
        expect(screen.queryByText(/Doesn't spell/)).toBeNull();
      });
    });

    describe('when a new note is mistyped', () => {
      test('warns', async () => {
        await renderConnectedEditor();
        await typeInto(input('Hebrew word, without niqqud'), 'דג');
        await choosePartOfSpeech('Other');
        await typeInto(input('Hebrew word, with niqqud'), 'דָּד');
        expect(screen.getByText(/Doesn't spell/)).toBeTruthy();
      });
    });
  });
});
