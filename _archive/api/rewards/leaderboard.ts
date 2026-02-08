import { NextApiRequest, NextApiResponse } from 'next';
import { getLeaderboard, getUserLevel, getStakingBoosts } from '../../../lib/rewards';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const clientId = getClientIdentifier(req);
  const { userId, limit } = req.query;

  try {
    const leaderboard = getLeaderboard(limit ? parseInt(limit as string) : 10);
    const userLevel = userId ? getUserLevel(userId as string) : null;
    const boosts = getStakingBoosts();

    logAuditEvent({
      action: 'leaderboard_viewed',
      ipAddress: clientId,
      userId: userId as string,
      details: { limit },
      severity: 'info',
      success: true
    });

    return res.status(200).json({
      success: true,
      leaderboard,
      userLevel,
      boosts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
