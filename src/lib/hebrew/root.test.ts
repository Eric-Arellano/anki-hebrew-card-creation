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
    test('keeps it as typed', () => {
      expect(formatRoot('שלם')).toBe('ש־ל־ם');
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
