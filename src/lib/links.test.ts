import { describe, expect, test } from 'vitest';
import { buildLinkUrl, LINKS } from './links.ts';

function link(id: string) {
  const found = LINKS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`No link ${id}`);
  return found;
}

describe('buildLinkUrl', () => {
  test('fills and encodes the word', () => {
    expect(buildLinkUrl(link('wiktionary'), { word: ' כלב ', gloss: '' })).toBe(
      'https://en.wiktionary.org/wiki/%D7%9B%D7%9C%D7%91#Hebrew',
    );
  });

  test('fills and encodes the gloss for the English images', () => {
    expect(buildLinkUrl(link('images-en'), { word: 'כלב', gloss: 'dog & cat' })).toBe(
      'https://www.google.com/search?udm=2&q=dog%20%26%20cat',
    );
  });

  describe('when the input the link searches with is blank', () => {
    test('has no link', () => {
      expect(buildLinkUrl(link('images-en'), { word: 'כלב', gloss: ' ' })).toBeUndefined();
    });
  });

  describe('when only an input the link does not search with is blank', () => {
    test('still links', () => {
      expect(buildLinkUrl(link('forvo'), { word: 'דג', gloss: '' })).toBe(
        'https://forvo.com/word/%D7%93%D7%92/#he',
      );
    });
  });
});

describe('LINKS', () => {
  test('gives each link its own id', () => {
    expect(new Set(LINKS.map((candidate) => candidate.id)).size).toBe(LINKS.length);
  });
});
