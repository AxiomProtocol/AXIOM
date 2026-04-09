/**
 * GET /api/axiom-rail/account-info
 *
 * Returns the live Increase bank account details for Axiom Rail deposits.
 *
 * Auth policy: intentionally public — this is the deposit instruction page that
 * Stellar wallets open for their users. If a SEP-10 JWT is present (Authorization
 * Bearer header), it is validated and the request is rejected if invalid. If no
 * token is provided, the request proceeds (public bank receiving details, equivalent
 * to publishing routing info on a website).
 *
 * All values come from the Increase API — no hardcoded fallbacks for routing
 * or account numbers. Returns null fields when Increase is unavailable.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyRailJwt } from '../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { IncreaseService, getAccountId } from '../../../lib/services/IncreaseService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (token) {
    const { valid } = verifyRailJwt(token);
    if (!valid) return res.status(403).json({ error: 'Invalid or expired SEP-10 token' });
  }

  const accountId = getAccountId();
  if (!accountId) {
    return res.status(200).json({
      bankName: null,
      beneficiary: 'Axiom Protocol LLC',
      routingNumber: null,
      accountNumber: null,
      accountName: null,
      status: 'no_account_configured',
    });
  }

  try {
    const result = await IncreaseService.listAccountNumbers(accountId);
    const active = result.data.find(an => an.status === 'active') ?? result.data[0] ?? null;

    if (!active) {
      return res.status(200).json({
        bankName: null,
        beneficiary: 'Axiom Protocol LLC',
        routingNumber: null,
        accountNumber: null,
        accountName: null,
        status: 'no_account_number',
      });
    }

    const account = await IncreaseService.getAccount(accountId).catch(() => null);

    return res.status(200).json({
      bankName: account?.bank ?? null,
      beneficiary: 'Axiom Protocol LLC',
      routingNumber: active.routing_number,
      accountNumber: active.account_number,
      accountName: active.name,
      status: 'ok',
    });
  } catch (err: unknown) {
    console.error('[account-info] Increase error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      status: 'error',
    });
  }
}
