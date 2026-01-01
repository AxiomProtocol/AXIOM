import type { NextApiRequest, NextApiResponse } from 'next';
import { generateNonce } from 'siwe';
import { pool } from '../../../../server/db';

const MESSAGE_EXPIRY_MS = 5 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[SIWE Nonce] Generating new nonce...');
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + MESSAGE_EXPIRY_MS);
    
    let client;
    try {
      client = await pool.connect();
      console.log('[SIWE Nonce] Database connected, cleaning expired nonces...');
    } catch (dbError: any) {
      console.error('[SIWE Nonce] Database connection failed:', dbError.message);
      throw new Error(`Database connection failed: ${dbError.message}`);
    }
    
    try {
      await client.query(
        `DELETE FROM siwe_nonces WHERE expires_at < NOW()`
      );
      
      await client.query(
        `INSERT INTO siwe_nonces (nonce, expires_at) VALUES ($1, $2)`,
        [nonce, expiresAt]
      );
      console.log('[SIWE Nonce] Nonce stored successfully:', nonce.substring(0, 8) + '...');
    } finally {
      client.release();
    }
    
    res.json({ 
      nonce,
      expiresIn: MESSAGE_EXPIRY_MS / 1000
    });
  } catch (error: any) {
    console.error('[SIWE Nonce] Error:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Failed to generate nonce',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
}
