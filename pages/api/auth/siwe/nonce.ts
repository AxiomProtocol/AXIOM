import type { NextApiRequest, NextApiResponse } from 'next';
import { generateNonce } from 'siwe';
import { pool } from '../../../../server/db';

const MESSAGE_EXPIRY_MS = 5 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + MESSAGE_EXPIRY_MS);
    
    const client = await pool.connect();
    try {
      await client.query(
        `DELETE FROM siwe_nonces WHERE expires_at < NOW()`
      );
      
      await client.query(
        `INSERT INTO siwe_nonces (nonce, expires_at) VALUES ($1, $2)`,
        [nonce, expiresAt]
      );
    } finally {
      client.release();
    }
    
    res.json({ 
      nonce,
      expiresIn: MESSAGE_EXPIRY_MS / 1000
    });
  } catch (error: any) {
    console.error('Nonce generation error:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
}
