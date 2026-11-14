import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { FIELD_NAMES } from '#lib/note-type.ts';
import type { AnkiClient } from '#lib/server/anki/client.ts';
import { anki } from '#lib/server/anki/connection.ts';
import { readNote } from '#lib/server/anki/notes.ts';
import { parseJsonBody, withAnkiErrorsAs502 } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => _readNote(anki, params.noteId);

export const POST: RequestHandler = ({ params, request }) =>
  _saveNote(anki, params.noteId, request);

function parseNoteId(noteIdParam: string): number {
  // Digits only, so the id can't carry anything else into the search it is spliced into.
  const noteId = Number(noteIdParam);
  if (!/^[1-9][0-9]*$/.test(noteIdParam) || !Number.isSafeInteger(noteId)) {
    error(400, 'The note id must be a number');
  }
  return noteId;
}

async function readNoteOr404(anki: AnkiClient, noteId: number) {
  const note = await withAnkiErrorsAs502(() => readNote(anki, noteId));
  if (note === undefined) error(404, `Anki has no Hebrew note ${noteId}. Was it deleted?`);
  return note;
}

export async function _readNote(anki: AnkiClient, noteIdParam: string): Promise<Response> {
  return Response.json(await readNoteOr404(anki, parseNoteId(noteIdParam)));
}

// `mod` is the note's as the editor loaded it. Only the fields named change.
const saveRequestBodySchema = z.strictObject({
  fields: z.record(z.string(), z.string()),
  mod: z.number(),
});

export async function _saveNote(
  anki: AnkiClient,
  noteIdParam: string,
  request: Request,
): Promise<Response> {
  const noteId = parseNoteId(noteIdParam);
  const { fields, mod } = await parseJsonBody(
    request,
    saveRequestBodySchema,
    'The body must hold fields, mapping field names to text, and the mod the note loaded with',
  );
  const unknownFieldNames = Object.keys(fields).filter((name) => !FIELD_NAMES.includes(name));
  if (unknownFieldNames.length > 0) error(400, `Unknown fields: ${unknownFieldNames.join(', ')}`);
  if (Object.keys(fields).length === 0) error(400, 'No fields to save');

  // Checked just before writing, so an edit made in Anki, or synced in, since the editor loaded the
  // note is never overwritten. Reviewing a card leaves `mod` alone.
  const held = await readNoteOr404(anki, noteId);
  if (held.mod !== mod) error(409, 'The note changed in Anki since it loaded here.');

  await withAnkiErrorsAs502(() => anki('updateNoteFields', { note: { id: noteId, fields } }));
  // As Anki now holds it, since the editor never assumes what Anki kept.
  return Response.json(await readNoteOr404(anki, noteId));
}
