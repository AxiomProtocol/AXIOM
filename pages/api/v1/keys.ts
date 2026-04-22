/**
 * Axiom Data API — v1/keys
 *
 * Self-serve API key management.
 *
 * POST /api/v1/keys
 *   Body: { email: string, wallet?: string, label?: string }
 *   Creates a free-tier key instantly. Upgrade requires Axiom team contact.
 *
 * GET /api/v1/keys/status
 *   Header: X-Api-Key: <key>
 *   Returns tier, daily usage, and remaining calls.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { dpApiKeys, TIER_DAILY_LIMITS } from '../../../shared/distressedFeedSchema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

function generateKey(): string {
  return 'axm_' + crypto.randomBytes(28).toString('hex');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // -----------------------------------------------------------------------
  // GET — key status lookup
  // -----------------------------------------------------------------------
  if (req.method === 'GET') {
    const rawKey = (req.headers['x-api-key'] as string || req.query.api_key as string || '').trim();
    if (!rawKey) {
      return res.status(400).json({ error: 'Provide X-Api-Key header or ?api_key=' });
    }

    const rows = await db.select().from(dpApiKeys).where(eq(dpApiKeys.apiKey, rawKey)).limit(1);
    if (rows.length === 0) return res.status(404).json({ error: 'Key not found' });

    const key = rows[0];
    const today = todayStr();
    const daily = TIER_DAILY_LIMITS[key.tier] ?? 10;
    const used  = key.resetDate === today ? key.requestsToday : 0;

    return res.status(200).json({
      tier: key.tier,
      active: key.active,
      label: key.label,
      dailyLimit: daily,
      requestsToday: used,
      requestsRemaining: Math.max(0, daily - used),
      resetsAt: `${today}T23:59:59Z`,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
    });
  }

  // -----------------------------------------------------------------------
  // POST — provision a new free-tier key
  // -----------------------------------------------------------------------
  if (req.method === 'POST') {
    const { email, wallet, label } = req.body || {};

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    // Limit: 2 active keys per email address
    const existing = await db.select({ id: dpApiKeys.id })
      .from(dpApiKeys)
      .where(eq(dpApiKeys.ownerEmail, email.toLowerCase().trim()));

    if (existing.length >= 2) {
      return res.status(409).json({
        error: 'Maximum of 2 API keys per email address.',
        detail: 'Contact data@axiomprotocol.io to upgrade or rotate keys.',
      });
    }

    const newKey = generateKey();
    const today  = todayStr();

    await db.insert(dpApiKeys).values({
      apiKey: newKey,
      ownerEmail: email.toLowerCase().trim(),
      ownerWallet: wallet || null,
      tier: 'free',
      dailyLimit: TIER_DAILY_LIMITS.free,
      requestsToday: 0,
      resetDate: today,
      active: true,
      label: label || null,
    });

    return res.status(201).json({
      apiKey: newKey,
      tier: 'free',
      dailyLimit: TIER_DAILY_LIMITS.free,
      message: 'Free tier key provisioned. Store this key — it will not be shown again.',
      upgrade: 'Contact data@axiomprotocol.io to upgrade to Starter, Pro, or Enterprise.',
      docs: '/api-docs',
      quickStart: `curl -H "X-Api-Key: ${newKey}" "https://axiomprotocol.io/api/v1/properties?state=TX&limit=5"`,
    });
  }

  return res.status(405).json({ error: 'Method not allowed', allowed: ['GET', 'POST'] });
}
