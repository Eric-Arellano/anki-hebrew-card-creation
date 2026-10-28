import { config } from '#lib/config.ts';
import { anki } from '#lib/server/anki-connection.ts';
import { getStatus } from '#lib/server/deck.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => Response.json(await getStatus(anki, config));
