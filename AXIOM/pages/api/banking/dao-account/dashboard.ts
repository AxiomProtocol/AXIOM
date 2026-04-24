/**
 * GET /api/banking/dao-account/dashboard
 *
 * Account token gated (X-Account-Token header).
 * Returns masked account number, routing number, live balance from Increase,
 * and paginated transaction history.
 * BSA fields are never returned.
 * Full account number is never returned — only masked version.
 *
 * Query params:
 *   limit  — number of transactions to return (default 20, max 100)
 *   cursor — pagination cursor (future use)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../../../server/db';
import { daoAccountApplications } from '../../../../shared/daoAccountSchema';
import { IncreaseService } from '../../../../lib/services/IncreaseService';

const TOKEN_SALT = 'axiom-dao-account-token-v1';

function hashToken(plaintext: string): string {
  return createHash('sha256').update(`${TOKEN_SALT}:${plaintext}`).digest('hex');
}

function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function maskAccountNumber(num: string): string {
  if (!num || num.length < 4) return '••••';
  return '•'.repeat(num.length - 4) + num.slice(-4);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rawToken = req.headers['x-account-token'];
  if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
    return res.status(401).json({ error: 'Account token required (X-Account-Token header)' });
  }

  const limit = Math.min(Math.max(1, Number(req.query.limit ?? 20)), 100);

  const providedHash = hashToken(rawToken.trim());

  try {
    const applications = await db
      .select()
      .from(daoAccountApplications)
      .where(eq(daoAccountApplications.status, 'active'));

    const match = applications.find(a =>
      a.accountTokenHash && constantTimeCompare(a.accountTokenHash, providedHash)
    );

    if (!match) {
      return res.status(403).json({ error: 'Invalid account token' });
    }

    if (!match.increaseAccountId) {
      return res.status(500).json({ error: 'Account provisioned but Increase account ID is missing — contact support' });
    }

    const [balance, txResult] = await Promise.all([
      IncreaseService.getAccountBalance(match.increaseAccountId).catch(() => null),
      IncreaseService.listTransactions(match.increaseAccountId, limit).catch(() => ({ data: [] })),
    ]);

    const transactions = txResult.data.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      amountFormatted: IncreaseService.formatAmount(tx.amount),
      direction: tx.amount >= 0 ? 'credit' : 'debit',
      description: tx.description,
      routeType: tx.route_type,
      createdAt: tx.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: {
        entityName: match.entityName,
        status: match.status,
        increaseAccountId: match.increaseAccountId,
        accountNumber: match.increaseAccountNumber ? maskAccountNumber(match.increaseAccountNumber) : null,
        routingNumber: match.increaseRoutingNumber ?? null,
        balance: balance
          ? {
              available: balance.available_balance,
              current: balance.current_balance,
              availableFormatted: IncreaseService.formatAmount(balance.available_balance),
              currentFormatted: IncreaseService.formatAmount(balance.current_balance),
            }
          : null,
        transactions,
        pagination: {
          limit,
          returned: transactions.length,
        },
        createdAt: match.createdAt,
        environment: process.env.INCREASE_ENVIRONMENT ?? 'sandbox',
      },
    });
  } catch (err: unknown) {
    console.error('[DAO Account Dashboard] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load dashboard' });
  }
}
