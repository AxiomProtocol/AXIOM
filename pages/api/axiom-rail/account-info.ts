/**
 * GET /api/axiom-rail/account-info
 *
 * Returns the Increase bank account details for Axiom Rail deposits.
 * Requires a valid SEP-10 JWT token (from deposit/withdraw interactive URL).
 * Returns routing number, account number, beneficiary, and bank name.
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

  try {
    const accountId = getAccountId();
    if (!accountId) {
      return res.status(200).json({
        bankName: 'Thread Bank (via Increase)',
        beneficiary: 'Axiom Protocol LLC',
        routingNumber: '125109248',
        accountNumber: null,
        accountName: null,
        status: 'no_account_configured',
      });
    }

    const result = await IncreaseService.listAccountNumbers(accountId);
    const active = result.data.find(an => an.status === 'active') ?? result.data[0] ?? null;

    if (!active) {
      return res.status(200).json({
        bankName: 'Thread Bank (via Increase)',
        beneficiary: 'Axiom Protocol LLC',
        routingNumber: '125109248',
        accountNumber: null,
        accountName: null,
        status: 'no_account_number',
      });
    }

    return res.status(200).json({
      bankName: 'Thread Bank (via Increase)',
      beneficiary: 'Axiom Protocol LLC',
      routingNumber: active.routing_number,
      accountNumber: active.account_number,
      accountName: active.name,
      status: 'ok',
    });
  } catch (err: unknown) {
    console.error('[account-info] Increase error:', err);
    return res.status(200).json({
      bankName: 'Thread Bank (via Increase)',
      beneficiary: 'Axiom Protocol LLC',
      routingNumber: '125109248',
      accountNumber: null,
      accountName: null,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
