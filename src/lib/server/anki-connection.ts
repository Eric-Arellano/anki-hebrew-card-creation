import { config } from '#lib/config.ts';
import { createAnkiClient } from '#lib/server/anki.ts';

export const anki = createAnkiClient(config.anki.url);
