import { describe, expect, test } from 'vitest';
import {
  type CardDraft,
  changedBeyondWord,
  emptyCardDraft,
  type MediaDraft,
  stillNeeded,
} from './draft.ts';

const image = { kind: 'new', filename: 'paste-a.jpg', blob: new Blob(['jpeg']) } as const;

function dagDraft(media: Pick<MediaDraft, 'images' | 'noImage'>): CardDraft {
  const empty = emptyCardDraft();
  return {
    ...empty,
    inputs: {
      ...empty.inputs,
      word: 'דג',
      pointed: 'דָּג',
      definitions: ['fish'],
      partOfSpeech: 'other',
    },
    media: { ...empty.media, ...media },
  };
}

describe('stillNeeded', () => {
  test('lists the image after the inputs still blank', () => {
    expect(stillNeeded(emptyCardDraft())).toEqual([
      'Hebrew word without niqqud',
      'English meaning',
      'part of speech',
      'Hebrew word with niqqud',
      'image',
    ]);
  });

  test('needs only an image once every input is filled', () => {
    expect(stillNeeded(dagDraft({ images: [], noImage: false }))).toEqual(['image']);
  });

  test.each([
    ['an image is attached', { images: [image], noImage: false }],
    ['the human says the word has none', { images: [], noImage: true }],
  ])('needs nothing once %s', (_, media) => {
    expect(stillNeeded(dagDraft(media))).toEqual([]);
  });
});

describe('changedBeyondWord', () => {
  test('ignores the word', () => {
    const start = emptyCardDraft();
    const now = emptyCardDraft();
    now.inputs.word = 'דג';
    expect(changedBeyondWord(start, now)).toBe(false);
  });

  describe('after a change', () => {
    test.each<[string, (draft: CardDraft) => void]>([
      ['to an input', (draft) => (draft.inputs.definitions = ['fish'])],
      ['to an input of another part of speech', (draft) => (draft.inputs.noun.gender = 'm')],
      ['to a textarea', (draft) => (draft.edits.notes = 'freshwater')],
      ['to the image opt-out', (draft) => (draft.media.noImage = true)],
      ['attaching an image', (draft) => draft.media.images.push(image)],
    ])('is true %s', (_, change) => {
      const now = emptyCardDraft();
      change(now);
      expect(changedBeyondWord(emptyCardDraft(), now)).toBe(true);
    });
  });

  describe('with an attachment in both', () => {
    test('is false for the same file', () => {
      const start = dagDraft({ images: [image], noImage: false });
      expect(changedBeyondWord(start, dagDraft({ images: [image], noImage: false }))).toBe(false);
    });

    test('is true for another file under the same name', () => {
      const start = dagDraft({ images: [image], noImage: false });
      const other = { ...image, blob: new Blob(['jpeg']) };
      expect(changedBeyondWord(start, dagDraft({ images: [other], noImage: false }))).toBe(true);
    });
  });
});
