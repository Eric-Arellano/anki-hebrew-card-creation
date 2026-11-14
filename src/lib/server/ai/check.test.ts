import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, test, vi } from 'vitest';
import type { CheckRequest } from '#lib/api/ai.ts';
import { FIELD_HELP, GROUP_HELP } from '#lib/field-help.ts';
import { fromAnkiFields } from '#lib/note-type.ts';
import { realNote } from '#tests/real-notes.ts';
import { checkNote, checkRequest, fieldTexts, toNoteCheck } from './check.ts';
import type { ClaudeMessages } from './client.ts';
import type { Homograph } from './homographs.ts';

vi.mock('$app/env/private', () => ({ ANTHROPIC_API_KEY: 'test-key' }));

// כלב as Anki holds it, with an image and audio, and an image in its variant's prompt.
const kelev: CheckRequest = { partOfSpeech: 'noun', fields: fromAnkiFields(realNote('כלב')) };

const kelevWithExamples: CheckRequest = {
  ...kelev,
  fields: {
    ...kelev.fields,
    examples:
      '<bdi lang="he">ה<b>כלב</b> שלי גדולה.</bdi><span class="sep"> — </span>' +
      '<span lang="en">My dog is big.</span><br><bdi lang="he">יש לי <b>כלב</b>.</bdi>',
  },
};

const seferHomographs: Homograph[] = [
  { pointed: 'סַפָּר', partOfSpeech: 'noun', definitions: ['barber'] },
  { pointed: 'סָפַר', partOfSpeech: 'verb', definitions: ['to count'] },
];

function answer(findings: { field: string; problem: string; rewrite: string | null }[]) {
  return { findings };
}

describe('fieldTexts', () => {
  test('gives each field’s text a line per line, leaving out media and blank fields', () => {
    expect(fieldTexts(kelev.fields)).toEqual({
      unpointed: 'כלב',
      pointed: 'כֶּלֶב',
      definitions: 'dog',
      gender: 'm',
      forms: 'f: כַּלְבָּה\nm.pl: כְּלָבִים\nf.pl: כְּלָבוֹת',
      variant1Prompt: 'female dog',
      variant1Answer: 'כַּלְבָּה',
    });
  });

  test('leaves out the human’s Notes and the composed Production answer', () => {
    expect(fieldTexts({ ...kelev.fields, notes: 'a pet', productionAnswer: 'כלב טוב' })).toEqual(
      fieldTexts(kelev.fields),
    );
  });
});

describe('checkRequest', () => {
  test('sends the note’s text, a field a line, with the gender spelled out', () => {
    expect(checkRequest(kelevWithExamples, []).user).toBe(
      [
        'Part of speech: noun',
        'Hebrew: כלב',
        'Pointed: כֶּלֶב',
        'Definitions: dog',
        'Gender: m (masculine)',
        'Forms:',
        '  f: כַּלְבָּה',
        '  m.pl: כְּלָבִים',
        '  f.pl: כְּלָבוֹת',
        'Variant 1 prompt: female dog',
        'Variant 1 answer: כַּלְבָּה',
        'Examples:',
        '  הכלב שלי גדולה. — My dog is big.',
        '  יש לי כלב.',
      ].join('\n'),
    );
  });

  test('lists the homographs after the fields', () => {
    expect(checkRequest(kelev, seferHomographs).user).toMatch(
      /\nVariant 1 answer: כַּלְבָּה\nWithout niqqud, its spelling could also be:\n- סַפָּר \(noun\): barber\n- סָפַר \(verb\): to count$/,
    );
  });

  test('judges against the editor’s help for the part of speech', () => {
    const { system } = checkRequest({ ...kelev, partOfSpeech: 'verb' }, []);
    expect(system).toContain(FIELD_HELP.examples.verb);
    expect(system).toContain(FIELD_HELP.productionContext.verb);
    expect(system).toContain(FIELD_HELP.readingContext.verb);
    expect(system).toContain(GROUP_HELP['Unusual variants']);
  });

  test('leaves niqqud and blank fields alone, and allows no findings', () => {
    const { system } = checkRequest(kelev, []);
    expect(system).toContain('Niqqud. It comes from Wiktionary, so never comment on it');
    expect(system).toContain('never ask for one to be filled');
    expect(system).toContain('Most notes have none, and then the right answer is no findings.');
  });

  test('asks for findings only on the fields the human wrote, Gender and Binyan', () => {
    const { schema } = checkRequest(kelev, []);
    const finding = { problem: 'Wrong.', rewrite: null };
    expect(schema.safeParse(answer([{ ...finding, field: 'Gender' }])).success).toBe(true);
    expect(schema.safeParse(answer([{ ...finding, field: 'Examples' }])).success).toBe(true);
    expect(schema.safeParse(answer([{ ...finding, field: 'Pointed' }])).success).toBe(false);
    expect(schema.safeParse(answer([{ ...finding, field: 'Notes' }])).success).toBe(false);
  });
});

