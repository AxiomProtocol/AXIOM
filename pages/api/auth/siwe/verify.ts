import type { NextApiRequest, NextApiResponse } from 'next';
import { SiweMessage } from 'siwe';
import { pool } from '../../../../server/db';
import * as crypto from 'crypto';

const ARBITRUM_CHAIN_ID = 42161;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Log all relevant headers for debugging production proxy issues
  console.log('[SIWE Verify] Request headers:', {
    host: req.headers.host,
    'x-forwarded-host': req.headers['x-forwarded-host'],
    'x-forwarded-proto': req.headers['x-forwarded-proto'],
    'x-real-host': req.headers['x-real-host'],
    'x-original-host': req.headers['x-original-host'],
    origin: req.headers.origin,
    referer: req.headers.referer
  });

  try {
    const { message, signature } = req.body;
    
    if (!message || !signature) {
      return res.status(400).json({ error: 'Message and signature required' });
    }
    
    const siweMessage = new SiweMessage(message);
    const { nonce } = siweMessage;
    
    // Handle proxy headers for production environments (Replit, Vercel, etc.)
    // Priority: x-forwarded-host > origin host > referer host > host header
    const forwardedHost = req.headers['x-forwarded-host'];
    const originHeader = req.headers.origin;
    const refererHeader = req.headers.referer;
    
    // Extract host from origin or referer as fallback
    let originHost: string | undefined;
    let refererHost: string | undefined;
    
    if (originHeader) {
      try {
        originHost = new URL(originHeader as string).host;
      } catch (e) {}
    }
    
    if (refererHeader) {
      try {
        refererHost = new URL(refererHeader as string).host;
      } catch (e) {}
    }
    
    const expectedHost = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) 
      || originHost 
      || refererHost 
      || req.headers.host;
    
    if (!expectedHost) {
      return res.status(400).json({ 
        error: 'Invalid request - missing host header',
        code: 'INVALID_REQUEST'
      });
    }
    
    const messageDomain = siweMessage.domain;
    
    // Log for debugging in production
    console.log('[SIWE Verify] Domain check:', {
      messageDomain,
      expectedHost,
      forwardedHost: req.headers['x-forwarded-host'],
      originHost,
      refererHost,
      rawHost: req.headers.host
    });
    
    // Allow if domain matches any of the possible host sources
    const validHosts = [
      Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost,
      originHost,
      refererHost,
      req.headers.host
    ].filter(Boolean);
    
    if (!validHosts.includes(messageDomain)) {
      console.warn('[SIWE Verify] Domain mismatch:', { messageDomain, validHosts });
      return res.status(401).json({ 
        error: 'Domain mismatch. The signature was created for a different site.',
        code: 'DOMAIN_MISMATCH',
        debug: { validHosts, received: messageDomain }
      });
    }
    
    const messageChainId = siweMessage.chainId;
    if (messageChainId !== ARBITRUM_CHAIN_ID) {
      return res.status(401).json({ 
        error: `Invalid network. Please connect to Arbitrum One (Chain ID: ${ARBITRUM_CHAIN_ID}).`,
        code: 'CHAIN_MISMATCH'
      });
    }
    
    const nonceResult = await pool.query(
      `SELECT nonce FROM siwe_nonces WHERE nonce = $1 AND expires_at > NOW()`,
      [nonce]
    );
    
    if (nonceResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired nonce. Please request a new one.',
        code: 'NONCE_INVALID'
      });
    }
    
    // Use the message's own domain for verification since we already validated it
    const fields = await siweMessage.verify({ 
      signature,
      nonce,
      domain: messageDomain
    });
    
    if (!fields.success) {
      return res.status(401).json({ 
        error: 'Invalid signature',
        code: 'SIGNATURE_INVALID'
      });
    }
    
    await pool.query(`DELETE FROM siwe_nonces WHERE nonce = $1`, [nonce]);
    
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
