// A note's fields as the editor holds them: composition run backwards, with each reader beside the
// writer it undoes. Every value loads as the note holds it, right or wrong. Nothing here recognizes
// an old format, and what no input can hold, like a `Forms` line with a label none has, is left
// for the review before a save to show.
import { ankiFieldHtmlToText, ankiFieldHtmlToTextarea } from '#lib/anki/html.ts';
import { soundsInAnkiField, splitImages } from '#lib/anki/media.ts';
import { adjectiveInputsFrom } from '#lib/card/adjective.ts';
import { definitionsFromHtml } from '#lib/card/compose.ts';
import type { CardDraft } from '#lib/card/draft.ts';
import { formsByLabel } from '#lib/card/forms.ts';
import { nounDraftFrom } from '#lib/card/noun.ts';
import { type VerbDraft, verbDraftFrom } from '#lib/card/verb.ts';
import { toBinyan } from '#lib/hebrew/binyan.ts';
import { GENDERS } from '#lib/hebrew/gender.ts';
import { GOVERNED_PREPOSITIONS } from '#lib/hebrew/preposition.ts';
import {
  FIELDS,
  type Field,
  type FieldKey,
  fromAnkiFields,
  isVariantPrompt,
  PARTS_OF_SPEECH,
  type VariantPrompt,
} from '#lib/note-type.ts';

/** The files a note's media fields name, already in Anki's media folder. */
export type StoredMedia = {
  images: string[];
  promptImages: Record<VariantPrompt, string[]>;
  audio: string | undefined;
};

type ChipInput = 'partOfSpeech' | 'gender' | 'binyan' | 'preposition';

/** What the note holds for each input it fills with a value no chip offers, which stays unchosen. */
export type UnofferedValues = Partial<Record<ChipInput, string>>;

export type NoteDraft = Omit<CardDraft, 'media'> & {
  media: StoredMedia;
  unoffered: UnofferedValues;
};

type ChipReading<T> = { value: T | undefined; unoffered: string | undefined };

function readChip<T>(text: string, toValue: (text: string) => T | undefined): ChipReading<T> {
  const value = text === '' ? undefined : toValue(text);
  return { value, unoffered: text !== '' && value === undefined ? text : undefined };
}

function oneOf<T extends string>(values: readonly T[]): (text: string) => T | undefined {
  return (text) => values.find((value) => value === text);
}

// Anki's editor keeps some spaces as `&nbsp;`.
function singleSpaced(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ');
}

// What composition wrote after the word in `Production answer`: a noun's `טוב`, or a verb's
// preposition. `undefined` for a blank answer, and one that doesn't start with the word, which
// composition didn't write.
function afterWord(word: string, answer: string): string | undefined {
  const spacedWord = singleSpaced(word);
  const spacedAnswer = singleSpaced(answer);
  if (spacedAnswer === '') return undefined;
  if (spacedAnswer === spacedWord) return '';
  return spacedAnswer.startsWith(`${spacedWord} `)
    ? spacedAnswer.slice(spacedWord.length + 1)
    : undefined;
}

function readPreposition(
  answer: string,
  ending: string | undefined,
  savedAsVerb: boolean,
): ChipReading<VerbDraft['preposition']> {
  // The word alone is what composition writes for a verb with no preposition, but `none` was only
  // chosen on a note this tool saved as a verb. On one typed in Anki, no one has chosen yet.
  if (ending === '') return { value: savedAsVerb ? 'none' : undefined, unoffered: undefined };
  if (ending === undefined) return readChip(answer, () => undefined);
  return readChip(ending, oneOf(GOVERNED_PREPOSITIONS));
}

const TEXTAREA_FIELDS = (Object.keys(FIELDS) as FieldKey[]).filter((key) => {
  const field: Field = FIELDS[key];
  return 'group' in field;
});

/** Everything the editor holds for a note, from its fields keyed by Anki name. */
export function draftFromNote(ankiFields: Readonly<Record<string, string>>): NoteDraft {
  const fields = fromAnkiFields(ankiFields);
  function html(key: FieldKey): string {
    return fields[key] ?? '';
  }
  function text(key: FieldKey): string {
    return ankiFieldHtmlToText(html(key));
  }
  function imagesIn(key: FieldKey): string[] {
    return splitImages(html(key)).images;
  }

  const word = text('unpointed');
  const ending = afterWord(word, text('productionAnswer'));
  const forms = formsByLabel(html('forms'));
  const chips = {
    partOfSpeech: readChip(text('partOfSpeech'), oneOf(PARTS_OF_SPEECH)),
    gender: readChip(text('gender'), oneOf(GENDERS)),
    binyan: readChip(text('binyan'), toBinyan),
  };
  const preposition = readPreposition(
    text('productionAnswer'),
    ending,
    chips.partOfSpeech.value === 'verb',
  );
  const definitions = definitionsFromHtml(html('definitions'));
  const sounds = soundsInAnkiField(html('audio'));

  return {
    inputs: {
      word,
      pointed: text('pointed'),
      definitions: definitions.length === 0 ? [''] : definitions,
      partOfSpeech: chips.partOfSpeech.value,
      root: text('root'),
      noun: nounDraftFrom({ gender: chips.gender.value, forms, tov: ending }),
      verb: verbDraftFrom({ binyan: chips.binyan.value, preposition: preposition.value, forms }),
      adjective: adjectiveInputsFrom(forms),
    },
    // A variant prompt's images go to its own image input, after its text.
    edits: Object.fromEntries(
      TEXTAREA_FIELDS.map((key) => [
        key,
        ankiFieldHtmlToTextarea(isVariantPrompt(key) ? splitImages(html(key)).text : html(key)),
      ]),
    ),
    media: {
      images: imagesIn('images'),
      promptImages: {
        variant1Prompt: imagesIn('variant1Prompt'),
        variant2Prompt: imagesIn('variant2Prompt'),
      },
      // `Audio` holds one recording, so a field naming several fills none.
      audio: sounds.length === 1 ? sounds[0] : undefined,
    },
    unoffered: Object.fromEntries(
      Object.entries({ ...chips, preposition }).flatMap(([input, { unoffered }]) =>
        unoffered === undefined ? [] : [[input, unoffered]],
      ),
    ),
  };
}
