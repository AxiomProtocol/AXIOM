import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/server/db';
import { treasuryAccounts } from '@/shared/schema';
import { eq, desc } from 'drizzle-orm';
import { adminOnlyDuringObservation } from '@/middleware/observationGuard';
import { isTreasuryInternalEnabled, isInObservationMode } from '@/server/config/featureFlags';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isTreasuryInternalEnabled()) {
    return res.status(503).json({
      error: 'MODULE_DISABLED',
      message: 'Treasury Internal module is not enabled',
    });
  }

  if (req.method === 'GET') {
    try {
      const accounts = await db
        .select()
        .from(treasuryAccounts)
        .where(eq(treasuryAccounts.isActive, true))
        .orderBy(treasuryAccounts.accountType);

      const totalBalance = accounts.reduce(
        (sum, acc) => sum + parseFloat(acc.balance || '0'),
        0
      );

      return res.status(200).json({
        success: true,
        observationMode: isInObservationMode(),
        accounts,
        summary: {
          count: accounts.length,
          totalBalance: totalBalance.toFixed(2),
          currency: 'USD',
        },
      });
    } catch (error) {
      console.error('Treasury accounts fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, accountType, currency = 'USD' } = req.body;

      if (!name || !accountType) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'name and accountType are required',
        });
      }

      const validTypes = ['operating', 'reserve', 'escrow', 'development', 'insurance', 'contingency'];
      if (!validTypes.includes(accountType)) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: `accountType must be one of: ${validTypes.join(', ')}`,
        });
      }

      const adminUserId = 1;

      const [account] = await db
        .insert(treasuryAccounts)
        .values({
          name,
          description,
          accountType,
          currency,
          balance: '0',
          isActive: true,
          createdBy: adminUserId,
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: 'Treasury account created successfully',
        account,
        observationMode: isInObservationMode(),
      });
    } catch (error) {
      console.error('Treasury account creation error:', error);
      return res.status(500).json({ error: 'Failed to create account' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default adminOnlyDuringObservation(handler);
