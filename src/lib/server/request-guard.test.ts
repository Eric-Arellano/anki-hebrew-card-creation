import { describe, expect, test } from 'vitest';
import { refusal } from './request-guard.ts';

function request(path: string, headers: Record<string, string>, method = 'GET'): Request {
  return new Request(`http://127.0.0.1:5173${path}`, { method, headers });
}

const json = { 'content-type': 'application/json' };

describe('refusal', () => {
  describe('for any request', () => {
    test.each(['127.0.0.1:5173', '127.0.0.1', 'localhost:3000', 'localhost'])(
      'lets Host %s through',
      (host) => {
        expect(refusal(request('/', { host }))).toBeUndefined();
      },
    );

    test.each(['evil.example', '127.0.0.1.evil.example', 'localhost.evil.example:5173', ''])(
      'refuses Host %j',
      (host) => {
        expect(refusal(request('/', { host }))).toBe('Host must be 127.0.0.1 or localhost');
      },
    );

    test('refuses a request without a Host', () => {
      expect(refusal(request('/', {}))).toBe('Host must be 127.0.0.1 or localhost');
    });
  });

  describe('for an API POST', () => {
    const host = '127.0.0.1:5173';
    const origin = 'http://127.0.0.1:5173';

    test('lets JSON from this origin through', () => {
      expect(refusal(request('/api/anki/browse', { host, origin, ...json }, 'POST'))).toBe(
        undefined,
      );
      expect(
        refusal(
          request(
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
        expect(refusal(request('/api/anki/browse', headers, 'POST'))).toBe(
          'Content-Type must be JSON',
        );
      },
    );

    test.each(['http://evil.example', 'http://localhost:5173', 'https://127.0.0.1:5173', 'null'])(
      'refuses Origin %s',
      (otherOrigin) => {
        const headers = { host, origin: otherOrigin, ...json };
        expect(refusal(request('/api/anki/browse', headers, 'POST'))).toBe(
          'Origin must be this server',
        );
      },
    );

    test('refuses a request without an Origin', () => {
      expect(refusal(request('/api/anki/browse', { host, ...json }, 'POST'))).toBe(
        'Origin must be this server',
      );
    });

    test('checks other methods that change state too', () => {
      expect(refusal(request('/api/anki/browse', { host, ...json }, 'DELETE'))).toBe(
        'Origin must be this server',
      );
    });
  });

  describe('for an API GET', () => {
    test('needs only the Host', () => {
      expect(refusal(request('/api/anki/status', { host: 'localhost:5173' }))).toBeUndefined();
    });
  });

  describe('for a POST outside the API', () => {
    test('needs only the Host', () => {
      expect(refusal(request('/apiary', { host: 'localhost:5173' }, 'POST'))).toBeUndefined();
    });
  });
});
