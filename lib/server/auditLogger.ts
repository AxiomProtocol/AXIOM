import { db } from '../../server/db';
import { adminAuditLog } from '../../shared/schema';
import { ActorContext } from './adminAuth';
import { getEnvConfig } from './envConfig';

export interface AuditEventParams {
  actor: ActorContext;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  requestId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  requestId: string;
  ipAddress: string | null;
  userAgent: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  reason: string | null;
  createdAt: Date;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function redactSensitiveData(obj: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!obj) return null;
  
  const sensitiveKeys = [
    'password', 'secret', 'token', 'key', 'private', 'credential',
    'auth', 'bearer', 'api_key', 'apikey', 'access_token', 'refresh_token'
  ];
  
  const redacted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(s => lowerKey.includes(s));
    
    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

export async function logAuditEvent(params: AuditEventParams): Promise<AuditLogEntry> {
  const config = getEnvConfig();
  const requestId = params.requestId || generateRequestId();
  
  const redactedBefore = redactSensitiveData(params.beforeState);
  const redactedAfter = redactSensitiveData(params.afterState);
  
  const entry = {
    actorUserId: params.actor.userId,
    actorRole: params.actor.role,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    requestId,
    ipAddress: params.ipAddress || null,
    userAgent: params.userAgent || null,
    beforeState: redactedBefore,
    afterState: redactedAfter,
    reason: params.reason,
  };
  
  if (config.auditLogSink === 'console') {
    console.log('[AUDIT]', JSON.stringify(entry, null, 2));
    return {
      id: requestId,
      ...entry,
      createdAt: new Date(),
    };
  }
  
  const [inserted] = await db.insert(adminAuditLog).values(entry).returning();
  
  return {
    id: inserted.id,
    actorUserId: inserted.actorUserId,
    actorRole: inserted.actorRole,
    action: inserted.action,
    targetType: inserted.targetType,
    targetId: inserted.targetId,
    requestId: inserted.requestId,
    ipAddress: inserted.ipAddress,
    userAgent: inserted.userAgent,
    beforeState: inserted.beforeState as Record<string, unknown> | null,
    afterState: inserted.afterState as Record<string, unknown> | null,
    reason: inserted.reason,
    createdAt: inserted.createdAt,
  };
}

export function extractRequestMetadata(req: { 
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  connection?: { remoteAddress?: string };
  socket?: { remoteAddress?: string };
}): { ipAddress: string | null; userAgent: string | null } {
  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  
  if (req.headers) {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
      ipAddress = xForwardedFor.split(',')[0].trim();
    } else if (req.headers['x-real-ip'] && typeof req.headers['x-real-ip'] === 'string') {
      ipAddress = req.headers['x-real-ip'];
    }
    
    const ua = req.headers['user-agent'];
    if (typeof ua === 'string') {
      userAgent = ua;
    }
  }
  
  if (!ipAddress) {
    ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
  }
  
  return { ipAddress, userAgent };
}

export async function logAdminAction(
  actor: ActorContext,
  action: string,
  targetType: string,
  targetId: string,
  reason: string,
  options?: {
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    req?: { 
      headers?: Record<string, string | string[] | undefined>;
      ip?: string;
      connection?: { remoteAddress?: string };
      socket?: { remoteAddress?: string };
    };
    requestId?: string;
  }
): Promise<AuditLogEntry> {
  const { ipAddress, userAgent } = options?.req 
    ? extractRequestMetadata(options.req) 
    : { ipAddress: null, userAgent: null };
  
  return logAuditEvent({
    actor,
    action,
    targetType,
    targetId,
    reason,
    beforeState: options?.beforeState,
    afterState: options?.afterState,
    requestId: options?.requestId,
    ipAddress,
    userAgent,
  });
}

export interface SimpleAuditParams {
  action: string;
  actorUserId: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  requestId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: SimpleAuditParams): Promise<void> {
  const config = getEnvConfig();
  const requestId = params.requestId || generateRequestId();
  
  const redactedBefore = redactSensitiveData(params.beforeState);
  const redactedAfter = redactSensitiveData(params.afterState);
  const redactedMetadata = params.metadata ? redactSensitiveData(params.metadata) : null;
  
  const entry = {
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    requestId,
    ipAddress: params.ipAddress || null,
    userAgent: params.userAgent || null,
    beforeState: redactedBefore,
    afterState: redactedAfter ? { ...redactedAfter, metadata: redactedMetadata } : redactedMetadata ? { metadata: redactedMetadata } : null,
    reason: params.reason || null,
  };
  
  if (config.auditLogSink === 'console') {
    console.log('[AUDIT]', JSON.stringify(entry, null, 2));
    return;
  }
  
  try {
    await db.insert(adminAuditLog).values(entry);
  } catch (error) {
    console.error(`[${requestId}] Audit log failed:`, error);
  }
}

export { generateRequestId, redactSensitiveData };
