/**
 * Axiom Rail — CORS Utility
 *
 * Provides two CORS modes:
 *  - setOpenCors()  — wildcard, for public discovery/info endpoints
 *  - setRailCors()  — origin allowlist, for authenticated transactional endpoints
 *
 * The auth endpoint (SEP-10) is served with open CORS because any Stellar
 * wallet app from any origin must be able to authenticate. Authenticated
 * transactional endpoints (submit, transactions) use the allowlist so only
 * trusted origins can read their responses.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const ALLOWED_ORIGINS: string[] = [
  'https://axiomprotocol.app',
  'https://www.axiomprotocol.app',
  'https://lobstr.co',
  'https://stellarx.com',
  'https://stellarterm.com',
  'https://freighter.app',
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co')) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

export function setOpenCors(res: NextApiResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export function setRailCors(req: NextApiRequest, res: NextApiResponse): void {
  const origin = req.headers.origin ?? '';
  if (!origin) {
    return;
  }
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://axiomprotocol.app');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export function handlePreflight(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
