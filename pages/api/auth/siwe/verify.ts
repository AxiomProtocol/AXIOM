import type { NextApiRequest, NextApiResponse } from 'next';
import { SiweMessage } from 'siwe';
import { pool } from '../../../../server/db';
import * as crypto from 'crypto';
import { inMemoryNonces } from './nonce';

const ARBITRUM_CHAIN_ID = 42161;

async function validateNonce(nonce: string): Promise<boolean> {
  if (inMemoryNonces.has(nonce)) {
    const expiresAt = inMemoryNonces.get(nonce)!;
    if (expiresAt > Date.now()) {
      return true;
    }
    inMemoryNonces.delete(nonce);
  }
  
  try {
    const result = await pool.query(
      `SELECT nonce FROM siwe_nonces WHERE nonce = $1 AND expires_at > NOW()`,
      [nonce]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.warn('[SIWE Verify] DB check failed, using memory only:', (error as Error).message);
    return false;
  }
}

async function consumeNonce(nonce: string): Promise<void> {
  inMemoryNonces.delete(nonce);
  
  try {
    await pool.query(`DELETE FROM siwe_nonces WHERE nonce = $1`, [nonce]);
  } catch (error) {
    console.warn('[SIWE Verify] DB delete failed:', (error as Error).message);
  }
}

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
    
    const expectedHost = req.headers.host;
    if (!expectedHost) {
      return res.status(400).json({ 
        error: 'Invalid request - missing host header',
        code: 'INVALID_REQUEST'
      });
    }
    
    const messageDomain = siweMessage.domain;
    if (messageDomain !== expectedHost) {
      return res.status(401).json({ 
        error: 'Domain mismatch. The signature was created for a different site.',
        code: 'DOMAIN_MISMATCH'
      });
    }
    
    const messageChainId = siweMessage.chainId;
    if (messageChainId !== ARBITRUM_CHAIN_ID) {
      return res.status(401).json({ 
        error: `Invalid network. Please connect to Arbitrum One (Chain ID: ${ARBITRUM_CHAIN_ID}).`,
        code: 'CHAIN_MISMATCH'
      });
    }
    
    const isValidNonce = await validateNonce(nonce);
    if (!isValidNonce) {
      return res.status(400).json({ 
        error: 'Invalid or expired nonce. Please request a new one.',
        code: 'NONCE_INVALID'
      });
    }
    
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
    
    await consumeNonce(nonce);
    
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await pool.query(`
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
  } catch (error: any) {
    console.error('SIWE verification error:', error);
    res.status(401).json({ 
      error: 'Signature verification failed',
      details: error.message
    });
  }
}
