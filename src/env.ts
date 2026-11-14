import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  ANTHROPIC_API_KEY: {
    description: 'Lets the editor ask Claude. Without it, nothing reaches Anthropic.',
    // Optional, and blank counts as unset, so a `.env` line left empty turns Claude off.
    schema: (value) => value || undefined,
  },
});
