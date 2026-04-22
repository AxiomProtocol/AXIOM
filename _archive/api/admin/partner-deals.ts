import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

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
      const limitNum = parseInt(limit as string) || 50;
      const offsetNum = parseInt(offset as string) || 0;

      let whereClause = sql`1=1`;
      
      if (status && typeof status === 'string' && status !== 'all') {
        whereClause = sql`${whereClause} AND status = ${status}`;
      }
      
      if (search && typeof search === 'string') {
        const searchTerm = `%${search}%`;
        whereClause = sql`${whereClause} AND (
          name ILIKE ${searchTerm} OR 
          email ILIKE ${searchTerm} OR 
          company ILIKE ${searchTerm} OR 
          property_address ILIKE ${searchTerm}
        )`;
      }

      const deals = await db.execute(sql`
        SELECT * FROM partner_deal_submissions
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `);

      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM partner_deal_submissions
        WHERE ${whereClause}
      `);

      const statsResult = await db.execute(sql`
        SELECT status, COUNT(*) as count
        FROM partner_deal_submissions
        GROUP BY status
      `);

      const formattedDeals = deals.rows.map((deal: any) => ({
        id: deal.id,
        name: deal.name,
        email: deal.email,
        phone: deal.phone,
        company: deal.company,
        propertyType: deal.property_type,
        acquisitionStructure: deal.acquisition_structure,
        capitalNeed: deal.capital_need,
        exitStrategy: deal.exit_strategy,
        timeline: deal.timeline,
        dealValue: deal.deal_value,
        partnerRole: deal.partner_role,
        recommendedPrimary: deal.recommended_primary,
        recommendedSecondary: deal.recommended_secondary || [],
        recommendedProtection: deal.recommended_protection || [],
        compliancePath: deal.compliance_path,
        estimatedTerms: deal.estimated_terms,
        dealDescription: deal.deal_description,
        propertyAddress: deal.property_address,
        status: deal.status,
        notes: deal.notes,
        assignedTo: deal.assigned_to,
        createdAt: deal.created_at,
        updatedAt: deal.updated_at,
        contactedAt: deal.contacted_at,
      }));

      return res.status(200).json({
        success: true,
        deals: formattedDeals,
        total: countResult.rows[0]?.count || 0,
        stats: statsResult.rows.reduce((acc: any, s: any) => ({ 
          ...acc, 
          [s.status || 'unknown']: Number(s.count) 
        }), {}),
      });
    } catch (error) {
      console.error('Admin partner deals fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch deals' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, status, notes, assignedTo } = req.body;

      if (!id || typeof id !== 'number') {
        return res.status(400).json({ error: 'Valid deal ID is required' });
      }

      const validStatuses = ['new', 'contacted', 'in_review', 'approved', 'funded', 'declined', 'withdrawn'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      const setContactedAt = status === 'contacted';
      const safeNotes = notes !== undefined ? notes : null;
      const updateAssignedTo = assignedTo !== undefined;
      const safeAssignedTo = updateAssignedTo ? (assignedTo || null) : null;

      const result = await db.execute(sql`
        UPDATE partner_deal_submissions
        SET 
          updated_at = NOW(),
          status = CASE WHEN ${status !== null && status !== undefined} THEN ${status}::partner_deal_status ELSE status END,
          notes = CASE WHEN ${notes !== undefined} THEN ${safeNotes} ELSE notes END,
          assigned_to = CASE WHEN ${updateAssignedTo} THEN ${safeAssignedTo}::integer ELSE assigned_to END,
          contacted_at = CASE WHEN ${setContactedAt} THEN NOW() ELSE contacted_at END
        WHERE id = ${id}
        RETURNING *
      `);

      const deal = result.rows[0];

      return res.status(200).json({ 
        success: true, 
        deal: deal ? {
          id: deal.id,
          name: deal.name,
          email: deal.email,
          status: deal.status,
          notes: deal.notes,
          updatedAt: deal.updated_at,
        } : null 
      });
    } catch (error) {
      console.error('Admin partner deal update error:', error);
      return res.status(500).json({ error: 'Failed to update deal' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
