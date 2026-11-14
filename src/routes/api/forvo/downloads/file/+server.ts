import { error } from '@sveltejs/kit';
import { readForvoDownload } from '#lib/server/forvo-downloads.ts';
import { FORVO_DOWNLOADS } from '$app/env/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => _readForvoDownload(FORVO_DOWNLOADS, url);

export async function _readForvoDownload(directory: string, url: URL): Promise<Response> {
  const filename = url.searchParams.get('filename');
  if (filename === null) error(400, 'filename is required');
  const file = await readForvoDownload(directory, filename);
  if (file.kind === 'unreadable') error(503, file.message);
  if (file.kind === 'not-listed') error(404, `${filename} is not a Forvo download`);
  return new Response(file.bytes, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'X-Content-Type-Options': 'nosniff',
      // A GET passes the request guard, so this keeps another site's page from playing the file,
      // and from learning which words the human has downloaded.
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cache-Control': 'no-store',
    },
  });
}
