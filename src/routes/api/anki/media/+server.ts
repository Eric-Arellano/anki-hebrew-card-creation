import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { AnkiClient } from '#lib/server/anki/client.ts';
import { anki } from '#lib/server/anki/connection.ts';
import { parseJsonBody, withAnkiErrorsAs502 } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

// Card webviews load from the media folder, so a stored `.html` or `.svg` could run script there.
// These are the two kinds the editor sends: images re-encoded as JPEG, and MP3s as they came.
const STORABLE_FILENAME = /^[^/\\]+\.(jpg|mp3)$/;

const storeMediaRequestBodySchema = z.strictObject({
  filename: z.string().regex(STORABLE_FILENAME),
  // AnkiConnect's decoder skips invalid characters, so it would store garbage rather than refuse.
  data: z.base64().min(1),
});

export const POST: RequestHandler = ({ request }) => _storeMedia(anki, request);

// The bytes arrive as base64 inside JSON because `request-guard.ts` refuses anything else. That
// inflates them by a third, and adapter-node refuses bodies over 512K, so `npm start` raises its
// `BODY_SIZE_LIMIT`. `vite dev` and `vite preview` have no limit, so only `npm start` can test it.
// A body over the limit fails in `request.json()`, so it gets the same 400, which says so.
export async function _storeMedia(anki: AnkiClient, request: Request): Promise<Response> {
  const { filename, data } = await parseJsonBody(
    request,
    storeMediaRequestBodySchema,
    'filename must be a .jpg or .mp3 file name, and data its bytes in base64, under 8 MiB',
  );
  const storedFilename = await withAnkiErrorsAs502(() =>
    anki('storeMediaFile', { filename, data, deleteExisting: false }),
  );
  return json({ filename: storedFilename });
}
