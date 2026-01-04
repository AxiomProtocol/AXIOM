import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { stewardTasks, stewardAssignments } from '../../../../shared/schema';
import { eq, desc, and, or } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  if (req.method === 'GET') {
    try {
      const assignments = await db
        .select()
        .from(stewardAssignments)
        .where(eq(stewardAssignments.wallet, wallet.toLowerCase()))
        .limit(1)
        .catch(() => []);

      if (assignments.length === 0) {
        return res.status(403).json({ error: 'Not a steward' });
      }

      const regionId = assignments[0].regionId;
      if (!regionId) {
        return res.status(200).json({ tasks: [] });
      }

      const tasks = await db
        .select()
        .from(stewardTasks)
        .where(eq(stewardTasks.regionId, regionId))
        .orderBy(desc(stewardTasks.createdAt))
        .catch(() => []);

      return res.status(200).json({ tasks });
    } catch (error) {
      console.error('Tasks fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }

  if (req.method === 'POST') {
    const { title, type, dueAt, priority } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title required' });
    }

    try {
      const assignments = await db
        .select()
        .from(stewardAssignments)
        .where(eq(stewardAssignments.wallet, wallet.toLowerCase()))
        .limit(1)
        .catch(() => []);

      if (assignments.length === 0 || !assignments[0].regionId) {
        return res.status(403).json({ error: 'Not assigned to a region' });
      }

      const [task] = await db
        .insert(stewardTasks)
        .values({
          regionId: assignments[0].regionId,
          title,
          type,
          dueAt: dueAt ? new Date(dueAt) : null,
          priority: priority || 'medium',
          status: 'pending',
          assignedToWallet: wallet.toLowerCase()
        })
        .returning();

      return res.status(201).json({ task });
    } catch (error) {
      console.error('Task create error:', error);
      return res.status(500).json({ error: 'Failed to create task' });
    }
  }

  if (req.method === 'PATCH') {
    const { taskId, status } = req.body;

    if (!taskId || !status) {
      return res.status(400).json({ error: 'Task ID and status required' });
    }

    try {
      const assignments = await db
        .select()
        .from(stewardAssignments)
        .where(eq(stewardAssignments.wallet, wallet.toLowerCase()))
        .limit(1)
        .catch(() => []);

      if (assignments.length === 0 || !['probationary', 'active'].includes(assignments[0].status || '')) {
        return res.status(403).json({ error: 'Unauthorized: Not an active steward' });
      }

      const regionId = assignments[0].regionId;
      const task = await db
        .select()
        .from(stewardTasks)
        .where(eq(stewardTasks.id, taskId))
        .limit(1);

      if (task.length === 0 || (regionId && task[0].regionId !== regionId)) {
        return res.status(403).json({ error: 'Unauthorized: Task not in your region' });
      }

      const completedAt = status === 'completed' ? new Date() : null;
      const [updated] = await db
        .update(stewardTasks)
        .set({ status, completedAt, updatedAt: new Date() })
        .where(eq(stewardTasks.id, taskId))
        .returning();

      return res.status(200).json({ task: updated });
    } catch (error) {
      console.error('Task update error:', error);
      return res.status(500).json({ error: 'Failed to update task' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
