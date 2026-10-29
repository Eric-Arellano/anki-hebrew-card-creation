import type { Handle } from '@sveltejs/kit/hooks';
import { whyRequestIsRefused } from '#lib/server/request-guard.ts';

export const handle: Handle = async ({ event, resolve }) => {
  const refusalReason = whyRequestIsRefused(event.request);
  if (refusalReason !== undefined) return new Response(refusalReason, { status: 403 });
  return resolve(event);
};
