import { appendFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { DictionaryCandidate } from '#lib/api.ts';
import { buildFixtureIndex } from '#tests/dictionary-index.ts';
import type { DictionaryPaths } from './files.ts';
import { DictionaryUnavailableError, lookUp, withDictionary } from './lookup.ts';

let index: Awaited<ReturnType<typeof buildFixtureIndex>>;

beforeAll(async () => {
  index = await buildFixtureIndex();
});

afterAll(() => index.remove());

function look(word: string, paths: DictionaryPaths = index) {
  return withDictionary(paths, (db, staleIndex) => lookUp(db, word, staleIndex));
}

function pointedCandidates(word: string): (string | undefined)[] {
  return look(word).candidates.map((candidate) => candidate.pointed);
}

function candidate(word: string, pointed: string): DictionaryCandidate {
  const found = look(word).candidates.find((other) => other.pointed === pointed);
  if (found === undefined) throw new Error(`${word} found no ${pointed}`);
  return found;
}

describe('lookUp', () => {
  test('answers with every lemma of the word', () => {
    expect(look('כלב')).toEqual({
      match: 'exact',
      titleHasEntry: true,
      staleIndex: false,
      candidates: [
        {
          id: expect.any(Number),
          title: 'כלב',
          pointed: 'כֶּלֶב',
          pos: 'noun',
          glosses: [
            'dog (the species Canis familiaris (sometimes designated Canis lupus familiaris), domesticated for thousands of years and of highly variable appearance because of human breeding)',
            '(derogatory) scoundrel, bitch',
          ],
          roots: [],
          partOfSpeech: 'noun',
          noun: {
            gender: { gender: 'm', pluralOnly: false },
            plurals: ['כְּלָבִים'],
            feminines: ['כַּלְבָּה'],
            // From כלבה's own entry.
            femininePlurals: ['כְּלָבוֹת'],
          },
        },
        // כלבה's entry, by its masculine form.
        expect.objectContaining({ pointed: 'כַּלְבָּה' }),
      ],
    });
  });

  describe('for a title with homographs', () => {
    test('lists each, in the dictionary’s order', () => {
      expect(pointedCandidates('ספר')).toEqual(['סֵפֶר', 'סַפָּר', 'סָפַר', 'סְפָר']);
    });
  });

  describe('for pointed input', () => {
    test('looks up its letters', () => {
      expect(pointedCandidates('סֵפֶר')).toEqual(pointedCandidates('ספר'));
    });
  });

  describe('for a plural', () => {
    test('finds its lemma', () => {
      expect(pointedCandidates('שולחנות')).toEqual(['שֻׁלְחָן']);
    });

    test('follows a pointed form-of target only to the lemma pointed alike', () => {
      // Not עַיִר, “donkey foal”, which is also titled עיר.
      expect(pointedCandidates('ערים')).toEqual(['עִיר']);
    });

    test('finds a lemma by its dual', () => {
      expect(pointedCandidates('עיניים')).toEqual(['עַיִן']);
    });
  });

  describe('for an infinitive', () => {
    test('finds its verb, not its own form entry', () => {
      expect(pointedCandidates('לדבר')).toEqual(['דִּבֵּר']);
    });
  });

  describe('for a defective spelling with its own entry', () => {
    test('follows it to the ktiv male lemma', () => {
      expect(pointedCandidates('שלחן')).toEqual(['שֻׁלְחָן']);
    });
  });

  describe('for a spelling the dictionary lacks', () => {
    test('offers what it matches without ו and י as possible', () => {
      const { match, candidates } = look('חיתולה');
      expect(match).toBe('possible');
      expect(candidates.map((found) => found.pointed)).toEqual(['חֲתוּלָה', 'חֲתֻלָּה', 'חָתוּל']);
    });
  });

  describe('for a word not in the dictionary', () => {
    test('finds nothing, and no Wiktionary entry', () => {
      expect(look('זזזז')).toEqual({
        match: 'possible',
        candidates: [],
        titleHasEntry: false,
        staleIndex: false,
      });
    });
  });

  describe('for a blank word', () => {
    test('finds nothing', () => {
      expect(look(' ')).toEqual({
        match: 'exact',
        candidates: [],
        titleHasEntry: false,
        staleIndex: false,
      });
    });
  });

  describe('for a word found only as another word’s form', () => {
    test('says Wiktionary has no entry titled with it', () => {
      expect(look('כלבים').titleHasEntry).toBe(false);
    });
  });

  describe('for a noun', () => {
    test('takes the root from a category on another entry of its section', () => {
      // The category is on the construct form אַב.
      expect(candidate('אב', 'אָב').roots).toEqual(['א־ב־ב']);
    });

    test('drops the shin dot from a root', () => {
      expect(candidate('שנה', 'שָׁנָה').roots).toEqual(['ש־נ־ה']);
    });

    test('takes the feminine plural only from the feminine that names it', () => {
      // Not חֲתֻלּוֹת, the plural of חֲתֻלָּה, “swaddling band”.
      expect(candidate('חתול', 'חָתוּל')).toMatchObject({
        noun: { feminines: ['חֲתוּלָה'], femininePlurals: ['חֲתוּלוֹת'] },
      });
    });

    test('gives a dual as the plural of a noun without one', () => {
      expect(candidate('עין', 'עַיִן')).toMatchObject({ noun: { plurals: ['עֵינַיִם'] } });
    });

    test('gives a noun that is only plural no plural', () => {
      expect(candidate('מים', 'מַיִם')).toMatchObject({
        noun: { gender: { gender: 'm', pluralOnly: true }, plurals: [] },
      });
    });

    test('gives a noun of both genders mf', () => {
      expect(candidate('רוח', 'רוּחַ')).toMatchObject({
        noun: { gender: { gender: 'mf', pluralOnly: false } },
      });
    });
  });

  describe('for a verb', () => {
    test('converts its binyan, and takes its infinitive and root from the conjugation', () => {
      expect(candidate('דיבר', 'דִּבֵּר')).toEqual({
        id: expect.any(Number),
        title: 'דיבר',
        pointed: 'דִּבֵּר',
        pos: 'verb',
        glosses: ['to speak (say words)'],
        roots: ['ד־ב־ר'],
        partOfSpeech: 'verb',
        verb: {
          binyan: "pi'el",
          infinitives: [{ pointed: 'לְדַבֵּר', unpointed: 'לדבר' }],
          prepositions: [],
        },
      });
    });

    test('takes the unpointed infinitive the table lists before the pointed one', () => {
      expect(candidate('ספר', 'סָפַר')).toMatchObject({
        verb: { binyan: "pa'al", infinitives: [{ pointed: 'לִסְפֹּר', unpointed: 'לספור' }] },
      });
    });

    test('offers each infinitive the table lists', () => {
      expect(candidate('חדר', 'חָדַר')).toMatchObject({
        verb: {
          infinitives: [
            { pointed: 'לַחֲדֹר', unpointed: 'לחדור' },
            { pointed: 'לַחְדֹּר', unpointed: 'לחדור' },
          ],
        },
      });
    });

    test('prefers the head template’s infinitives, with the table’s unpointed spelling', () => {
      expect(candidate('אמר', 'אָמַר')).toMatchObject({
        verb: {
          infinitives: [
            { pointed: 'לוֹמַר', unpointed: 'לומר' },
            { pointed: 'לֵאמֹר', unpointed: 'לאמור' },
          ],
        },
      });
    });

    test('gives a pu’al no infinitive', () => {
      expect(candidate('דובר', 'דֻּבַּר')).toMatchObject({
        verb: { binyan: "pu'al", infinitives: [] },
        roots: ['ד־ב־ר'],
      });
    });

    test.each([
      ['חיכה', 'חִכָּה', 'ל'],
      ['השתמש', 'הִשְׁתַּמֵּשׁ', 'ב'],
    ])('suggests the preposition %s’s gloss names', (word, pointed, preposition) => {
      expect(candidate(word, pointed)).toMatchObject({ verb: { prepositions: [preposition] } });
    });

    test('converts hit to hitpa’el and drops dots from an unjoined root', () => {
      expect(candidate('השתמש', 'הִשְׁתַּמֵּשׁ')).toMatchObject({
        verb: { binyan: "hitpa'el" },
        roots: ['ש־מ־ש'],
      });
    });
  });
});

describe('withDictionary', () => {
  describe('without an index', () => {
    test('says how to build one', () => {
      expect(() => look('כלב', { ...index, index: `${index.index}.missing` })).toThrow(
        new DictionaryUnavailableError("There's no dictionary index yet. Run npm run build-index."),
      );
    });
  });

  describe('with an index built by older code', () => {
    test('says to rebuild it', async () => {
      const older = await buildFixtureIndex();
      const db = new DatabaseSync(older.index);
      db.prepare("UPDATE meta SET value = '0' WHERE name = 'schema_version'").run();
      db.close();
      expect(() => look('כלב', older)).toThrow(DictionaryUnavailableError);
      older.remove();
    });
  });

  describe('once the dictionary file changes', () => {
    test('marks the index stale', async () => {
      const changed = await buildFixtureIndex();
      appendFileSync(changed.source, '\n');
      expect(look('כלב', changed).staleIndex).toBe(true);
      changed.remove();
    });
  });

  describe('once the dictionary file is deleted', () => {
    test('does not mark the index stale', () => {
      expect(look('כלב', { ...index, source: `${index.source}.missing` }).staleIndex).toBe(false);
    });
  });
});
