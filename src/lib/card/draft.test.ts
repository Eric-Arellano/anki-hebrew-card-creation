import { describe, expect, test } from 'vitest';
import { type CardDraft, emptyCardDraft, type MediaDraft, stillNeeded } from './draft.ts';

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
