import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { pool } from '../../server/db';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...val] = cookie.trim().split('=');
      return [key, val.join('=')];
    })
  );
}

export interface AuthenticatedRequest extends NextApiRequest {
  siweSession?: {
    address: string;
    chainId: number;
    authenticatedAt: Date;
  };
}

export async function getSIWESession(req: NextApiRequest): Promise<{ address: string; chainId: number } | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['siwe_session'];
  
  if (!sessionToken) {
    return null;
  }
  
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT wallet_address, chain_id, authenticated_at 
       FROM wallet_sessions 
       WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      address: result.rows[0].wallet_address,
      chainId: result.rows[0].chain_id
    };
  } finally {
    client.release();
  }
}

export function withSIWEAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const session = await getSIWESession(req);
      
      if (!session) {
        return res.status(401).json({ 
          error: 'Wallet authentication required. Please sign in with your wallet.',
          code: 'SIWE_AUTH_REQUIRED'
        });
      }
      
      req.siweSession = {
        address: session.address,
        chainId: session.chainId,
        authenticatedAt: new Date()
      };
      
      return handler(req, res);
    } catch (error) {
      console.error('SIWE auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication check failed' });
    }
  };
}

export function withSIWEAddressVerification(handler: NextApiHandler): NextApiHandler {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const session = await getSIWESession(req);
      
      if (!session) {
        return res.status(401).json({ 
          error: 'Wallet authentication required. Please sign in with your wallet.',
          code: 'SIWE_AUTH_REQUIRED'
        });
      }
      
      const suppliedAddress = req.body.ownerAddress || req.body.proposerAddress || req.body.walletAddress;
      
      if (suppliedAddress) {
        const sessionAddress = session.address.toLowerCase();
        const requestAddress = suppliedAddress.toLowerCase();
        
        if (sessionAddress !== requestAddress) {
          return res.status(403).json({ 
            error: 'Address mismatch. You can only submit on behalf of your authenticated wallet.',
            code: 'ADDRESS_MISMATCH',
            authenticatedAddress: session.address
          });
        }
      }
      
      req.siweSession = {
        address: session.address,
        chainId: session.chainId,
        authenticatedAt: new Date()
      };
      
      return handler(req, res);
    } catch (error) {
      console.error('SIWE address verification error:', error);
      return res.status(500).json({ error: 'Authentication check failed' });
    }
  };
}

export async function verifySIWEAddress(req: NextApiRequest): Promise<{ valid: boolean; error?: string; authenticatedAddress?: string }> {
  const session = await getSIWESession(req);
  
  if (!session) {
    return { 
      valid: false, 
      error: 'Wallet authentication required. Please sign in with your wallet.'
    };
  }
  
  const suppliedAddress = req.body.ownerAddress || req.body.proposerAddress || req.body.walletAddress;
  
  if (suppliedAddress) {
    const sessionAddress = session.address.toLowerCase();
    const requestAddress = suppliedAddress.toLowerCase();
    
    if (sessionAddress !== requestAddress) {
      return { 
        valid: false, 
        error: 'Address mismatch. You can only submit on behalf of your authenticated wallet.',
        authenticatedAddress: session.address
      };
    }
  }
  
  return { valid: true, authenticatedAddress: session.address };
}
