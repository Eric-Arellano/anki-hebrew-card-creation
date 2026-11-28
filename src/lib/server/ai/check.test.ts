import { describe, expect, test } from 'vitest';
import type { CheckRequest } from '#lib/api/ai.ts';
import { FIELD_HELP, GROUP_HELP } from '#lib/field-help.ts';
import { fromAnkiFields } from '#lib/note-type.ts';
import { claudeMessage, fakeClaude, textBlock } from '#tests/fake-claude.ts';
import checkKelevPlanted from '#tests/fixtures/claude/check-kelev-planted.json' with {
  type: 'json',
};
import { realNote } from '#tests/real-notes.ts';
import { checkNote, checkRequest, fieldTexts, toNoteCheck } from './check.ts';
import type { Homograph } from './homographs.ts';
import { PREPOSITION_RULES } from './verb-meanings.ts';

// כלב as Anki holds it, with an image and audio, and an image in its variant's prompt.
const kelev: CheckRequest = { partOfSpeech: 'noun', fields: fromAnkiFields(realNote('כלב')) };

// ללכת as Anki holds it, a meaning with לְ־ and two with none.
const lalechet: CheckRequest = { partOfSpeech: 'verb', fields: fromAnkiFields(realNote('ללכת')) };

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
    expect(fieldTexts(kelev)).toEqual({
      word: 'כלב',
      wordPointed: 'כֶּלֶב',
      meanings: 'dog',
      gender: 'm',
      forms: 'f: כַּלְבָּה\nm.pl: כְּלָבִים\nf.pl: כְּלָבוֹת',
      variant1Prompt: 'female dog',
      variant1Answer: 'כַּלְבָּה',
    });
  });

  test('sends Notes, and leaves out the composed Production answer', () => {
    expect(
      fieldTexts({
        ...kelev,
        fields: { ...kelev.fields, notes: 'a pet', answer: 'כלב טוב' },
      }),
    ).toEqual({
      ...fieldTexts(kelev),
      notes: 'a pet',
    });
  });

  describe('when the note is a verb', () => {
    test('gives each meaning numbered, with its preposition in brackets', () => {
      expect(fieldTexts(lalechet).meanings).toBe(
        '1. to walk, go [ל]\n2. to happen, go on [none]\n3. to go away, depart [none]',
      );
    });
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
        '  - Hebrew: הכלב שלי גדולה.',
        '    English: My dog is big.',
        '  - Hebrew: יש לי כלב.',
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

  describe('when the note is a verb', () => {
    test('says what the brackets hold, by the rules the examples were written by', () => {
      const { system, user } = checkRequest(lalechet, []);
      expect(user).toContain('Definitions:\n  1. to walk, go [ל]\n  2. to happen, go on [none]');
      expect(system).toContain('ends in the preposition the verb takes in that meaning');
      expect(system).toContain(PREPOSITION_RULES);
    });
  });

  describe('when the note is not a verb', () => {
    test('leaves out the rules for prepositions', () => {
      expect(checkRequest(kelev, []).system).not.toContain(PREPOSITION_RULES);
    });
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
    expect(schema.safeParse(answer([{ ...finding, field: 'Notes' }])).success).toBe(true);
    expect(schema.safeParse(answer([{ ...finding, field: 'Definitions' }])).success).toBe(true);
    expect(schema.safeParse(answer([{ ...finding, field: 'Root' }])).success).toBe(false);
  });

  test('says the Definitions are the learner’s own, and judges only a meaning that is wrong', () => {
    const { system } = checkRequest(kelev, []);
    expect(system).toContain('its niqqud, Gender, Binyan, Root and Forms come from Wiktionary');
    expect(system).toContain('The learner wrote the Definitions in their own words');
    expect(system).toContain('A meaning in the Definitions that the word, as it is pointed');
    expect(system).toContain('A meaning that is right, however it is worded');
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
        kelevWithExamples,
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

  test('keeps a finding on the Definitions, which the human wrote', () => {
    expect(
      toNoteCheck(
        answer([{ field: 'Definitions', problem: 'כלב is a dog, not a cat.', rewrite: 'dog' }]),
        { ...kelev, fields: { ...kelev.fields, meanings: 'cat' } },
      ),
    ).toEqual({
      findings: [{ field: 'meanings', problem: 'כלב is a dog, not a cat.', rewrite: 'dog' }],
    });
  });

  describe('when a rewrite repeats its whole field', () => {
    test('drops the finding', () => {
      expect(
        toNoteCheck(answer([{ field: 'Definitions', problem: 'Wrong.', rewrite: 'dog' }]), kelev),
      ).toEqual({ findings: [] });
    });
  });

  describe('when a rewrite repeats a line of the Examples', () => {
    test.each([
      ['as it is', 'יש לי כלב.'],
      ['with another dash and spacing', 'הכלב שלי גדולה.  -  My dog is big.'],
    ])('drops the finding, which fixes nothing: %s', (_, rewrite) => {
      expect(
        toNoteCheck(
          answer([{ field: 'Examples', problem: 'The Hebrew is only one word.', rewrite }]),
          kelevWithExamples,
        ),
      ).toEqual({ findings: [] });
    });
  });

  describe('when a rewrite keeps one line of a field and drops the rest', () => {
    test('keeps the finding', () => {
      expect(
        toNoteCheck(
          answer([{ field: 'Definitions', problem: 'כלב is not a cat.', rewrite: 'dog' }]),
          { ...kelev, fields: { ...kelev.fields, meanings: 'dog<br>cat' } },
        ),
      ).toEqual({
        findings: [{ field: 'meanings', problem: 'כלב is not a cat.', rewrite: 'dog' }],
      });
    });
  });

  describe('when a finding names a field the note leaves blank', () => {
    test('drops it', () => {
      expect(
        toNoteCheck(
          answer([{ field: 'Reading context', problem: 'Add a hint.', rewrite: 'כלב נובח' }]),
          kelev,
        ),
      ).toEqual({ findings: [] });
    });
  });

  describe('when a finding names a field Claude may not judge', () => {
    test('drops it', () => {
      expect(
        toNoteCheck(answer([{ field: 'Pointed', problem: 'Wrong.', rewrite: null }]), kelev),
      ).toEqual({ findings: [] });
    });
  });

  test.each([
    ['a blank problem', ' '],
    ['markup in the problem', 'Use <b>גדול</b>.'],
  ])('drops a finding with %s', (_, problem) => {
    expect(toNoteCheck(answer([{ field: 'Gender', problem, rewrite: null }]), kelev)).toEqual({
      findings: [],
    });
  });

  test.each([
    ['niqqud', 'כֶּלֶב גָּדוֹל'],
    ['markup', 'הכלב <b>גדול</b>'],
    ['a line break', 'הכלב\nגדול'],
    ['nothing but space', ' '],
  ])('drops a rewrite with %s, keeping its finding', (_, rewrite) => {
    expect(toNoteCheck(answer([{ field: 'Gender', problem: 'Wrong.', rewrite }]), kelev)).toEqual({
      findings: [{ field: 'gender', problem: 'Wrong.' }],
    });
  });
});

describe('checkNote', () => {
  test('finds each problem planted in a real note, from Claude’s captured reply', async () => {
    const planted: CheckRequest = {
      ...kelev,
      fields: {
        ...kelev.fields,
        productionContext: 'the animal that barks, called כלב',
        examples:
          '<bdi lang="he">ה<b>כלב</b> שלי גדולה ונחמדה.</bdi><span class="sep"> — </span>' +
          '<span lang="en">My dog is big and nice.</span><br>' +
          '<bdi lang="he">יש ל<b>כלב</b> שלנו הרבה אנרגיה.</bdi><span class="sep"> — </span>' +
          '<span lang="en">Our dog has a lot of energy.</span>',
        notes: 'כלב is feminine in spoken Hebrew.',
      },
    };
    const { create } = fakeClaude(checkKelevPlanted);
    expect(await checkNote(planted, [], { create })).toEqual({
      findings: [
        {
          field: 'productionContext',
          problem: 'The hint contains the answer word כלב itself, giving it away.',
          rewrite: 'the animal that barks',
        },
        {
          field: 'examples',
          problem:
            'The adjectives are feminine (גדולה ונחמדה) but כלב is masculine, so they must agree as masculine.',
          rewrite: 'הכלב שלי גדול ונחמד. — My dog is big and nice.',
        },
        {
          field: 'notes',
          problem: 'The note is wrong: כלב is masculine, and the female dog is כלבה.',
          rewrite: 'כלב is masculine; a female dog is כלבה.',
        },
      ],
    });
  });

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
    const { create } = fakeClaude(claudeMessage('end_turn', [textBlock(text)]));
    expect(await checkNote(kelev, [], { create })).toEqual({
      findings: [{ field: 'variant1Answer', problem: 'It answers “dog”, not “female dog”.' }],
    });
    const { system, user } = checkRequest(kelev, []);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ system, messages: [{ role: 'user', content: user }] }),
    );
  });

  test('sends the schema with what each field holds', async () => {
    const { create } = fakeClaude(claudeMessage('end_turn', [textBlock('{"findings":[]}')]));
    await checkNote(kelev, [], { create });
    expect(JSON.stringify(create.mock.calls[0]?.[0].output_config?.format)).toContain(
      'One short English sentence saying what is wrong and why.',
    );
  });
});
