import { z } from 'zod';

const noteInfoSchema = z.object({
  noteId: z.number(),
  modelName: z.string(),
  // Seconds since the epoch of the note's last edit or sync, which reviewing a card leaves alone.
  mod: z.number(),
  fields: z.record(z.string(), z.object({ value: z.string(), order: z.number() })),
});

export type NoteInfo = z.infer<typeof noteInfoSchema>;

// The allowlist. Nothing here creates, edits or deletes a note: `guiAddCards` only opens the Add
// window, and the human clicks Add, `storeMediaFile` only adds a file to the media folder, and
// `retrieveMediaFile` only reads one. An action missing from this object can't be typed or sent.
const resultSchemaByAllowedAction = {
  version: z.number(),
  deckNames: z.array(z.string()),
  modelNames: z.array(z.string()),
  modelFieldNames: z.array(z.string()),
  modelFieldDescriptions: z.array(z.string()),
  // Keyed by card template name.
  modelTemplates: z.record(z.string(), z.object({ Front: z.string(), Back: z.string() })),
  findNotes: z.array(z.number()),
  notesInfo: z.array(noteInfoSchema),
  guiAddCards: z.number().nullable(),
  // The name Anki stored the file under, which may not be the one requested.
  storeMediaFile: z.string(),
  // The file's bytes in base64, or `false` when the media folder has no such file.
  retrieveMediaFile: z.union([z.base64(), z.literal(false)]),
};

export type AllowedAction = keyof typeof resultSchemaByAllowedAction;

export type ActionParams = {
  version: undefined;
  deckNames: undefined;
  modelNames: undefined;
  modelFieldNames: { modelName: string };
  modelFieldDescriptions: { modelName: string };
  modelTemplates: { modelName: string };
  findNotes: { query: string };
  notesInfo: { notes: number[] };
  guiAddCards: {
    note: { deckName: string; modelName: string; fields: Record<string, string>; tags: string[] };
  };
  // The add-on replaces an existing file by default, which would silently change another note's
  // media. With `false`, different bytes under a taken name get a new name. Its `url` stays out
  // because that has Anki fetch a third-party site on this tool's behalf.
  storeMediaFile: { filename: string; data: string; deleteExisting: false };
  retrieveMediaFile: { filename: string };
};

export type ActionResult<A extends AllowedAction> = z.infer<
  (typeof resultSchemaByAllowedAction)[A]
>;

export type AnkiClient = <A extends AllowedAction>(
  action: A,
  ...params: ActionParams[A] extends undefined ? [] : [ActionParams[A]]
) => Promise<ActionResult<A>>;

/** Anki is closed, refused the request, or answered with something we don't understand. */
export class AnkiError extends Error {
  override name = 'AnkiError';
}

const responseEnvelopeSchema = z.object({ result: z.unknown(), error: z.string().nullable() });

export function createAnkiClient(ankiConnectUrl: string): AnkiClient {
  return async (action, ...[params]) => {
    // The types already refuse other actions; this refuses them from untyped callers too.
    if (!Object.hasOwn(resultSchemaByAllowedAction, action)) {
      throw new AnkiError(`AnkiConnect action not allowed: ${action}`);
    }

    let response: Response;
    try {
      response = await fetch(ankiConnectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params }),
        // A redirect could carry the card's contents off this machine.
        redirect: 'error',
      });
    } catch (cause) {
      throw new AnkiError(`Can't reach AnkiConnect at ${ankiConnectUrl}. Is Anki open?`, {
        cause,
      });
    }
    if (!response.ok) {
      throw new AnkiError(`AnkiConnect answered ${response.status} to ${action}`);
    }

    const envelope = responseEnvelopeSchema.safeParse(await response.json().catch(() => undefined));
    if (!envelope.success) {
      throw new AnkiError(`AnkiConnect sent an unexpected reply to ${action}`);
    }
    if (envelope.data.error !== null) {
      throw new AnkiError(`AnkiConnect refused ${action}: ${envelope.data.error}`);
    }

    const result = resultSchemaByAllowedAction[action].safeParse(envelope.data.result);
    if (!result.success) {
      throw new AnkiError(`AnkiConnect sent an unexpected result for ${action}`);
    }
    return result.data as ActionResult<typeof action>;
  };
}
