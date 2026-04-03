import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { t3KycSubmissions } from '../../../shared/erc3643Schema';
import { eq, count } from 'drizzle-orm';
import { AXAU_EARLY_ACCESS_CAP } from '../../../lib/axauEarlyAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [row] = await db
      .select({ total: count() })
      .from(t3KycSubmissions)
      .where(eq(t3KycSubmissions.status, 'approved'));

    const approved = Number(row?.total ?? 0);
    const remaining = Math.max(0, AXAU_EARLY_ACCESS_CAP - approved);

    return res.status(200).json({
      cap: AXAU_EARLY_ACCESS_CAP,
      approved,
      remaining,
      isFull: remaining === 0,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
