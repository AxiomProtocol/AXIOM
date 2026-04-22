import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import type { NextApiRequest } from 'next';
import { db, pool } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[Auth] FATAL: JWT_SECRET environment variable is not set');
    throw new Error('Server misconfiguration: JWT_SECRET is not set');
  }
  return secret;
}

const SALT_ROUNDS = 12;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    walletAddress?: string;
  };
}

// Generate JWT token
export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export function signTokenForKyc(payload: { userId: number; email: string; role: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Authentication middleware
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Get fresh user data from database
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({ error: 'Account suspended or deactivated' });
    }

    req.user = {
      id: String(user.id),
      email: user.email || '',
      role: user.role || 'user',
      walletAddress: user.walletAddress || undefined
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Optional authentication middleware (doesn't fail if no token)
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    if (decoded) {
      const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
      if (user && user.accountStatus === 'active') {
        req.user = {
          id: String(user.id),
          email: user.email || '',
          role: user.role || 'user',
          walletAddress: user.walletAddress || undefined
        };
      }
    }
  } catch (error) {
    console.error('Optional auth error:', error);
  }

  next();
}

// Role-based authorization
export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Admin authorization
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireRole(['admin', 'super_admin'])(req, res, next);
}

export interface KycAuthUser {
  userId: number;
  email: string;
  role?: string;
}

export function getUserFromBearerToken(req: NextApiRequest): KycAuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret()) as Record<string, unknown>;

    if (typeof decoded.userId !== 'number' || typeof decoded.email !== 'string') {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: typeof decoded.role === 'string' ? decoded.role : undefined,
    };
  } catch {
    return null;
  }
}

export async function getVerifiedUserFromToken(req: NextApiRequest): Promise<KycAuthUser | null> {
  const tokenUser = getUserFromBearerToken(req);
  if (!tokenUser) return null;

  try {
    const result = await pool.query(
      `SELECT id, account_status FROM users WHERE id = $1 LIMIT 1`,
      [tokenUser.userId]
    );

    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    if (user.account_status === 'suspended' || user.account_status === 'deactivated') {
      return null;
    }

    return tokenUser;
  } catch {
    return null;
  }
}

export function getClientIp(req: NextApiRequest): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const firstIp = raw.split(',')[0].trim();
    return firstIp.substring(0, 45);
  }
  const remote = req.socket?.remoteAddress;
  return remote ? remote.substring(0, 45) : null;
}