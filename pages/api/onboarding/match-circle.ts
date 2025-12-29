import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { susuPurposeGroups } from '../../../shared/schema';
import { eq, and, lt, gte } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { sessionId, mode, walletAddress } = req.body;

    if (!mode || !['community', 'capital'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'Invalid mode selected' });
    }

    const contributionThreshold = mode === 'capital' ? '1000' : '100';
    const maxContribution = mode === 'capital' ? '10000' : '1000';

    const availableCircles = await db.select()
      .from(susuPurposeGroups)
      .where(
        and(
          eq(susuPurposeGroups.isActive, true),
          gte(susuPurposeGroups.contributionAmount, contributionThreshold),
          lt(susuPurposeGroups.contributionAmount, maxContribution)
        )
      )
      .limit(5);

    if (availableCircles.length > 0) {
      const matchedCircle = availableCircles[Math.floor(Math.random() * availableCircles.length)];
      return res.json({
        success: true,
        circle: {
          id: matchedCircle.id,
          name: matchedCircle.displayName || `Circle #${matchedCircle.id}`,
          members: matchedCircle.memberCount || 0,
          contributionAmount: `$${matchedCircle.contributionAmount}/month`,
          tags: mode === 'capital' 
            ? ['Capital Mode', 'Investment Ready', 'High Yield']
            : ['Community', 'Beginner Friendly', 'Protected'],
        },
      });
    }

    const defaultCircle = {
      id: 'auto-match',
      name: mode === 'capital' ? 'Capital Builders Circle' : 'Community Starters Circle',
      members: Math.floor(Math.random() * 8) + 3,
      contributionAmount: mode === 'capital' ? '$1,500/month' : '$250/month',
      tags: mode === 'capital'
        ? ['Capital Mode', 'New Group', 'High Growth']
        : ['Community', 'New Group', 'Beginner Friendly'],
    };

    return res.json({
      success: true,
      circle: defaultCircle,
      isNewCircle: true,
    });
  } catch (error) {
    console.error('Circle matching error:', error);
    return res.status(500).json({ success: false, error: 'Failed to match circle' });
  }
}
