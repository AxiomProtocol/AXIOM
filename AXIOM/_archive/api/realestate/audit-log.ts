import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { systemAuditLogs } from '../../../shared/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import crypto from 'crypto';

type AuditAction = 
  | 'INVESTOR_ONBOARDING_STARTED'
  | 'INVESTOR_ONBOARDING_COMPLETED'
  | 'ACCREDITATION_SUBMITTED'
  | 'ACCREDITATION_VERIFIED'
  | 'SUBSCRIPTION_AGREEMENT_SIGNED'
  | 'DEPOSIT_INITIATED'
  | 'DEPOSIT_CONFIRMED'
  | 'WITHDRAWAL_REQUESTED'
  | 'WITHDRAWAL_COMPLETED'
  | 'YIELD_CLAIMED'
  | 'YIELD_DISTRIBUTED'
  | 'LOAN_ORIGINATED'
  | 'LOAN_REPAID'
  | 'LOAN_DEFAULTED'
  | 'RISK_PARAMS_UPDATED'
  | 'FUND_STATS_VIEWED';

function generateDataHash(data: object): string {
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleCreate(req, res);
  } else if (req.method === 'GET') {
    return handleList(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  const { action, entityType, entityId, beforeData, afterData, metadata, walletAddress } = req.body;

  if (!action || !entityType) {
    return res.status(400).json({ error: 'action and entityType are required' });
  }

  try {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                      req.socket.remoteAddress || 
                      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const auditEntry = {
      action: action as AuditAction,
      entityType: `lending_fund_${entityType}`,
      entityId: entityId || null,
      beforeJson: beforeData ? { ...beforeData, dataHash: generateDataHash(beforeData) } : null,
      afterJson: afterData ? { ...afterData, dataHash: generateDataHash(afterData) } : null,
      metadata: {
        ...metadata,
        walletAddress,
        source: 'lending_fund',
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    };

    const [inserted] = await db.insert(systemAuditLogs).values(auditEntry).returning();

    return res.status(201).json({ 
      success: true, 
      auditId: inserted.id,
      timestamp: inserted.createdAt 
    });

  } catch (error: any) {
    console.error('Audit log error:', error);
    return res.status(500).json({ error: 'Failed to create audit log' });
  }
}

async function handleList(req: NextApiRequest, res: NextApiResponse) {
  const { entityType, entityId, action, startDate, endDate, limit = '50', offset = '0' } = req.query;

  try {
    const conditions = [
      sql`${systemAuditLogs.entityType} LIKE 'lending_fund_%'`
    ];

    if (entityType) {
      conditions.push(eq(systemAuditLogs.entityType, `lending_fund_${entityType}`));
    }
    if (entityId) {
      conditions.push(eq(systemAuditLogs.entityId, entityId as string));
    }
    if (action) {
      conditions.push(eq(systemAuditLogs.action, action as string));
    }
    if (startDate) {
      conditions.push(gte(systemAuditLogs.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(systemAuditLogs.createdAt, new Date(endDate as string)));
    }

    const logs = await db.select()
      .from(systemAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(systemAuditLogs.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(systemAuditLogs)
      .where(and(...conditions));

    return res.status(200).json({
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType?.replace('lending_fund_', ''),
        entityId: log.entityId,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt
      })),
      total: count,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

  } catch (error: any) {
    console.error('Audit log query error:', error);
    return res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
}
