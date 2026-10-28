import { config } from '#lib/config.ts';
import { createAnkiClient } from '#lib/server/anki.ts';
import { ANKICONNECT_API_KEY } from '$app/env/private';

export const anki = createAnkiClient(config.anki.url, ANKICONNECT_API_KEY);
