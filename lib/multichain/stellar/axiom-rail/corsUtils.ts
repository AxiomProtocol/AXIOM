/**
 * Axiom Rail — CORS Utility
 *
 * setOpenCors()  — wildcard (*), ONLY for public info/discovery endpoints
 *                  (sep24/info, sep31/info, sep38/*)
 * setRailCors()  — strict allowlist for ALL authenticated + admin endpoints:
 *                    Production: https://axiomprotocol.app
 *                    Development: http://localhost:5000
 *                  Requests from other origins receive the production origin in
 *                  the header so browsers enforce the block.
 * handlePreflight() — handles OPTIONS pre-flight, returns true if consumed
 *
 * isPostMessageOriginAllowed() — explicit allowlist of Stellar wallet origins
 *   that may postMessage a SEP-10 JWT to our interactive pages.
 *   To add a new wallet, append its exact origin to POSTMESSAGE_ALLOWED_ORIGINS
 *   and document the operational justification in this file.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const PROD_ORIGIN = 'https://axiomprotocol.app';
const DEV_ORIGIN  = 'http://localhost:5000';

// Strict two-entry allowlist. Wildcard suffix matching is intentionally
// excluded — every permitted origin must be named explicitly here.
const RAIL_ALLOWED_ORIGINS: readonly string[] = [
  PROD_ORIGIN,
  DEV_ORIGIN,
];

export function setOpenCors(res: NextApiResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export function setRailCors(req: NextApiRequest, res: NextApiResponse): void {
  const origin = req.headers.origin ?? '';
  if (!origin) return;
  const allowed = (RAIL_ALLOWED_ORIGINS as string[]).includes(origin) ? origin : PROD_ORIGIN;
  res.setHeader('Access-Control-Allow-Origin', allowed);
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
 * Explicit allowlist of Stellar wallet origins permitted to deliver a SEP-10
 * JWT to the interactive deposit/withdraw pages via window.postMessage.
 *
 * No wildcard suffix matching — every wallet must be named here.
 * Operational process: PR review + security sign-off required to add entries.
 */
export const POSTMESSAGE_ALLOWED_ORIGINS: readonly string[] = [
  PROD_ORIGIN,
  DEV_ORIGIN,
  // Known Stellar wallet applications
  'https://lobstr.co',
  'https://stellarx.com',
  'https://stellarterm.com',
  'https://freighter.app',
];

export function isPostMessageOriginAllowed(origin: string): boolean {
  return (POSTMESSAGE_ALLOWED_ORIGINS as string[]).includes(origin);
}
