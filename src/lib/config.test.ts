import { describe, expect, test } from 'vitest';
import { ZodError } from 'zod';
import raw from '../../config.json' with { type: 'json' };
import { parseConfig } from './config.ts';

type Raw = typeof raw;

/** The paths `parseConfig` rejects once `change` is applied to the repo's config. */
function rejectedPaths(change: (config: Raw) => void): string[] {
  const config = structuredClone(raw);
  change(config);
  try {
    parseConfig(config);
  } catch (error) {
    if (error instanceof ZodError) return error.issues.map((issue) => issue.path.join('.'));
    throw error;
  }
  return [];
}

describe('parseConfig', () => {
  test("accepts the repo's config.json", () => {
    expect(parseConfig(raw)).toEqual(raw);
  });

  describe('when the config is wrong', () => {
    test.each<[string, (config: Raw) => void, string]>([
      ['an unknown key', (c) => Object.assign(c, { extra: true }), ''],
      ['a missing field', (c) => Object.assign(c.fields, { notes: undefined }), 'fields.notes'],
      ['an empty field name', (c) => Object.assign(c.fields, { notes: '' }), 'fields.notes'],
      ['two keys naming one field', (c) => Object.assign(c.fields, { notes: 'Hebrew' }), 'fields'],
      ['two genders with one value', (c) => Object.assign(c.gender, { f: 'm' }), 'gender'],
      [
        'an AnkiConnect off this machine',
        (c) => Object.assign(c.anki, { url: 'http://example.com:8765' }),
        'anki.url',
      ],
      [
        'an AnkiConnect over https',
        (c) => Object.assign(c.anki, { url: 'https://127.0.0.1:8765' }),
        'anki.url',
      ],
      [
        'a template with an unknown placeholder',
        (c) => Object.assign(c.productionAnswer, { noun: '{word} {gloss}' }),
        'productionAnswer.noun',
      ],
      [
        'a template with no placeholder',
        (c) => Object.assign(c.productionAnswer, { verb: 'לדבר' }),
        'productionAnswer.verb',
      ],
      [
        'a link that is not https',
        (c) => Object.assign(c.links[0] ?? {}, { template: 'http://en.wiktionary.org/{word}' }),
        'links.0.template',
      ],
      [
        'two links with one id',
        (c) => Object.assign(c.links[1] ?? {}, { id: 'wiktionary' }),
        'links',
      ],
      ['an alias shared by two binyanim', (c) => c.binyanim[1]?.aliases.push('paal'), 'binyanim'],
      ['no prepositions', (c) => Object.assign(c, { prepositions: [] }), 'prepositions'],
      [
        'an absolute dictionary path',
        (c) => Object.assign(c.dictionary, { jsonl: '/data/kaikki.jsonl' }),
        'dictionary.jsonl',
      ],
      [
        'a dictionary path under ~',
        (c) => Object.assign(c.dictionary, { index: '~/hebrew.sqlite' }),
        'dictionary.index',
      ],
    ])('rejects %s', (_, change, path) => {
      expect(rejectedPaths(change)).toEqual([path]);
    });
  });
});
