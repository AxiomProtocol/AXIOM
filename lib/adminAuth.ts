import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import jwt from 'jsonwebtoken';
import { Pool } from './db';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function getJWTSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: SESSION_SECRET or JWT_SECRET environment variable must be set for admin authentication');
  }
  return secret;
}

export interface AdminUser {
  id: number;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends NextApiRequest {
  admin?: AdminUser;
}

export function withAdminAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const token = req.cookies.admin_token;

      if (!token) {
        return res.status(401).json({ 
          error: 'Authentication required',
          redirect: '/admin/login'
        });
      }

      const decoded = jwt.verify(token, getJWTSecret()) as any;

      const result = await pool.query(
        'SELECT id, email, role FROM users WHERE id = $1 AND role IN ($2, $3)',
        [decoded.id, 'admin', 'super_admin']
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Admin access denied',
          redirect: '/admin/login'
        });
      }

      req.admin = result.rows[0];

      return handler(req, res);

    } catch (error) {
      if ((error as any).name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Session expired. Please login again.',
          redirect: '/admin/login'
        });
      }
      
      console.error('Admin auth error:', error);
      return res.status(401).json({ 
        error: 'Authentication failed',
        redirect: '/admin/login'
      });
    }
  };
}

export async function verifyAdminToken(token: string): Promise<AdminUser | null> {
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as any;

    const result = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1 AND role IN ($2, $3)',
      [decoded.id, 'admin', 'super_admin']
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch {
    return null;
  }
}
