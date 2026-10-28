import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  ANKICONNECT_API_KEY: {
    description: "AnkiConnect's API key, only if one is set in its config",
    schema: (value) => value || undefined,
  },
});
