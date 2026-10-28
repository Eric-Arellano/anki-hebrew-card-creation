import type { Handle } from '@sveltejs/kit/hooks';
import { refusal } from '#lib/server/request-guard.ts';

export const handle: Handle = async ({ event, resolve }) => {
  const reason = refusal(event.request);
  if (reason !== undefined) return new Response(reason, { status: 403 });
  return resolve(event);
};
