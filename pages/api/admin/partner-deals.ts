import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { partnerDealSubmissions, adminAuditLogs, users } from '../../../shared/schema';
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm';

async function verifyAdminAuth(req: NextApiRequest): Promise<{ valid: boolean; adminId?: string }> {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const adminSecret = process.env.ADMIN_SETUP_SECRET;
    
    if (token === adminSecret) {
      return { valid: true, adminId: 'system-admin' };
    }
  }

  const adminToken = req.query.token || req.headers['x-admin-token'];
  const envToken = process.env.ADMIN_EDIT_TOKEN || process.env.ADMIN_SETUP_SECRET;
  
  if (adminToken && adminToken === envToken) {
    return { valid: true, adminId: 'token-admin' };
  }
  
  return { valid: false };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifyAdminAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: 'Unauthorized - Admin access required' });
  }

  if (req.method === 'GET') {
    try {
      const { status, search, limit = '50', offset = '0' } = req.query;

      let query = db.select().from(partnerDealSubmissions);
      
      const conditions = [];
      
      if (status && typeof status === 'string' && status !== 'all') {
        conditions.push(eq(partnerDealSubmissions.status, status as any));
      }
      
      if (search && typeof search === 'string') {
        conditions.push(
          or(
            ilike(partnerDealSubmissions.name, `%${search}%`),
            ilike(partnerDealSubmissions.email, `%${search}%`),
            ilike(partnerDealSubmissions.company, `%${search}%`),
            ilike(partnerDealSubmissions.propertyAddress, `%${search}%`)
          )
        );
      }

      const deals = await db.select()
        .from(partnerDealSubmissions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(partnerDealSubmissions.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(partnerDealSubmissions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const stats = await db.select({
        status: partnerDealSubmissions.status,
        count: sql<number>`count(*)`,
      })
        .from(partnerDealSubmissions)
        .groupBy(partnerDealSubmissions.status);

      return res.status(200).json({
        success: true,
        deals,
        total: countResult?.count || 0,
        stats: stats.reduce((acc, s) => ({ ...acc, [s.status || 'unknown']: Number(s.count) }), {}),
      });
    } catch (error) {
      console.error('Admin partner deals fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch deals' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, status, notes, assignedTo } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Deal ID is required' });
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (status) {
        updateData.status = status;
        if (status === 'contacted' && !updateData.contactedAt) {
          updateData.contactedAt = new Date();
        }
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      if (assignedTo !== undefined) {
        updateData.assignedTo = assignedTo;
      }

      const [updated] = await db.update(partnerDealSubmissions)
        .set(updateData)
        .where(eq(partnerDealSubmissions.id, id))
        .returning();

      try {
        await db.insert(adminAuditLogs).values({
          adminId: 0,
          action: 'update_partner_deal',
          resource: 'partner_deal_submissions',
          resourceId: String(id),
          details: { changes: updateData, adminId: auth.adminId },
        });
      } catch (auditError) {
        console.warn('Failed to log audit:', auditError);
      }

      return res.status(200).json({ success: true, deal: updated });
    } catch (error) {
      console.error('Admin partner deal update error:', error);
      return res.status(500).json({ error: 'Failed to update deal' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
