import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { reDecisionLog, reDeals } from '../../../../../shared/realEstateSchema';
import { eq, desc, sql } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta, parseNumeric } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  if (req.method === 'GET') {
    try {
      const pageNum = Math.max(1, parseNumeric(req.query.page, 1));
      const limitNum = Math.min(100, Math.max(1, parseNumeric(req.query.limit, 20)));
      const offset = (pageNum - 1) * limitNum;

      const [countResult, entries] = await Promise.all([
        db.select({ total: sql<number>`count(*)` })
          .from(reDecisionLog)
          .where(eq(reDecisionLog.dealId, id)),
        db.select()
          .from(reDecisionLog)
          .where(eq(reDecisionLog.dealId, id))
          .orderBy(desc(reDecisionLog.decidedAt))
          .limit(limitNum)
          .offset(offset),
      ]);

      const total = Number(countResult[0]?.total ?? 0);

      return successResponse(res, {
        entries,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      }, buildMeta(['internal_db'], 0.7));
    } catch (err: any) {
      console.error('Decision log fetch error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch decision log');
    }
  }

  if (req.method === 'POST') {
    try {
      const { decision, decidedBy, rationale, snapshotMetrics } = req.body;

      if (!decision || typeof decision !== 'string') {
        return errorResponse(res, 400, 'INVALID_PARAMS', 'decision is required');
      }

      const [deal] = await db.select().from(reDeals).where(eq(reDeals.id, id)).limit(1);
      if (!deal) {
        return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
      }

      await db.insert(reDecisionLog).values({
        dealId: id,
        decision,
        decidedBy: decidedBy || 'system',
        rationale: rationale || null,
        snapshotMetrics: snapshotMetrics || null,
      });

      const [entry] = await db.select().from(reDecisionLog)
        .where(eq(reDecisionLog.dealId, id))
        .orderBy(desc(reDecisionLog.decidedAt))
        .limit(1);

      return successResponse(res, { entry }, buildMeta(['internal_db', 'user_input'], 0.7));
    } catch (err: any) {
      console.error('Decision append error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to append decision');
    }
  }

  return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and POST are accepted');
}
