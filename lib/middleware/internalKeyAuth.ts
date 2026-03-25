import type { NextApiRequest } from 'next';
import type { NextRequest } from 'next/server';

export function getInternalKeyFromHeaders(headers: Record<string, string | string[] | undefined>): string {
  const v = headers['x-internal-key'];
  return Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
}

export function requireInternalKeyApi(req: NextApiRequest): { ok: true } | { ok: false; status: number; error: string; code: string } {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) {
    return { ok: false, status: 503, error: 'Internal auth is not configured', code: 'INTERNAL_AUTH_NOT_CONFIGURED' };
  }

  const provided = getInternalKeyFromHeaders(req.headers as any);
  if (!provided) {
    return { ok: false, status: 401, error: 'Missing x-internal-key header', code: 'INTERNAL_KEY_MISSING' };
  }

  if (provided !== expected) {
    return { ok: false, status: 403, error: 'Invalid internal key', code: 'INTERNAL_KEY_INVALID' };
  }

  return { ok: true };
}

export function requireInternalKeyApp(req: NextRequest): { ok: true } | { ok: false; status: number; error: string; code: string } {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) {
    return { ok: false, status: 503, error: 'Internal auth is not configured', code: 'INTERNAL_AUTH_NOT_CONFIGURED' };
  }

  const provided = req.headers.get('x-internal-key') ?? '';
  if (!provided) {
    return { ok: false, status: 401, error: 'Missing x-internal-key header', code: 'INTERNAL_KEY_MISSING' };
  }

  if (provided !== expected) {
    return { ok: false, status: 403, error: 'Invalid internal key', code: 'INTERNAL_KEY_INVALID' };
  }

  return { ok: true };
}