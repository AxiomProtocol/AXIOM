import { NextApiRequest, NextApiResponse } from 'next';
import { questService, userQuestService, userXpService } from '../../../lib/db-services';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';
import { pool } from '../../../lib/db';

function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

async function resolveUserIdFromWallet(walletAddress: string): Promise<number | null> {
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1 LIMIT 1',
      [walletAddress]
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Error resolving user ID:', error);
    return null;
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { category, userId } = req.query;

    try {
      const quests = await questService.getAll(category as string);
      let userQuests: any[] = [];
      
      if (userId) {
        const userIdStr = userId as string;
        let numericUserId: number | null = null;
        
        if (userIdStr.startsWith('0x')) {
          numericUserId = await resolveUserIdFromWallet(userIdStr);
        } else {
          numericUserId = parseInt(userIdStr, 10);
          if (isNaN(numericUserId)) numericUserId = null;
        }
        
        if (numericUserId) {
          const dbUserQuests = await userQuestService.getByUserId(numericUserId);
          userQuests = dbUserQuests.map((uq: any) => ({
            questId: (uq.quest_id || uq.questId).toString(),
            status: uq.status,
            progress: uq.progress,
            startedAt: (uq.started_at || uq.startedAt)?.toISOString?.() || new Date().toISOString(),
            completedAt: (uq.completed_at || uq.completedAt)?.toISOString?.(),
            requirementProgress: uq.requirement_progress || uq.requirementProgress || {}
          }));
        }
      }

      const formattedQuests = quests.map(q => ({
        id: q.id.toString(),
        title: q.title,
        description: q.description,
        category: q.category,
        requirements: Array.isArray(q.requirements) ? q.requirements : [],
        rewards: Array.isArray(q.rewards) ? q.rewards : [],
        startDate: q.startDate,
        endDate: q.endDate,
        maxCompletions: q.maxCompletions,
        currentCompletions: q.currentCompletions,
        repeatable: q.repeatable
      }));

      return res.status(200).json({
        success: true,
        quests: formattedQuests,
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

    let numericUserId: number | null = null;
    if (userId.startsWith('0x')) {
      numericUserId = await resolveUserIdFromWallet(userId);
    } else {
      numericUserId = parseInt(userId, 10);
      if (isNaN(numericUserId)) numericUserId = null;
    }

    if (!numericUserId) {
      return res.status(400).json({ success: false, error: 'User not found. Please ensure your wallet is registered.' });
    }

    const numericQuestId = parseInt(questId.toString(), 10);
    if (isNaN(numericQuestId)) {
      return res.status(400).json({ success: false, error: 'Invalid Quest ID' });
    }

    if (action === 'start') {
      try {
        const quest = await questService.getById(numericQuestId);
        if (!quest) {
          return res.status(404).json({ success: false, error: 'Quest not found' });
        }

        const existing = await userQuestService.getByUserAndQuest(numericUserId, numericQuestId);
        if (existing && existing.status !== 'completed' && !quest.repeatable) {
          return res.status(400).json({ success: false, error: 'Quest already in progress' });
        }

        const userQuest = await userQuestService.create({
          userId: numericUserId,
          questId: numericQuestId,
          status: 'in_progress',
          progress: 0,
          requirementProgress: {},
          startedAt: new Date()
        });

        logAuditEvent({
          action: 'quest_started',
          ipAddress: clientId,
          userId: userId.toString(),
          details: { questId },
          severity: 'info',
          success: true
        });

        const uq: any = userQuest;
        return res.status(200).json({
          success: true,
          userQuest: {
            questId: (uq.quest_id || uq.questId).toString(),
            status: uq.status,
            progress: uq.progress,
            startedAt: (uq.started_at || uq.startedAt)?.toISOString?.() || new Date().toISOString(),
            requirementProgress: uq.requirement_progress || uq.requirementProgress || {}
          }
        });
      } catch (error) {
        console.error('Error starting quest:', error);
        return res.status(500).json({ success: false, error: 'Failed to start quest' });
      }
    }

    if (action === 'complete') {
      try {
        const userQuest = await userQuestService.getByUserAndQuest(numericUserId, numericQuestId);
        if (!userQuest || userQuest.status !== 'in_progress') {
          return res.status(400).json({ success: false, error: 'Quest not in progress' });
        }

        const quest = await questService.getById(numericQuestId);
        if (!quest) {
          return res.status(404).json({ success: false, error: 'Quest not found' });
        }

        await userQuestService.complete(userQuest.id);
        await questService.incrementCompletions(numericQuestId);

        const rewards = Array.isArray(quest.rewards) ? quest.rewards : [];
        const xpReward = rewards.find((r: any) => r.type === 'xp');
        if (xpReward) {
          await userXpService.createOrUpdate(numericUserId, xpReward.amount);
        }

        logAuditEvent({
          action: 'quest_completed',
          ipAddress: clientId,
          userId: userId.toString(),
          details: { questId, rewards },
          severity: 'info',
          success: true
        });

        return res.status(200).json({ success: true, rewards });
      } catch (error) {
        console.error('Error completing quest:', error);
        return res.status(500).json({ success: false, error: 'Failed to complete quest' });
      }
    }

    if (action === 'updateProgress') {
      try {
        const { requirementId, increment } = req.body;
        if (!requirementId) {
          return res.status(400).json({ success: false, error: 'Requirement ID required' });
        }

        const userQuest = await userQuestService.getByUserAndQuest(numericUserId, numericQuestId);
        if (!userQuest || userQuest.status !== 'in_progress') {
          return res.status(400).json({ success: false, error: 'Quest not in progress' });
        }

        const quest = await questService.getById(numericQuestId);
        if (!quest) {
          return res.status(404).json({ success: false, error: 'Quest not found' });
        }

        const requirements = Array.isArray(quest.requirements) ? quest.requirements : [];
        const currentProgress = userQuest.requirementProgress || {};
        const requirement = requirements.find((r: any) => r.id === requirementId);
        if (!requirement) {
          return res.status(400).json({ success: false, error: 'Requirement not found' });
        }

        const currentValue = currentProgress[requirementId] || 0;
        const newValue = Math.min(currentValue + (increment || 1), requirement.target);
        currentProgress[requirementId] = newValue;

        let totalProgress = 0;
        let completedReqs = 0;
        for (const req of requirements) {
          const reqProgress = currentProgress[req.id] || 0;
          totalProgress += (reqProgress / req.target) * 100;
          if (reqProgress >= req.target) completedReqs++;
        }
        const overallProgress = Math.round(totalProgress / (requirements.length || 1));

        await userQuestService.updateProgress(userQuest.id, overallProgress, currentProgress);

        const completed = completedReqs === requirements.length;

        logAuditEvent({
          action: 'quest_progress_updated',
          ipAddress: clientId,
          userId: userId.toString(),
          details: { questId, requirementId, increment, completed },
          severity: 'info',
          success: true
        });

        return res.status(200).json({ success: true, completed, progress: overallProgress });
      } catch (error) {
        console.error('Error updating quest progress:', error);
        return res.status(500).json({ success: false, error: 'Failed to update progress' });
      }
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
