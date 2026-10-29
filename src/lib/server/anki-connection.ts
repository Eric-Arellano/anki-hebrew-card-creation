import { createAnkiClient } from '#lib/server/anki.ts';

// Card contents go wherever this points, so it may only point at this machine.
export const anki = createAnkiClient('http://127.0.0.1:8765');
