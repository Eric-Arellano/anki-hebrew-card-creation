import { describe, expect, test } from 'vitest';
import { formatRoot } from './root.ts';

describe('formatRoot', () => {
  test.each(['דבר', 'ד.ב.ר', 'ד-ב-ר', 'ד ב ר', 'ד־ב־ר', ' ד. ב -ר '])(
    'writes %s as ד־ב־ר',
    (text) => {
      expect(formatRoot(text)).toBe('ד־ב־ר');
    },
  );

  describe('with a final letter', () => {
    test('keeps it at the end', () => {
      expect(formatRoot('שלם')).toBe('ש־ל־ם');
    });

    test('moves it from elsewhere', () => {
      expect(formatRoot('םלך')).toBe('מ־ל־ך');
    });
  });

  describe('with a letter that has a final form at the end', () => {
    test.each([
      ['עלמ', 'ע־ל־ם'],
      ['קנ', 'ק־ן'],
      ['חרפ', 'ח־ר־ף'],
    ])('writes %s as %s', (text, root) => {
      expect(formatRoot(text)).toBe(root);
    });
  });

  describe('with a shin or sin dot', () => {
    test.each([
      ['שׁ־מ־ר', 'ש־מ־ר'],
      ['שׂמח', 'ש־מ־ח'],
    ])('writes %s as %s', (text, root) => {
      expect(formatRoot(text)).toBe(root);
    });
  });

  describe('with a geresh', () => {
    test.each([
      ['פנצ׳ר', 'פ־נ־צ׳־ר'],
      ["פנצ'ר", 'פ־נ־צ׳־ר'],
      ['ג׳.נ.ג׳.ל', 'ג׳־נ־ג׳־ל'],
      ['קוצ׳ץ׳', 'ק־ו־צ׳־ץ׳'],
      ['קוצ׳צ׳', 'ק־ו־צ׳־ץ׳'],
    ])('writes %s as %s', (text, root) => {
      expect(formatRoot(text)).toBe(root);
    });

    test('rejects one on a letter that never takes it', () => {
      expect(formatRoot('ד׳בר')).toBeUndefined();
    });
  });

  describe('with four letters', () => {
    test('joins them all', () => {
      expect(formatRoot('תרגם')).toBe('ת־ר־ג־ם');
    });
  });

  describe('when it is not only Hebrew letters', () => {
    test.each(['דִּבֵּר', 'dbr', 'ד/ב/ר', 'ד1ר'])('rejects %s', (text) => {
      expect(formatRoot(text)).toBeUndefined();
    });
  });

  describe('when it has no letters', () => {
    test.each(['', ' ', '־.'])('rejects %j', (text) => {
      expect(formatRoot(text)).toBeUndefined();
    });
  });
});
