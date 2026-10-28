import { describe, expect, test } from 'vitest';
import { whyRequestIsRefused } from './request-guard.ts';

function requestTo(path: string, headers: Record<string, string>, method = 'GET'): Request {
  return new Request(`http://127.0.0.1:5173${path}`, { method, headers });
}

const JSON_CONTENT_TYPE = { 'content-type': 'application/json' };

describe('whyRequestIsRefused', () => {
  describe('for any request', () => {
    test.each(['127.0.0.1:5173', '127.0.0.1', 'localhost:3000', 'localhost'])(
      'lets Host %s through',
      (host) => {
        expect(whyRequestIsRefused(requestTo('/', { host }))).toBeUndefined();
      },
    );

    test.each(['evil.example', '127.0.0.1.evil.example', 'localhost.evil.example:5173', ''])(
      'refuses Host %j',
      (host) => {
        expect(whyRequestIsRefused(requestTo('/', { host }))).toBe(
          'Host must be 127.0.0.1 or localhost',
        );
      },
    );

    test('refuses a request without a Host', () => {
      expect(whyRequestIsRefused(requestTo('/', {}))).toBe('Host must be 127.0.0.1 or localhost');
    });
  });

  describe('for an API POST', () => {
    const host = '127.0.0.1:5173';
    const origin = 'http://127.0.0.1:5173';

    test('lets JSON from this origin through', () => {
      expect(
        whyRequestIsRefused(
          requestTo('/api/anki/browse', { host, origin, ...JSON_CONTENT_TYPE }, 'POST'),
        ),
      ).toBe(undefined);
      expect(
        whyRequestIsRefused(
          requestTo(
            '/api/anki/browse',
            { host, origin, 'content-type': 'application/json; charset=utf-8' },
            'POST',
          ),
        ),
      ).toBeUndefined();
    });

    test.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data', ''])(
      'refuses Content-Type %j',
      (contentType) => {
        const headers = { host, origin, 'content-type': contentType };
        expect(whyRequestIsRefused(requestTo('/api/anki/browse', headers, 'POST'))).toBe(
          'Content-Type must be JSON',
        );
      },
    );

    test.each(['http://evil.example', 'http://localhost:5173', 'https://127.0.0.1:5173', 'null'])(
      'refuses Origin %s',
      (otherOrigin) => {
        const headers = { host, origin: otherOrigin, ...JSON_CONTENT_TYPE };
        expect(whyRequestIsRefused(requestTo('/api/anki/browse', headers, 'POST'))).toBe(
          'Origin must be this server',
        );
      },
    );

    test('refuses a request without an Origin', () => {
      expect(
        whyRequestIsRefused(requestTo('/api/anki/browse', { host, ...JSON_CONTENT_TYPE }, 'POST')),
      ).toBe('Origin must be this server');
    });

    test('checks other methods that change state too', () => {
      expect(
        whyRequestIsRefused(
          requestTo('/api/anki/browse', { host, ...JSON_CONTENT_TYPE }, 'DELETE'),
        ),
      ).toBe('Origin must be this server');
    });
  });

  describe('for an API GET', () => {
    test('needs only the Host', () => {
      expect(
        whyRequestIsRefused(requestTo('/api/anki/status', { host: 'localhost:5173' })),
      ).toBeUndefined();
    });
  });

  describe('for a POST outside the API', () => {
    test('needs only the Host', () => {
      expect(
        whyRequestIsRefused(requestTo('/apiary', { host: 'localhost:5173' }, 'POST')),
      ).toBeUndefined();
    });
  });
});
