import { describe, expect, test } from 'vitest';
import { changedFields } from '#lib/anki/changes.ts';
import { soundToAnkiField } from '#lib/anki/media.ts';
import { type FieldKey, type PartOfSpeech, shownFieldGroups } from '#lib/note-type.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { realNote } from '#tests/real-notes.ts';
import { composeFields } from './compose.ts';
import { emptyCardDraft, type MediaDraft, stillNeeded } from './draft.ts';
import { draftFromNote } from './from-note.ts';
import { handOffFields } from './hand-off.ts';
import { type CardInputs, type CardInputsDraft, completeInputs } from './inputs.ts';

const blankNote = Object.fromEntries(fieldNames.map((name) => [name, '']));

function shownFields(partOfSpeech: PartOfSpeech): FieldKey[] {
  return shownFieldGroups(fieldNames, partOfSpeech).flatMap(({ fields }) => fields);
}

function stored(filename: string) {
  return { kind: 'stored', filename } as const;
}

/** Every field the editor would save for `held` once loaded, with `change` made to its inputs. */
function saved(
  held: Record<string, string>,
  change: (inputs: CardInputsDraft) => CardInputsDraft = (inputs) => inputs,
): Record<string, string> {
  const { inputs, edits, media } = draftFromNote(held);
  const completed = completeInputs(change(inputs));
  if (completed === undefined) throw new Error('The loaded note is missing a required input');
  return handOffFields({
    composed: composeFields(completed),
    edits,
    shownFields: shownFields(completed.partOfSpeech),
    media,
  });
}

/** `inputs` saved as a new note, with `edits` in its textareas and `media`, already stored. */
function savedNew(
  inputs: CardInputs,
  edits: Partial<Record<FieldKey, string>> = {},
  media: MediaDraft = emptyCardDraft().media,
): Record<string, string> {
  return handOffFields({
    composed: composeFields(inputs),
    edits,
    shownFields: shownFields(inputs.partOfSpeech),
    media,
  });
}

function asNoun(inputs: CardInputsDraft): CardInputsDraft {
  return { ...inputs, partOfSpeech: 'noun' };
}

