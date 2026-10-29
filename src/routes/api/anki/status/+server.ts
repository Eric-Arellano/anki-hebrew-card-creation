import { anki } from '#lib/server/anki-connection.ts';
import { getAnkiStatus } from '#lib/server/deck.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => Response.json(await getAnkiStatus(anki));
