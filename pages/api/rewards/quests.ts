import { NextApiRequest, NextApiResponse } from 'next';
import { getQuests, getQuestsWithUserProgress, getUserQuests, startQuest, completeQuest, updateQuestProgress } from '../../../lib/rewards';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { category, userId } = req.query;

    try {
      const quests = userId 
        ? getQuestsWithUserProgress(userId as string, category as any)
        : getQuests(category as any);
      const userQuests = userId ? getUserQuests(userId as string) : [];

      return res.status(200).json({
        success: true,
        quests,
        userQuests,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching quests:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch quests' });
    }
  }

  if (req.method === 'POST') {
    const { action, userId, questId } = req.body;

    if (!userId || !questId) {
      return res.status(400).json({ success: false, error: 'User ID and Quest ID required' });
    }

    if (action === 'start') {
      const userQuest = startQuest(userId, questId);
      
      logAuditEvent({
        action: 'quest_started',
        ipAddress: clientId,
        userId,
        details: { questId },
        severity: 'info',
        success: !!userQuest
      });

      return res.status(200).json({ success: !!userQuest, userQuest });
    }

    if (action === 'complete') {
      const result = completeQuest(userId, questId);
      
      logAuditEvent({
        action: 'quest_completed',
        ipAddress: clientId,
        userId,
        details: { questId, rewards: result.rewards },
        severity: 'info',
        success: result.success
      });

      return res.status(200).json(result);
    }

    if (action === 'updateProgress') {
      const { requirementId, increment } = req.body;
      if (!requirementId) {
        return res.status(400).json({ success: false, error: 'Requirement ID required' });
      }
      
      const result = updateQuestProgress(userId, questId, requirementId, increment || 1);
      
      logAuditEvent({
        action: 'quest_progress_updated',
        ipAddress: clientId,
        userId,
        details: { questId, requirementId, increment, completed: result.completed },
        severity: 'info',
        success: result.success
      });

      return res.status(200).json(result);
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
