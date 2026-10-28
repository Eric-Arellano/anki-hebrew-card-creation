import { z } from 'zod';

const noteInfo = z.object({
  noteId: z.number(),
  modelName: z.string(),
  fields: z.record(z.string(), z.object({ value: z.string(), order: z.number() })),
});

export type NoteInfo = z.infer<typeof noteInfo>;

// The allowlist. Nothing here creates, edits or deletes a note: `guiAddCards` only opens the Add
// window, and I click Add. An action missing from this object can't be typed or sent.
const results = {
  version: z.number(),
  deckNames: z.array(z.string()),
  modelNames: z.array(z.string()),
  modelFieldNames: z.array(z.string()),
  findNotes: z.array(z.number()),
  notesInfo: z.array(noteInfo),
  guiAddCards: z.number().nullable(),
  guiBrowse: z.array(z.number()),
};

export type Action = keyof typeof results;

export type Params = {
  version: undefined;
  deckNames: undefined;
  modelNames: undefined;
  modelFieldNames: { modelName: string };
  findNotes: { query: string };
  notesInfo: { notes: number[] };
  guiAddCards: {
    note: { deckName: string; modelName: string; fields: Record<string, string>; tags: string[] };
  };
  guiBrowse: { query: string };
};

export type Result<A extends Action> = z.infer<(typeof results)[A]>;

export type AnkiClient = <A extends Action>(
  action: A,
  ...params: Params[A] extends undefined ? [] : [Params[A]]
) => Promise<Result<A>>;

/** Anki is closed, refused the request, or answered with something we don't understand. */
export class AnkiError extends Error {
  override name = 'AnkiError';
}

const envelope = z.object({ result: z.unknown(), error: z.string().nullable() });

export function createAnkiClient(url: string): AnkiClient {
  return async (action, ...[params]) => {
    // The types already refuse other actions; this refuses them from untyped callers too.
    if (!Object.hasOwn(results, action)) {
      throw new AnkiError(`AnkiConnect action not allowed: ${action}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params }),
      });
    } catch (cause) {
      throw new AnkiError(`Can't reach AnkiConnect at ${url}. Is Anki open?`, { cause });
    }
    if (!response.ok) {
      throw new AnkiError(`AnkiConnect answered ${response.status} to ${action}`);
    }

    const body = envelope.safeParse(await response.json().catch(() => undefined));
    if (!body.success) {
      throw new AnkiError(`AnkiConnect sent an unexpected reply to ${action}`);
    }
    if (body.data.error !== null) {
      throw new AnkiError(`AnkiConnect refused ${action}: ${body.data.error}`);
    }

    const result = results[action].safeParse(body.data.result);
    if (!result.success) {
      throw new AnkiError(`AnkiConnect sent an unexpected result for ${action}`);
    }
    return result.data as Result<typeof action>;
  };
}
