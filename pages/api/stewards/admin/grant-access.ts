import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { stewardAssignments, stewardRegions } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, adminSecret } = req.body;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  const expectedSecret = process.env.ADMIN_SETUP_SECRET;
  if (!expectedSecret || adminSecret !== expectedSecret) {
    return res.status(403).json({ error: 'Invalid admin secret' });
  }

  const normalizedWallet = wallet.toLowerCase();

  try {
    let regions = await db
      .select()
      .from(stewardRegions)
      .limit(1)
      .catch(() => []);

    let regionId: number;
    
    if (regions.length === 0) {
      const [newRegion] = await db
        .insert(stewardRegions)
        .values({
          name: 'Admin Test Region',
          coverage: 'All Areas',
          status: 'active'
        })
        .returning();
      regionId = newRegion.id;
    } else {
      regionId = regions[0].id;
    }

    const existing = await db
      .select()
      .from(stewardAssignments)
      .where(eq(stewardAssignments.wallet, normalizedWallet))
      .limit(1)
      .catch(() => []);

    if (existing.length > 0) {
      await db
        .update(stewardAssignments)
        .set({ 
          role: 'admin',
          status: 'active',
          regionId,
          updatedAt: new Date()
        })
        .where(eq(stewardAssignments.wallet, normalizedWallet));

      return res.status(200).json({
        success: true,
        message: 'Admin access updated',
        wallet: normalizedWallet,
        role: 'admin',
        regionId
      });
    }

    const [assignment] = await db
      .insert(stewardAssignments)
      .values({
        wallet: normalizedWallet,
        role: 'admin',
        status: 'active',
        regionId
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: 'Admin access granted',
      wallet: normalizedWallet,
      role: 'admin',
      regionId,
      assignmentId: assignment.id
    });
  } catch (error) {
    console.error('Grant access error:', error);
    return res.status(500).json({ error: 'Failed to grant access' });
  }
}
