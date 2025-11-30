import type { NextApiRequest, NextApiResponse } from 'next';
import { SiweMessage } from 'siwe';
import { pool } from '../../../../server/db';
import * as crypto from 'crypto';

const ARBITRUM_CHAIN_ID = 42161;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, signature } = req.body;
    
    if (!message || !signature) {
      return res.status(400).json({ error: 'Message and signature required' });
    }
    
    const siweMessage = new SiweMessage(message);
    const { nonce } = siweMessage;
    
    // Get expected domain from request host
    const expectedHost = req.headers.host;
    if (!expectedHost) {
      return res.status(400).json({ 
        error: 'Invalid request - missing host header',
        code: 'INVALID_REQUEST'
      });
    }
    
    // Validate domain matches the request origin (prevent cross-site replay)
    const messageDomain = siweMessage.domain;
    if (messageDomain !== expectedHost) {
      return res.status(401).json({ 
        error: 'Domain mismatch. The signature was created for a different site.',
        code: 'DOMAIN_MISMATCH',
        expected: expectedHost,
        received: messageDomain
      });
    }
    
    // Validate chain ID (must be Arbitrum One)
    const messageChainId = siweMessage.chainId;
    if (messageChainId !== ARBITRUM_CHAIN_ID) {
      return res.status(401).json({ 
        error: `Invalid network. Please connect to Arbitrum One (Chain ID: ${ARBITRUM_CHAIN_ID}).`,
        code: 'CHAIN_MISMATCH',
        expected: ARBITRUM_CHAIN_ID,
        received: messageChainId
      });
    }
    
    const client = await pool.connect();
    try {
      const nonceResult = await client.query(
        `SELECT nonce FROM siwe_nonces WHERE nonce = $1 AND expires_at > NOW()`,
        [nonce]
      );
      
      if (nonceResult.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid or expired nonce. Please request a new one.',
          code: 'NONCE_INVALID'
        });
      }
      
      // Verify signature with domain enforcement
      const fields = await siweMessage.verify({ 
        signature,
        nonce,
        domain: expectedHost
      });
      
      if (!fields.success) {
        return res.status(401).json({ 
          error: 'Invalid signature',
          code: 'SIGNATURE_INVALID'
        });
      }
      
      await client.query(
        `DELETE FROM siwe_nonces WHERE nonce = $1`,
        [nonce]
      );
      
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await client.query(`
        INSERT INTO wallet_sessions (
          session_token, wallet_address, chain_id, authenticated_at, expires_at, domain
        ) VALUES ($1, $2, $3, NOW(), $4, $5)
        ON CONFLICT (wallet_address) 
        DO UPDATE SET 
          session_token = EXCLUDED.session_token,
          authenticated_at = NOW(),
          expires_at = EXCLUDED.expires_at,
          chain_id = EXCLUDED.chain_id,
          domain = EXCLUDED.domain
      `, [
        sessionToken,
        fields.data.address.toLowerCase(), 
        fields.data.chainId || ARBITRUM_CHAIN_ID,
        expiresAt,
        fields.data.domain
      ]);
      
      res.setHeader('Set-Cookie', `siwe_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
      
      res.json({ 
        success: true, 
        address: fields.data.address,
        chainId: fields.data.chainId,
        message: 'Wallet successfully authenticated'
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('SIWE verification error:', error);
    res.status(401).json({ 
      error: 'Signature verification failed',
      details: error.message
    });
  }
}
