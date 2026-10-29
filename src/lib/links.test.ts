import { describe, expect, test } from 'vitest';
import { buildLinkUrl, LINKS } from './links.ts';

describe('buildLinkUrl', () => {
  test('fills and encodes the word', () => {
    expect(buildLinkUrl(LINKS.wiktionary, ' כלב ')).toBe(
      'https://en.wiktionary.org/wiki/%D7%9B%D7%9C%D7%91#Hebrew',
    );
  });

  test('fills and encodes English for the English images', () => {
    expect(buildLinkUrl(LINKS['images-en'], 'dog & cat')).toBe(
      'https://www.google.com/search?udm=2&q=dog%20%26%20cat',
    );
  });

  describe('when the text is blank', () => {
    test('has no link', () => {
      expect(buildLinkUrl(LINKS['images-en'], ' ')).toBeUndefined();
    });
  });
});
