/**
 * Tests for GET /api/capinfra/operator/integrity-pager-status (Task #305).
 *
 * The endpoint backs the operator dashboard banner. It must:
 *   1. Reject anonymous callers (401) so the configuration shape
 *      cannot be probed from the public internet.
 *   2. Reject non-GET methods with 405 + Allow: GET.
 *   3. Accept the cookie set by the operator login flow.
 *   4. Return ONLY the booleans documented on `IntegrityPagerStatus`
 *      — the rendered JSON must never contain the actual recipient
 *      list or webhook URL.
 *   5. Send `Cache-Control: no-store` so a freshly-rotated env var
 *      is reflected on the next reload, not the next CDN expiry.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const { default: handler } = await import(
  '../pages/api/capinfra/operator/integrity-pager-status'
);

interface MockReqOptions {
  method?: string;
  cookies?: Record<string, string>;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'GET', cookies = {} } = opts;
  return {
    method,
    headers: {},
    cookies,
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;
}

interface MockResResult {
  res: NextApiResponse;
  statusCode(): number;
  body(): string;
  headers(): Record<string, string>;
}

function makeRes(): MockResResult {
  let _statusCode = 200;
  let _body = '';
  const _headers: Record<string, string> = {};
  const res = {
    status(code: number) {
      _statusCode = code;
      return res;
    },
    json(data: unknown) {
      _body = JSON.stringify(data);
      return res;
    },
    setHeader(name: string, value: string) {
      _headers[name.toLowerCase()] = value;
      return res;
    },
  } as unknown as NextApiResponse;
  return {
    res,
    statusCode: () => _statusCode,
    body: () => _body,
    headers: () => _headers,
  };
}

const OPERATOR_KEY = 'test-operator-key';
const SECRET_RECIPIENT = 'oncall@axiomprotocol.app';
const SECRET_WEBHOOK = 'https://discord.com/api/webhooks/1/abc-secret';

const savedEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = {
    ...savedEnv,
    ADMIN_SOLVENCY_KEY: OPERATOR_KEY,
  };
  delete process.env.INTEGRITY_ALERT_EMAIL;
  delete process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK;
});

afterEach(() => {
  process.env = savedEnv;
});

describe('GET /api/capinfra/operator/integrity-pager-status', () => {
  it('returns 401 with no body leak when the cookie is missing', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = SECRET_RECIPIENT;
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK = SECRET_WEBHOOK;

    const { res, statusCode, body } = makeRes();
    await handler(makeReq({}), res);
    expect(statusCode()).toBe(401);
    expect(JSON.parse(body())).toEqual({ error: 'UNAUTHORIZED' });
    // Critical: an unauth response must NOT carry the booleans either,
    // otherwise the configuration shape is probeable.
    expect(body()).not.toMatch(/email/);
    expect(body()).not.toMatch(/discord/);
  });

  it('returns 401 when the cookie value is wrong', async () => {
    const { res, statusCode, body } = makeRes();
    await handler(
      makeReq({ cookies: { cap_operator_key: 'not-the-real-key' } }),
      res,
    );
    expect(statusCode()).toBe(401);
    expect(JSON.parse(body())).toEqual({ error: 'UNAUTHORIZED' });
  });

  it('returns 405 + Allow: GET for non-GET methods', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const { res, statusCode, body, headers } = makeRes();
      await handler(
        makeReq({
          method,
          cookies: { cap_operator_key: OPERATOR_KEY },
        }),
        res,
      );
      expect(statusCode()).toBe(405);
      expect(JSON.parse(body())).toEqual({ error: 'METHOD_NOT_ALLOWED' });
      expect(headers().allow).toBe('GET');
    }
  });

  it('returns the booleans-only status envelope when both env vars are set', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = SECRET_RECIPIENT;
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK = SECRET_WEBHOOK;

    const { res, statusCode, body, headers } = makeRes();
    await handler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(JSON.parse(body())).toEqual({
      email: true,
      discord: true,
      anyConfigured: true,
      bothConfigured: true,
    });
    // No-store keeps a freshly-rotated env var visible on the next
    // reload.
    expect(headers()['cache-control']).toBe('no-store, max-age=0');
    // Critical leakage guard: the response body must NEVER contain
    // the actual recipient string or webhook URL.
    expect(body()).not.toContain(SECRET_RECIPIENT);
    expect(body()).not.toContain(SECRET_WEBHOOK);
  });

  it('returns false/false when neither channel is configured', async () => {
    const { res, statusCode, body } = makeRes();
    await handler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(JSON.parse(body())).toEqual({
      email: false,
      discord: false,
      anyConfigured: false,
      bothConfigured: false,
    });
  });

  it('reflects email-only configuration in the partial state', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = SECRET_RECIPIENT;

    const { res, statusCode, body } = makeRes();
    await handler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(JSON.parse(body())).toEqual({
      email: true,
      discord: false,
      anyConfigured: true,
      bothConfigured: false,
    });
    expect(body()).not.toContain(SECRET_RECIPIENT);
  });
});
