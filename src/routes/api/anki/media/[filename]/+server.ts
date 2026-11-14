import { error } from '@sveltejs/kit';
import type { AnkiClient } from '#lib/server/anki/client.ts';
import { anki } from '#lib/server/anki/connection.ts';
import { withAnkiErrorsAs502 } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

// The kinds of file the deck's notes hold, under whatever case their extensions came in. The media
// folder can hold anything, and an SVG or HTML file served from this origin could script the
// routes that write to Anki, so nothing else is served, and each is sent as the type its extension
// names rather than one sniffed from its bytes.
const CONTENT_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
};

const SERVABLE_FILENAME = /^[^/\\]+\.([a-z0-9]+)$/i;

function contentTypeOf(filename: string): string | undefined {
  const extension = filename.match(SERVABLE_FILENAME)?.[1]?.toLowerCase();
  return extension === undefined ? undefined : CONTENT_TYPE_BY_EXTENSION[extension];
}

export const GET: RequestHandler = ({ params }) => _readMedia(anki, params.filename);

export async function _readMedia(anki: AnkiClient, filename: string): Promise<Response> {
  const contentType = contentTypeOf(filename);
  if (contentType === undefined) {
    error(400, 'Only .jpg, .jpeg, .png, .webp and .mp3 files are served');
  }
  const data = await withAnkiErrorsAs502(() => anki('retrieveMediaFile', { filename }));
  if (data === false) error(404, `Anki's media folder has no ${filename}`);
  return new Response(Buffer.from(data, 'base64'), {
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      // Opened on its own, the file gets no script and no origin, whatever its bytes hold.
      'Content-Security-Policy': 'sandbox',
      // A GET passes the request guard, so this keeps another site's page from showing the
      // human's media, and from learning which files the collection holds.
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cache-Control': 'no-store',
    },
  });
}
