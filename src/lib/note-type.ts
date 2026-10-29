// The one deck and note type this tool makes cards for. They are code, not config: a field's name
// and what the editor does with it belong side by side. Rename a field in Anki and this file
// follows, with the recorded fixtures in `tests/fixtures/anki/`.
// *Rejected: a config.json, because it split each field across JSON and TS and needed a schema to
// recover what types give for free.*

export const DECK = 'עברית';
export const NOTE_TYPE = 'Hebrew';

type Field = { name: string };

export const FIELDS = {
  unpointed: { name: 'Hebrew' },
  pointed: { name: 'Pointed' },
  productionAnswer: { name: 'Production answer' },
  definitions: { name: 'Definitions' },
  productionContext: { name: 'Production context' },
  readingContext: { name: 'Reading context' },
  images: { name: 'Images' },
  audio: { name: 'Audio' },
  gender: { name: 'Gender' },
  forms: { name: 'Forms' },
  binyan: { name: 'Binyan' },
  root: { name: 'Root' },
  variant1Prompt: { name: 'Variant 1 prompt' },
  variant1Answer: { name: 'Variant 1 answer' },
  variant2Prompt: { name: 'Variant 2 prompt' },
  variant2Answer: { name: 'Variant 2 answer' },
  examples: { name: 'Examples' },
  notes: { name: 'Notes' },
} as const satisfies Record<string, Field>;

export const FIELD_NAMES: readonly string[] = Object.values(FIELDS).map((field) => field.name);
