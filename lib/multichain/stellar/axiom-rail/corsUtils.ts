/**
 * Axiom Rail — CORS Utility
 *
 * setOpenCors()  — wildcard, for public read-only info/discovery endpoints only
 * setRailCors()  — scoped allowlist for all authenticated and admin endpoints:
 *                  axiomprotocol.app (production) + localhost:5000 (development)
 *                  + *.replit.dev (Replit dev preview)
 * handlePreflight() — handles OPTIONS pre-flight and returns true if handled
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const PROD_ORIGIN = 'https://axiomprotocol.app';

// Intentionally includes dev-only origins (localhost, *.replit.dev).
// These are matched separately in isRailAllowed() below and never reach production
// traffic because Replit dev URLs are ephemeral and localhost is only reachable
// inside the container. In production, only PROD_ORIGIN and www. variant match.
const RAIL_ALLOWED_ORIGINS: string[] = [
  PROD_ORIGIN,
  'https://www.axiomprotocol.app',
  'http://localhost:5000',
  'http://localhost:3000',
];

function isRailAllowed(origin: string): boolean {
  if (RAIL_ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co')) return true;
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
  if (isRailAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', PROD_ORIGIN);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-key');
}

export function handlePreflight(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Origins allowed to postMessage a SEP-10 JWT to the interactive deposit/
 * withdraw pages. Broader than the API CORS allowlist because any Stellar
 * wallet may open our interactive page in an iframe or popup and deliver
 * the token.
 */
export const POSTMESSAGE_ALLOWED_ORIGINS: string[] = [
  PROD_ORIGIN,
  'https://www.axiomprotocol.app',
  'https://lobstr.co',
  'https://stellarx.com',
  'https://stellarterm.com',
  'https://freighter.app',
  'http://localhost:5000',
  'http://localhost:3000',
];

export function isPostMessageOriginAllowed(origin: string): boolean {
  if (POSTMESSAGE_ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.replit.dev') || origin.endsWith('.repl.co')) return true;
  return false;
}
