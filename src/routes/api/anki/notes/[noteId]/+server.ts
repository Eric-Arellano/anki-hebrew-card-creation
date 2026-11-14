import { error } from '@sveltejs/kit';
import type { AnkiClient } from '#lib/server/anki/client.ts';
import { anki } from '#lib/server/anki/connection.ts';
import { readNote } from '#lib/server/anki/notes.ts';
import { withAnkiErrorsAs502 } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => _readNote(anki, params.noteId);

export async function _readNote(anki: AnkiClient, noteIdParam: string): Promise<Response> {
  // Digits only, so the id can't carry anything else into the search it is spliced into.
  const noteId = Number(noteIdParam);
  if (!/^[1-9][0-9]*$/.test(noteIdParam) || !Number.isSafeInteger(noteId)) {
    error(400, 'The note id must be a number');
  }
  const note = await withAnkiErrorsAs502(() => readNote(anki, noteId));
  if (note === undefined) error(404, `Anki has no Hebrew note ${noteId}. Was it deleted?`);
  return Response.json(note);
}
