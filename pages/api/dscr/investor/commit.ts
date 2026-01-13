import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { investorCommitments } from '../../../../shared/schema';
import { eq, desc } from 'drizzle-orm';

function verifyAdminToken(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  return token === process.env.ADMIN_SETUP_SECRET;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        walletAddress,
        commitmentAmount,
        tierPreference,
        timelineMonths,
        isAccredited,
        accreditationMethod,
        isEntity,
        entityName,
        entityType,
        investorNotes,
        source,
        referralCode
      } = req.body;

      if (!firstName || !lastName || !email || !commitmentAmount) {
        return res.status(400).json({ 
          error: 'Required fields: first name, last name, email, and commitment amount' 
        });
      }

      const amount = parseFloat(commitmentAmount);
      if (isNaN(amount) || amount < 25000) {
        return res.status(400).json({ 
          error: 'Minimum commitment amount is $25,000' 
        });
      }

      if (amount >= 250000 && !isAccredited) {
        return res.status(400).json({ 
          error: 'Investments of $250,000 or more require accredited investor verification' 
        });
      }

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      const [commitment] = await db.insert(investorCommitments)
        .values({
          firstName,
          lastName,
          email,
          phone,
          walletAddress,
          commitmentAmount: amount.toString(),
          tierPreference: tierPreference || null,
          timelineMonths: timelineMonths ? parseInt(timelineMonths) : null,
          isAccredited: isAccredited || false,
          accreditationMethod: accreditationMethod || null,
          isEntity: isEntity || false,
          entityName,
          entityType,
          investorNotes,
          source: source || 'website',
          referralCode,
          status: 'soft_commit',
          expiresAt
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: 'Investment commitment registered successfully',
        commitmentId: commitment.id,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error('Investor commitment error:', error);
      return res.status(500).json({ error: 'Failed to register commitment' });
    }
  }

  if (req.method === 'GET') {
    const { wallet, email } = req.query;

    if (wallet || email) {
      try {
        let commitments;
        if (wallet) {
          commitments = await db.select()
            .from(investorCommitments)
            .where(eq(investorCommitments.walletAddress, wallet as string))
            .orderBy(desc(investorCommitments.createdAt));
        } else if (email) {
          commitments = await db.select()
            .from(investorCommitments)
            .where(eq(investorCommitments.email, email as string))
            .orderBy(desc(investorCommitments.createdAt));
        }

        return res.status(200).json({
          success: true,
          commitments: commitments || []
        });
      } catch (error) {
        console.error('Error fetching commitments:', error);
        return res.status(500).json({ error: 'Failed to fetch commitments' });
      }
    }

    if (!verifyAdminToken(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const commitments = await db.select()
        .from(investorCommitments)
        .orderBy(desc(investorCommitments.createdAt));

      const stats = {
        total: commitments.length,
        softCommit: commitments.filter(c => c.status === 'soft_commit').length,
        confirmed: commitments.filter(c => c.status === 'confirmed').length,
        funded: commitments.filter(c => c.status === 'funded').length,
        totalCommitted: commitments.reduce((sum, c) => sum + parseFloat(c.commitmentAmount || '0'), 0),
        accreditedCount: commitments.filter(c => c.isAccredited).length
      };

      return res.status(200).json({
        success: true,
        commitments,
        stats
      });
    } catch (error) {
      console.error('Error fetching commitments:', error);
      return res.status(500).json({ error: 'Failed to fetch commitments' });
    }
  }

  if (req.method === 'PATCH') {
    if (!verifyAdminToken(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, status, adminNotes } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Commitment ID required' });
    }

    try {
      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

      const [updated] = await db.update(investorCommitments)
        .set(updateData)
        .where(eq(investorCommitments.id, parseInt(id)))
        .returning();

      return res.status(200).json({
        success: true,
        message: 'Commitment updated',
        commitment: updated
      });
    } catch (error) {
      console.error('Error updating commitment:', error);
      return res.status(500).json({ error: 'Failed to update commitment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
