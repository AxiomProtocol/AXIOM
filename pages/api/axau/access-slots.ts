import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { t3KycSubmissions } from '../../../shared/erc3643Schema';
import { inArray, count } from 'drizzle-orm';
import { AXAU_EARLY_ACCESS_CAP } from '../../../lib/axauEarlyAccess';

const ACTIVE_STATUSES = ['submitted', 'approved', 'activated'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [row] = await db
      .select({ total: count() })
      .from(t3KycSubmissions)
      .where(inArray(t3KycSubmissions.status, [...ACTIVE_STATUSES]));

    const submitted = Number(row?.total ?? 0);
    const remaining = Math.max(0, AXAU_EARLY_ACCESS_CAP - submitted);

    return res.status(200).json({
      cap: AXAU_EARLY_ACCESS_CAP,
      approved: submitted,
      remaining,
      isFull: remaining === 0,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
