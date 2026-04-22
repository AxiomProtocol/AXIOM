/**
 * GET /.well-known/stellar.toml  (rewritten via next.config.js)
 *
 * Serves Axiom Protocol's Stellar wallet manifest with the required
 * Access-Control-Allow-Origin: * header. MoneyGram Ramps (and all
 * SEP-compliant anchors) fetch this during domain allowlist verification
 * and during SEP-10 challenge flow.
 *
 * nextConfig rewrites: /.well-known/stellar.toml → /api/stellar-toml
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const TOML_PATH = path.join(process.cwd(), 'public', '.well-known', 'stellar.toml');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).end();
  }

  try {
    const content = fs.readFileSync(TOML_PATH, 'utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(content);
  } catch {
    return res.status(500).json({ error: 'stellar.toml not found' });
  }
}