describe('draftFromNote', () => {
  describe('for the real note כלב', () => {
    test('fills every input, textarea and attachment', () => {
      expect(draftFromNote(realNote('כלב'))).toEqual({
        inputs: {
          ...emptyCardDraft().inputs,
          word: 'כלב',
          pointed: 'כֶּלֶב',
          definitions: ['dog'],
          noun: {
            gender: 'm',
            pluralOnly: false,
            plural: 'כְּלָבִים',
            feminine: 'כַּלְבָּה',
            femininePlural: 'כְּלָבוֹת',
          },
          // Every slot its labels fit, whatever the part of speech.
          adjective: { feminine: 'כַּלְבָּה', masculinePlural: 'כְּלָבִים', femininePlural: 'כְּלָבוֹת' },
        },
        edits: {
          productionContext: '',
          readingContext: '',
          forms: 'f: כַּלְבָּה\nm.pl: כְּלָבִים\nf.pl: כְּלָבוֹת',
          variant1Prompt: 'female dog',
          variant1Answer: 'כַּלְבָּה',
          variant2Prompt: '',
          variant2Answer: '',
          examples: '',
          notes: '',
        },
        media: {
          images: [stored('image-48258e0538aecfb7c668bfea2657cf398428fd72.jpg')],
          noImage: false,
          promptImages: {
            variant1Prompt: [
              stored(
                'shutterstock_628340135-cute-siberian-husky-puppy-with-flowers-on-a-pink-background-background-1.jpg',
              ),
            ],
            variant2Prompt: [],
          },
          audio: stored('pronunciation_he_כלב.mp3'),
        },
        // The note's `טוב` is no preposition, which matters only once the note is called a verb.
        unoffered: { preposition: 'טוב' },
      });
    });
  });

  describe.each(['כלב', 'חתול', 'דג'])('for the real noun %s, finished as a noun', (word) => {
    test('changes only its part of speech', () => {
      const held = realNote(word);
      expect(changedFields(held, saved(held, asNoun))).toEqual({ 'Part of speech': 'noun' });
    });
  });

  describe('for a real note with a labelled Pointed', () => {
    const held = realNote('בית');

    test('loads it as the note holds it, on one line', () => {
      expect(draftFromNote(held).inputs.pointed).toBe('(ms) בַּיִת (mp) בָּתִּים');
    });

    test('leaves it out of the fields a save changes', () => {
      const finished = saved(held, (inputs) => ({
        ...asNoun(inputs),
        noun: { ...inputs.noun, gender: 'm' },
      }));
      expect(changedFields(held, finished)).toEqual({
        'Production answer': 'בית טוב',
        'Part of speech': 'noun',
        Gender: 'm',
      });
    });
  });

  describe('for a real note missing required inputs', () => {
    const loaded = draftFromNote(realNote('כרטיס'));

    test('loads what it holds', () => {
      expect(loaded.inputs).toEqual({
        ...emptyCardDraft().inputs,
        word: 'כרטיס',
        pointed: 'כַּרְטִיס',
      });
      expect(loaded.media.images).toHaveLength(2);
    });

    test('can’t be saved until they are filled', () => {
      expect(completeInputs(loaded.inputs)).toBeUndefined();
      expect(stillNeeded(loaded)).toEqual(['English meaning', 'part of speech']);
    });
  });

  describe('for a real note with two images, finished as a noun', () => {
    test('changes only the inputs filled in', () => {
      const held = realNote('דרך');
      const finished = saved(held, (inputs) => ({
        ...inputs,
        definitions: ['road'],
        partOfSpeech: 'noun',
        noun: { ...inputs.noun, gender: 'f' },
      }));
      expect(changedFields(held, finished)).toEqual({
        Definitions: 'road',
        'Production answer': 'דרך טובה',
        'Part of speech': 'noun',
        Gender: 'f',
      });
    });
  });

  describe('for each part of speech', () => {
    const word = { word: 'דבר', pointed: 'דָּבָר', definitions: ['thing', 'word & co'] } as const;
    const prompt = { variant1Prompt: 'a <b>prompt</b>\nover lines', variant1Answer: 'דְּבָרִים' };
    const everyMedia: MediaDraft = {
      images: [stored('a.jpg'), stored('b.JPG')],
      noImage: false,
      promptImages: { variant1Prompt: [stored('c.png')], variant2Prompt: [] },
      audio: stored('pronunciation_he_דבר.mp3'),
    };

    test.each<CardInputs>([
      {
        ...word,
        partOfSpeech: 'noun',
        root: 'ד־ב־ר',
        noun: {
          pluralOnly: false,
          gender: 'm',
          plural: 'דְּבָרִים',
          feminine: 'x',
          femininePlural: '',
        },
      },
      {
        ...word,
        partOfSpeech: 'noun',
        root: '',
        noun: { pluralOnly: false, gender: 'mf', plural: 'דְּבָרִים' },
      },
      { ...word, partOfSpeech: 'noun', root: '', noun: { pluralOnly: true, gender: 'f' } },
      {
        ...word,
        partOfSpeech: 'verb',
        root: 'ד־ב־ר',
        verb: { binyan: "pi'el", preposition: 'עם', past: 'דִּבֵּר', present: 'מְדַבֵּר', future: '' },
      },
      {
        ...word,
        partOfSpeech: 'verb',
        root: '',
        verb: { binyan: "pa'al", preposition: undefined, past: '', present: '', future: 'x' },
      },
      {
        ...word,
        partOfSpeech: 'adjective',
        root: '',
        adjective: { feminine: 'x', masculinePlural: 'y', femininePlural: 'z' },
      },
      { ...word, partOfSpeech: 'adverb' },
      { ...word, partOfSpeech: 'preposition', word: 'חוץ מ־' },
      { ...word, partOfSpeech: 'phrase' },
      { ...word, partOfSpeech: 'other' },
    ])('saves a $partOfSpeech it wrote, loaded again, unchanged', (inputs) => {
      const held = savedNew(inputs, { ...prompt, forms: 'f: x', notes: 'note' }, everyMedia);
      expect(changedFields(held, saved(held))).toEqual({});
    });
  });

  describe('with a value no chip offers', () => {
    test('leaves the input unchosen, and names what the note holds', () => {
      const { inputs, unoffered } = draftFromNote({
        ...blankNote,
        'Part of speech': 'Noun',
        Gender: 'n',
        Binyan: 'nitpael',
      });
      expect(inputs.partOfSpeech).toBeUndefined();
      expect(inputs.noun.gender).toBeUndefined();
      expect(inputs.verb.binyan).toBeUndefined();
      expect(unoffered).toEqual({ partOfSpeech: 'Noun', gender: 'n', binyan: 'nitpael' });
    });
  });

  describe('with a binyan by another name', () => {
    test('chooses the binyan it names', () => {
      expect(draftFromNote({ ...blankNote, Binyan: 'Piel' }).inputs.verb.binyan).toBe("pi'el");
    });
  });

  describe('with a blank note', () => {
    test('fills a draft as blank as a new one, with nothing unoffered', () => {
      const { inputs, unoffered } = draftFromNote(blankNote);
      expect(inputs).toEqual(emptyCardDraft().inputs);
      expect(unoffered).toEqual({});
    });
  });

  describe('for a verb’s preposition', () => {
    function read(answer: string, partOfSpeech = '') {
      const { inputs, unoffered } = draftFromNote({
        ...blankNote,
        Hebrew: 'לחכות',
        'Production answer': answer,
        'Part of speech': partOfSpeech,
      });
      return { preposition: inputs.verb.preposition, unoffered: unoffered.preposition };
    }

    test('reads the one after the word', () => {
      expect(read('לחכות ל')).toEqual({ preposition: 'ל', unoffered: undefined });
    });

    test('reads the word alone as none on a note saved as a verb', () => {
      expect(read('לחכות', 'verb')).toEqual({ preposition: 'none', unoffered: undefined });
    });

    test('leaves the word alone unchosen on a note with no part of speech', () => {
      expect(read('לחכות')).toEqual({ preposition: undefined, unoffered: undefined });
    });

    test('leaves a blank answer unchosen', () => {
      expect(read('', 'verb')).toEqual({ preposition: undefined, unoffered: undefined });
    });

    test('names a preposition the chips don’t offer', () => {
      expect(read('לחכות אל', 'verb')).toEqual({ preposition: undefined, unoffered: 'אל' });
    });

    test('names an answer that doesn’t start with the word', () => {
      expect(read('לְחַכּוֹת ל', 'verb')).toEqual({ preposition: undefined, unoffered: 'לְחַכּוֹת ל' });
    });
  });

  describe('for a noun’s production answer', () => {
    test.each([
      ['מים טובים', true],
      ['מים טובות', true],
      ['מים טוב', false],
      ['', false],
    ])('reads %s as only plural: %s', (answer, pluralOnly) => {
      expect(
        draftFromNote({ ...blankNote, Hebrew: 'מים', 'Production answer': answer }).inputs.noun
          .pluralOnly,
      ).toBe(pluralOnly);
    });
  });

  describe('for Definitions', () => {
    function definitions(html: string) {
      return draftFromNote({ ...blankNote, Definitions: html }).inputs.definitions;
    }

    test('drops the numbers composition adds', () => {
      expect(definitions('1. fish<br>2. Pisces &amp; co')).toEqual(['fish', 'Pisces & co']);
    });

    test('keeps lines that aren’t numbered from 1, one a row', () => {
      expect(definitions('fish<br><br>2. Pisces')).toEqual(['fish', '2. Pisces']);
    });

    test('keeps a number that starts a single meaning', () => {
      expect(definitions('1. Kings')).toEqual(['1. Kings']);
    });
  });

  describe('for Audio naming several recordings', () => {
    test('attaches none', () => {
      const audio = `${soundToAnkiField('a.mp3')}${soundToAnkiField('b.mp3')}`;
      expect(draftFromNote({ ...blankNote, Audio: audio }).media.audio).toBeUndefined();
    });
  });
});
