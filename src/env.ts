import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  ANTHROPIC_API_KEY: {
    description: 'Lets the editor ask Claude, which suggests examples and checks each note.',
    // Required, so the server refuses to start without it rather than the editor hiding Claude.
    // Blank counts as unset, so a `.env` line left empty fails too.
    schema: (value) => {
      if (!value) throw new Error('Set ANTHROPIC_API_KEY. See the README.');
      return value;
    },
  },
  FORVO_DOWNLOADS: {
    description: 'The folder the browser saves downloads to, where Forvo pronunciations land.',
    // Blank counts as unset, like the API key.
    schema: (value) => value || join(homedir(), 'Downloads'),
  },
});
