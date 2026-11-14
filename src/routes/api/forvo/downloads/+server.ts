import { error } from '@sveltejs/kit';
import { findForvoDownloads } from '#lib/server/forvo-downloads.ts';
import { FORVO_DOWNLOADS } from '$app/env/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => _findForvoDownloads(FORVO_DOWNLOADS, url);

export async function _findForvoDownloads(directory: string, url: URL): Promise<Response> {
  const word = url.searchParams.get('word')?.trim();
  if (!word) error(400, 'word is required');
  return Response.json(await findForvoDownloads(directory, word));
}
