import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { DECK, NOTE_TYPE, TAGS } from '#lib/note-type.ts';
import { type AnkiClient, AnkiRefusal } from '#lib/server/anki/client.ts';
import { anki } from '#lib/server/anki/connection.ts';
import { readNoteOr404, refuseUnknownFields } from '#lib/server/anki/notes.ts';
import { parseJsonBody, withAnkiErrorsAs502 } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

// The add-on's text when another note has the same first field, `Hebrew`. Matched exactly, since
// the add-on gives the refusal no code of its own.
const DUPLICATE_REFUSAL = 'cannot create note because it is a duplicate';

// `allowDuplicate` is `true` only once the human has seen Anki refuse the note as a duplicate and
// clicked Add anyway, since the deck holds homographs.
const addRequestBodySchema = z.strictObject({
  fields: z.record(z.string(), z.string()),
  allowDuplicate: z.boolean(),
});

export const POST: RequestHandler = ({ request }) => _addNote(anki, request);

export async function _addNote(anki: AnkiClient, request: Request): Promise<Response> {
  const { fields, allowDuplicate } = await parseJsonBody(
    request,
    addRequestBodySchema,
    'The body must hold fields, mapping field names to text, and whether to allow a duplicate',
  );
  refuseUnknownFields(fields);

  const noteId = await withAnkiErrorsAs502(async () => {
    try {
      return await anki('addNote', {
        note: {
          deckName: DECK,
          modelName: NOTE_TYPE,
          fields,
          tags: [...TAGS],
          options: { allowDuplicate },
        },
      });
    } catch (cause) {
      if (cause instanceof AnkiRefusal && cause.reason === DUPLICATE_REFUSAL) {
        error(409, 'Anki already has a note with this Hebrew.');
      }
      throw cause;
    }
  });
  // As Anki now holds it, since the editor never assumes what Anki kept.
  return Response.json(await readNoteOr404(anki, noteId));
}
