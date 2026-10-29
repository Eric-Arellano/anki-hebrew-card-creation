import { describe, expect, test } from 'vitest';
import { blankPlaceholders, buildLinkUrl, LINKS } from './links.ts';

describe('buildLinkUrl', () => {
  test('fills and encodes the word', () => {
    expect(
      buildLinkUrl('https://en.wiktionary.org/wiki/{word}#Hebrew', { word: ' כלב ', gloss: '' }),
    ).toBe('https://en.wiktionary.org/wiki/%D7%9B%D7%9C%D7%91#Hebrew');
  });

  test('fills and encodes the gloss', () => {
    expect(
      buildLinkUrl('https://www.google.com/search?udm=2&q={gloss}', {
        word: 'כלב',
        gloss: 'dog & cat',
      }),
    ).toBe('https://www.google.com/search?udm=2&q=dog%20%26%20cat');
  });

  describe('when a placeholder the template uses is blank', () => {
    test('has no link', () => {
      expect(
        buildLinkUrl('https://www.google.com/search?udm=2&q={gloss}', { word: 'כלב', gloss: ' ' }),
      ).toBeUndefined();
    });
  });

  describe('when only a placeholder the template does not use is blank', () => {
    test('still links', () => {
      expect(buildLinkUrl('https://forvo.com/word/{word}/#he', { word: 'דג', gloss: '' })).toBe(
        'https://forvo.com/word/%D7%93%D7%92/#he',
      );
    });
  });
});

describe('blankPlaceholders', () => {
  test('names the blank placeholders the template uses', () => {
    expect(
      blankPlaceholders('https://example.org/{word}/{gloss}', { word: ' ', gloss: '' }),
    ).toEqual(['word', 'gloss']);
  });

  test('ignores a blank placeholder the template does not use', () => {
    expect(blankPlaceholders('https://example.org/{word}', { word: 'דג', gloss: '' })).toEqual([]);
  });
});

describe('LINKS', () => {
  // A placeholder `buildLinkUrl` doesn't fill would reach the site as literal `{text}`.
  test.each(LINKS)('$label uses only the placeholders the editor fills', ({ template }) => {
    const placeholders = [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
    expect(placeholders.length).toBeGreaterThan(0);
    expect(placeholders.filter((name) => name !== 'word' && name !== 'gloss')).toEqual([]);
  });

  test('gives each link its own id', () => {
    expect(new Set(LINKS.map((link) => link.id)).size).toBe(LINKS.length);
  });
});
