import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { reDealScenarios, reDeals } from '../../../../../shared/realEstateSchema';
import { eq, desc } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  if (req.method === 'GET') {
    try {
      const scenarios = await db.select()
        .from(reDealScenarios)
        .where(eq(reDealScenarios.dealId, id))
        .orderBy(desc(reDealScenarios.createdAt));

      return successResponse(res, { scenarios }, buildMeta(['internal_db'], 0.7));
    } catch (err: any) {
      console.error('Scenarios list error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to list scenarios');
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description } = req.body;

      const [deal] = await db.select()
        .from(reDeals)
        .where(eq(reDeals.id, id))
        .limit(1);

      if (!deal) {
        return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
      }

      const [scenario] = await db.insert(reDealScenarios).values({
        dealId: id,
        scenarioName: name || 'Base Case',
        description: description || null,
        isPrimary: false,
      }).returning();

      return successResponse(res, { scenario }, buildMeta(['internal_db', 'user_input'], 0.7));
    } catch (err: any) {
      console.error('Scenario create error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create scenario');
    }
  }

  return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and POST are accepted');
}
