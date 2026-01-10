import { NextApiRequest, NextApiResponse } from 'next';
import { questService, userQuestService, userXpService } from '../../../lib/db-services';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { category, userId } = req.query;

    try {
      const quests = await questService.getAll(category as string);
      let userQuests: any[] = [];
      
      if (userId) {
        const numericUserId = parseInt(userId as string, 10);
        if (!isNaN(numericUserId)) {
          userQuests = await userQuestService.getByUserId(numericUserId);
        }
      }

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

    const numericUserId = parseInt(userId, 10);
    const numericQuestId = parseInt(questId, 10);

    if (isNaN(numericUserId) || isNaN(numericQuestId)) {
      return res.status(400).json({ success: false, error: 'Invalid User ID or Quest ID' });
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

        return res.status(200).json({ success: true, userQuest });
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

        const xpReward = quest.rewards?.find((r: any) => r.type === 'xp');
        if (xpReward) {
          await userXpService.createOrUpdate(numericUserId, xpReward.amount);
        }

        logAuditEvent({
          action: 'quest_completed',
          ipAddress: clientId,
          userId: userId.toString(),
          details: { questId, rewards: quest.rewards },
          severity: 'info',
          success: true
        });

        return res.status(200).json({ success: true, rewards: quest.rewards });
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

        const currentProgress = userQuest.requirementProgress || {};
        const requirement = quest.requirements?.find((r: any) => r.id === requirementId);
        if (!requirement) {
          return res.status(400).json({ success: false, error: 'Requirement not found' });
        }

        const currentValue = currentProgress[requirementId] || 0;
        const newValue = Math.min(currentValue + (increment || 1), requirement.target);
        currentProgress[requirementId] = newValue;

        let totalProgress = 0;
        let completedReqs = 0;
        for (const req of quest.requirements || []) {
          const reqProgress = currentProgress[req.id] || 0;
          totalProgress += (reqProgress / req.target) * 100;
          if (reqProgress >= req.target) completedReqs++;
        }
        const overallProgress = Math.round(totalProgress / (quest.requirements?.length || 1));

        await userQuestService.updateProgress(userQuest.id, overallProgress, currentProgress);

        const completed = completedReqs === quest.requirements?.length;

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
