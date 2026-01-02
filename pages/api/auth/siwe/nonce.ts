import type { NextApiRequest, NextApiResponse } from 'next';
import { generateNonce } from 'siwe';
import { pool } from '../../../../server/db';

const MESSAGE_EXPIRY_MS = 5 * 60 * 1000;
const CONNECTION_TIMEOUT_MS = 15000;

interface NeonError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  position?: string;
  severity?: string;
}

function logDbError(phase: string, error: NeonError, startTime: number) {
  const duration = Date.now() - startTime;
  console.error(`[SIWE Nonce] ${phase} failed after ${duration}ms:`, {
    message: error.message,
    code: error.code || 'UNKNOWN',
    detail: error.detail,
    hint: error.hint,
    severity: error.severity,
    stack: error.stack?.split('\n').slice(0, 5).join('\n')
  });
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
    console.log(`[SIWE Nonce][${requestId}] Nonce generated: ${nonce.substring(0, 8)}...`);
    
    const connectStart = Date.now();
    let queryResult;
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Connection timeout after ${CONNECTION_TIMEOUT_MS}ms`)), CONNECTION_TIMEOUT_MS);
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
      
      queryResult = await Promise.race([queryPromise, timeoutPromise]);
      
      const queryDuration = Date.now() - connectStart;
      console.log(`[SIWE Nonce][${requestId}] DB query completed in ${queryDuration}ms, inserted id: ${(queryResult as any)?.rows?.[0]?.id}`);
      
    } catch (dbError: any) {
      logDbError('Database query', dbError, connectStart);
      
      const errorCode = dbError.code || 'UNKNOWN';
      const isConnectionError = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', '57P01', '08006', '08001'].includes(errorCode) ||
                                dbError.message?.includes('timeout') ||
                                dbError.message?.includes('connection');
      
      throw new Error(
        isConnectionError 
          ? `Database connection issue (${errorCode}): ${dbError.message}` 
          : `Database error (${errorCode}): ${dbError.message}`
      );
    }
    
    const totalDuration = Date.now() - requestStart;
    console.log(`[SIWE Nonce][${requestId}] Request completed successfully in ${totalDuration}ms`);
    
    res.json({ 
      nonce,
      expiresIn: MESSAGE_EXPIRY_MS / 1000
    });
    
  } catch (error: any) {
    const totalDuration = Date.now() - requestStart;
    console.error(`[SIWE Nonce][${requestId}] Request failed after ${totalDuration}ms:`, {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.status(500).json({ 
      error: 'Failed to generate nonce',
      code: 'NONCE_GENERATION_FAILED',
      details: isProduction ? undefined : error.message,
      requestId: isProduction ? undefined : requestId
    });
  }
}
