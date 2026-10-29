// Any website I visit can send requests to this server, and the server can open Add windows in
// my Anki, so these checks are what keep the web out.

// DNS rebinding points a hostile name at 127.0.0.1, which makes its pages same-origin with this
// server. Their requests still carry that name as the Host, so only loopback names get in.
const LOOPBACK_HOST_HEADER = /^(127\.0\.0\.1|localhost)(:\d+)?$/;

/** Why `request` must be refused, or `undefined` when it may go through. */
export function whyRequestIsRefused(request: Request): string | undefined {
  const host = request.headers.get('host');
  if (host === null || !LOOPBACK_HOST_HEADER.test(host)) {
    return 'Host must be 127.0.0.1 or localhost';
  }

  // Every path, not just `/api`: SvelteKit decodes the pathname before routing, so a check on the
  // raw one is skipped by `/%61pi/…`.
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;

  // A cross-site page can send a form or a `text/plain` fetch without a CORS preflight, but not
  // JSON. Browsers always send Origin on a POST, so a missing one isn't a browser on this page.
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^application\/json\s*(;|$)/i.test(contentType)) return 'Content-Type must be JSON';
  if (request.headers.get('origin') !== `http://${host}`) return 'Origin must be this server';
  return undefined;
}
