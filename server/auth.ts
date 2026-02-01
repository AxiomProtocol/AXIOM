import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';
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
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
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