import { NextApiRequest, NextApiResponse } from 'next';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export interface SecurityConfig {
  enableRateLimit: boolean;
  enableAuditLog: boolean;
  enableSessionTimeout: boolean;
  sessionTimeoutMs: number;
  requireReauthForHighValue: boolean;
  highValueThreshold: number;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableRateLimit: true,
  enableAuditLog: true,
  enableSessionTimeout: true,
  sessionTimeoutMs: 30 * 60 * 1000,
  requireReauthForHighValue: true,
  highValueThreshold: 1000
};

const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

export function rateLimit(config: RateLimitConfig) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const identifier = getClientIdentifier(req);
    const now = Date.now();
    
    const record = rateLimitStore.get(identifier);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(identifier, { count: 1, resetTime: now + config.windowMs });
      return next();
    }
    
    if (record.count >= config.maxRequests) {
      return res.status(429).json({
        success: false,
        error: config.message || 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    return next();
  };
}

export function getClientIdentifier(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  return ip;
}

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId?: string;
  walletAddress?: string;
  ipAddress: string;
  userAgent?: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
  success: boolean;
}

const auditLogBuffer: AuditLogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

export function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>) {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  };
  
  auditLogBuffer.push(logEntry);
  
  if (auditLogBuffer.length > MAX_BUFFER_SIZE) {
    auditLogBuffer.shift();
  }
  
  if (entry.severity === 'critical') {
    console.error('[SECURITY AUDIT - CRITICAL]', JSON.stringify(logEntry));
  } else if (entry.severity === 'warning') {
    console.warn('[SECURITY AUDIT - WARNING]', JSON.stringify(logEntry));
  } else {
    console.log('[SECURITY AUDIT]', JSON.stringify(logEntry));
  }
  
  return logEntry;
}

export function getAuditLogs(filters?: {
  severity?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): AuditLogEntry[] {
  let logs = [...auditLogBuffer];
  
  if (filters?.severity) {
    logs = logs.filter(l => l.severity === filters.severity);
  }
  if (filters?.action) {
    const action = filters.action;
    logs = logs.filter(l => l.action.includes(action));
  }
  if (filters?.userId) {
    logs = logs.filter(l => l.userId === filters.userId);
  }
  if (filters?.startDate) {
    const startDate = filters.startDate;
    logs = logs.filter(l => l.timestamp >= startDate);
  }
  if (filters?.endDate) {
    const endDate = filters.endDate;
    logs = logs.filter(l => l.timestamp <= endDate);
  }
  
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return logs.slice(0, filters?.limit || 100);
}

export interface SessionData {
  userId: string;
  walletAddress?: string;
  createdAt: number;
  lastActivity: number;
  reauthenticatedAt?: number;
}

const sessions: Map<string, SessionData> = new Map();

export function validateSession(sessionId: string, config = DEFAULT_SECURITY_CONFIG): {
  valid: boolean;
  session?: SessionData;
  requiresReauth?: boolean;
  error?: string;
} {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return { valid: false, error: 'Session not found' };
  }
  
  const now = Date.now();
  
  if (config.enableSessionTimeout && (now - session.lastActivity > config.sessionTimeoutMs)) {
    sessions.delete(sessionId);
    return { valid: false, error: 'Session expired' };
  }
  
  session.lastActivity = now;
  
  return { valid: true, session };
}

export function requiresReauthentication(
  session: SessionData, 
  transactionValue: number,
  config = DEFAULT_SECURITY_CONFIG
): boolean {
  if (!config.requireReauthForHighValue) return false;
  if (transactionValue < config.highValueThreshold) return false;
  
  const reauthWindow = 5 * 60 * 1000;
  if (session.reauthenticatedAt && (Date.now() - session.reauthenticatedAt < reauthWindow)) {
    return false;
  }
  
  return true;
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function validateWalletAddress(address: string): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function validateTransactionHash(hash: string): boolean {
  if (!hash) return false;
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

interface AnomalyPattern {
  type: string;
  threshold: number;
  windowMs: number;
}

const anomalyPatterns: AnomalyPattern[] = [
  { type: 'rapid_requests', threshold: 100, windowMs: 60000 },
  { type: 'failed_auth', threshold: 5, windowMs: 300000 },
  { type: 'unusual_amount', threshold: 10000, windowMs: 0 }
];

const activityTracking: Map<string, { actions: string[]; timestamps: number[] }> = new Map();

export function detectAnomaly(
  userId: string,
  action: string,
  details: Record<string, any>
): { isAnomaly: boolean; pattern?: string; severity?: string } {
  const now = Date.now();
  
  let tracking = activityTracking.get(userId);
  if (!tracking) {
    tracking = { actions: [], timestamps: [] };
    activityTracking.set(userId, tracking);
  }
  
  tracking.actions.push(action);
  tracking.timestamps.push(now);
  
  const oneMinuteAgo = now - 60000;
  const recentActions = tracking.timestamps.filter(t => t > oneMinuteAgo).length;
  
  if (recentActions > anomalyPatterns[0].threshold) {
    return { isAnomaly: true, pattern: 'rapid_requests', severity: 'warning' };
  }
  
  if (action.includes('auth_failed')) {
    const fiveMinutesAgo = now - 300000;
    const failedAuths = tracking.actions.filter(
      (a, i) => a.includes('auth_failed') && tracking.timestamps[i] > fiveMinutesAgo
    ).length;
    
    if (failedAuths >= anomalyPatterns[1].threshold) {
      return { isAnomaly: true, pattern: 'failed_auth', severity: 'critical' };
    }
  }
  
  if (details.amount && details.amount > anomalyPatterns[2].threshold) {
    return { isAnomaly: true, pattern: 'unusual_amount', severity: 'warning' };
  }
  
  const maxTracked = 1000;
  if (tracking.actions.length > maxTracked) {
    tracking.actions = tracking.actions.slice(-maxTracked);
    tracking.timestamps = tracking.timestamps.slice(-maxTracked);
  }
  
  return { isAnomaly: false };
}

export const securityMiddleware = (config: Partial<SecurityConfig> = {}) => {
  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const clientId = getClientIdentifier(req);
      
      if (finalConfig.enableRateLimit) {
        const now = Date.now();
        const record = rateLimitStore.get(clientId);
        
        if (record && now < record.resetTime && record.count >= 100) {
          logAuditEvent({
            action: 'rate_limit_exceeded',
            ipAddress: clientId,
            userAgent: req.headers['user-agent'],
            details: { method: req.method, path: req.url },
            severity: 'warning',
            success: false
          });
          
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded'
          });
        }
        
        if (!record || now > record.resetTime) {
          rateLimitStore.set(clientId, { count: 1, resetTime: now + 60000 });
        } else {
          record.count++;
        }
      }
      
      if (finalConfig.enableAuditLog) {
        logAuditEvent({
          action: `api_request_${req.method}`,
          ipAddress: clientId,
          userAgent: req.headers['user-agent'],
          details: { path: req.url, method: req.method },
          severity: 'info',
          success: true
        });
      }
      
      return handler(req, res);
    };
  };
};

export default {
  rateLimit,
  logAuditEvent,
  getAuditLogs,
  validateSession,
  requiresReauthentication,
  sanitizeInput,
  validateWalletAddress,
  validateTransactionHash,
  detectAnomaly,
  securityMiddleware
};
