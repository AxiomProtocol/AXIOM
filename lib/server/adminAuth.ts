import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../server/db';
import { userRoles } from '../../shared/schema';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
}

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type AdminRole = 'superadmin' | 'admin' | 'finance' | 'moderator';

export interface ActorContext {
  userId: string;
  role: AdminRole;
  requestId: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuthResult {
  success: true;
  actor: ActorContext;
}

export interface AuthError {
  success: false;
  status: number;
  message: string;
}

export type AuthResponse = AuthResult | AuthError;

function getClientIp(req: NextApiRequest): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.socket?.remoteAddress ?? null;
}

function getUserAgent(req: NextApiRequest): string | null {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : null;
}

export async function authenticateAdmin(req: NextApiRequest): Promise<AuthResponse> {
  const requestId = uuidv4();
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      status: 401,
      message: 'Missing or invalid Authorization header',
    };
  }
  
  const token = authHeader.substring(7);
  
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  
  if (error || !user) {
    return {
      success: false,
      status: 401,
      message: 'Invalid or expired token',
    };
  }
  
  const userId = user.id;
  
  const [roleRecord] = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .limit(1);
  
  if (!roleRecord) {
    return {
      success: false,
      status: 403,
      message: 'User does not have an admin role',
    };
  }
  
  const role = roleRecord.role as AdminRole;
  
  return {
    success: true,
    actor: {
      userId,
      role,
      requestId,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    },
  };
}

export function requireRole(actor: ActorContext, allowedRoles: AdminRole[]): { allowed: true } | { allowed: false; message: string } {
  if (!allowedRoles.includes(actor.role)) {
    return {
      allowed: false,
      message: `Role '${actor.role}' is not authorized. Required: ${allowedRoles.join(', ')}`,
    };
  }
  return { allowed: true };
}

export function requireDistinctApprover(
  proposerId: string,
  approverId: string
): { valid: true } | { valid: false; message: string } {
  if (proposerId === approverId) {
    return {
      valid: false,
      message: 'Approver must be a different user than the proposer',
    };
  }
  return { valid: true };
}

export function sendAuthError(res: NextApiResponse, authResult: AuthError) {
  return res.status(authResult.status).json({
    error: authResult.message,
    requestId: uuidv4(),
  });
}

export async function withAdminAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: AdminRole[],
  handler: (actor: ActorContext) => Promise<void>
) {
  const authResult = await authenticateAdmin(req);
  
  if (!authResult.success) {
    return sendAuthError(res, authResult);
  }
  
  const roleCheck = requireRole(authResult.actor, allowedRoles);
  if (!roleCheck.allowed) {
    return res.status(403).json({
      error: roleCheck.message,
      requestId: authResult.actor.requestId,
    });
  }
  
  try {
    await handler(authResult.actor);
  } catch (error) {
    console.error(`[${authResult.actor.requestId}] Handler error:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      requestId: authResult.actor.requestId,
    });
  }
}
