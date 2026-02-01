import type { NextApiRequest, NextApiResponse } from 'next';
import { generateNonce } from 'siwe';
import { pool } from '../../../../server/db';

const MESSAGE_EXPIRY_MS = 5 * 60 * 1000;
const DB_TIMEOUT_MS = 12000;

let poolWarmedUp = false;

async function warmUpPool(): Promise<void> {
  if (poolWarmedUp) return;
  
  try {
    await pool.query('SELECT 1');
    poolWarmedUp = true;
    console.log('[SIWE Nonce] Connection pool warmed up');
  } catch (error) {
    console.warn('[SIWE Nonce] Pool warm-up failed:', (error as Error).message);
  }
}

async function storeNonceWithRetry(nonce: string, expiresAt: Date, maxRetries = 2): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const queryStart = Date.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('DB_TIMEOUT')), DB_TIMEOUT_MS);
      });
      
      const queryPromise = pool.query(
        `WITH cleanup AS (
          DELETE FROM siwe_nonces WHERE expires_at < NOW()
        )
        INSERT INTO siwe_nonces (nonce, expires_at) 
        VALUES ($1, $2)
        RETURNING id`,
        [nonce, expiresAt]
      );
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      const duration = Date.now() - queryStart;
      console.log(`[SIWE Nonce] DB stored nonce in ${duration}ms, id: ${(result as any).rows[0]?.id}`);
      return true;
      
    } catch (error: any) {
      const duration = Date.now() - queryStart;
      const isTimeout = error.message === 'DB_TIMEOUT';
      const isRetryable = isTimeout || error.code === 'ECONNREFUSED' || error.code === '57P01';
      
      console.warn(`[SIWE Nonce] DB attempt ${attempt + 1}/${maxRetries + 1} failed after ${duration}ms:`, {
        message: error.message,
        code: error.code,
        isRetryable
      });
      
      if (!isRetryable || attempt === maxRetries) {
        return false;
      }
      
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = Math.random().toString(36).substring(7);
  const requestStart = Date.now();
  
  console.log(`[SIWE Nonce][${requestId}] Request started`);

  try {
    await warmUpPool();
    
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + MESSAGE_EXPIRY_MS);
    
    const stored = await storeNonceWithRetry(nonce, expiresAt);
    
    if (!stored) {
      const totalDuration = Date.now() - requestStart;
      console.error(`[SIWE Nonce][${requestId}] Failed to store nonce after ${totalDuration}ms`);
      return res.status(503).json({ 
        error: 'Service temporarily unavailable. Please try again.',
        code: 'DB_UNAVAILABLE',
        retryAfter: 2
      });
    }
    
    const totalDuration = Date.now() - requestStart;
    console.log(`[SIWE Nonce][${requestId}] Request completed in ${totalDuration}ms`);
    
    res.json({ 
      nonce,
      expiresIn: MESSAGE_EXPIRY_MS / 1000
    });
    
  } catch (error: any) {
    const totalDuration = Date.now() - requestStart;
    console.error(`[SIWE Nonce][${requestId}] Request failed after ${totalDuration}ms:`, error.message);
    
    res.status(500).json({ 
      error: 'Failed to generate nonce',
      code: 'NONCE_GENERATION_FAILED'
    });
  }
}