describe('toNoteCheck', () => {
  test('keys each finding by field, keeping its rewrite', () => {
    expect(
      toNoteCheck(
        answer([
          {
            field: 'Examples',
            problem: ' כלב is masculine, so גדולה should be גדול. ',
            rewrite: 'הכלב שלי גדול. — My dog is big.',
          },
          { field: 'Gender', problem: 'The examples treat it as feminine.', rewrite: null },
        ]),
        kelevWithExamples.fields,
      ),
    ).toEqual({
      findings: [
        {
          field: 'examples',
          problem: 'כלב is masculine, so גדולה should be גדול.',
          rewrite: 'הכלב שלי גדול. — My dog is big.',
        },
        { field: 'gender', problem: 'The examples treat it as feminine.' },
      ],
    });
  });

  describe('when a finding names a field the note leaves blank', () => {
    test('drops it', () => {
      expect(
        toNoteCheck(
          answer([{ field: 'Reading context', problem: 'Add a hint.', rewrite: 'כלב נובח' }]),
          kelev.fields,
        ),
      ).toEqual({ findings: [] });
    });
  });

  describe('when a finding names a field Claude may not judge', () => {
    test('drops it', () => {
      expect(
        toNoteCheck(answer([{ field: 'Pointed', problem: 'Wrong.', rewrite: null }]), kelev.fields),
      ).toEqual({ findings: [] });
    });
  });

  test.each([
    ['a blank problem', ' '],
    ['markup in the problem', 'Use <b>גדול</b>.'],
  ])('drops a finding with %s', (_, problem) => {
    expect(
      toNoteCheck(answer([{ field: 'Gender', problem, rewrite: null }]), kelev.fields),
    ).toEqual({ findings: [] });
  });

  test.each([
    ['niqqud', 'כֶּלֶב גָּדוֹל'],
    ['markup', 'הכלב <b>גדול</b>'],
    ['a line break', 'הכלב\nגדול'],
    ['nothing but space', ' '],
  ])('drops a rewrite with %s, keeping its finding', (_, rewrite) => {
    expect(
      toNoteCheck(answer([{ field: 'Gender', problem: 'Wrong.', rewrite }]), kelev.fields),
    ).toEqual({ findings: [{ field: 'gender', problem: 'Wrong.' }] });
  });
});

describe('checkNote', () => {
  test('sends the prompt, and answers with what passes the guards', async () => {
    const text = JSON.stringify(
      answer([
        {
          field: 'Variant 1 answer',
          problem: 'It answers “dog”, not “female dog”.',
          rewrite: null,
        },
        { field: 'Reading context', problem: 'Blank.', rewrite: null },
      ]),
    );
    const create = vi.fn<ClaudeMessages['create']>(
      async () =>
        ({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text, citations: null }],
        }) as Anthropic.Beta.BetaMessage,
    );
    expect(await checkNote(kelev, [], { create })).toEqual({
      findings: [{ field: 'variant1Answer', problem: 'It answers “dog”, not “female dog”.' }],
    });
    const { system, user } = checkRequest(kelev, []);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ system, messages: [{ role: 'user', content: user }] }),
    );
  });
});
