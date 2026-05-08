import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { getBalance, ensureBalance } from '@/lib/wallet/service';

const FOUNDER_USER_ID = 'operator_founder';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const userId = FOUNDER_USER_ID;
    let balance = await getBalance(userId);
    if (!balance) {
      balance = await ensureBalance(userId);
    }
    return res.status(200).json({
      success: true,
      data: {
        user_id: balance.userId,
        available_cents: balance.availableCents,
        pending_cents: balance.pendingCents,
        available_usd: balance.availableCents / 100,
        pending_usd: balance.pendingCents / 100,
        lifetime_deposited_cents: balance.lifetimeDepositedCents,
        lifetime_allocated_cents: balance.lifetimeAllocatedCents,
        updated_at: balance.updatedAt,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Balance fetch failed';
    console.error('[wallet/balance]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
