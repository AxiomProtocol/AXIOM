import type { NextApiRequest, NextApiResponse } from 'next';
import { generateNonce } from 'siwe';
import { pool } from '../../../../server/db';

const MESSAGE_EXPIRY_MS = 5 * 60 * 1000;
const CONNECTION_TIMEOUT_MS = 8000;

const inMemoryNonces = new Map<string, number>();
const MAX_MEMORY_NONCES = 100;

interface NeonError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
}

function cleanupMemoryNonces() {
  const now = Date.now();
  for (const [nonce, expiresAt] of inMemoryNonces.entries()) {
    if (expiresAt < now) {
      inMemoryNonces.delete(nonce);
    }
  }
  if (inMemoryNonces.size > MAX_MEMORY_NONCES) {
    const entries = Array.from(inMemoryNonces.entries());
    entries.sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < entries.length - MAX_MEMORY_NONCES; i++) {
      inMemoryNonces.delete(entries[i][0]);
    }
  }
}

async function storeNonceInDb(nonce: string, expiresAt: Date): Promise<boolean> {
  const queryStart = Date.now();
  
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('DB_TIMEOUT')), CONNECTION_TIMEOUT_MS);
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
    
    await Promise.race([queryPromise, timeoutPromise]);
    console.log(`[SIWE Nonce] DB stored nonce in ${Date.now() - queryStart}ms`);
    return true;
    
  } catch (error: any) {
    console.warn(`[SIWE Nonce] DB storage failed after ${Date.now() - queryStart}ms:`, error.message);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = Math.random().toString(36).substring(7);
  const requestStart = Date.now();
  
  console.log(`[SIWE Nonce][${requestId}] Request started`);

  try {
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + MESSAGE_EXPIRY_MS);
    
    cleanupMemoryNonces();
    inMemoryNonces.set(nonce, expiresAt.getTime());
    
    storeNonceInDb(nonce, expiresAt).then(success => {
      if (!success) {
        console.log(`[SIWE Nonce][${requestId}] Using in-memory fallback only`);
      }
    });
    
    const totalDuration = Date.now() - requestStart;
    console.log(`[SIWE Nonce][${requestId}] Nonce issued in ${totalDuration}ms: ${nonce.substring(0, 8)}...`);
    
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

export { inMemoryNonces };
