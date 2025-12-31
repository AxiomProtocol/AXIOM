/**
 * Coinbase Onramp Session Token API
 * Generates a secure session token for Coinbase Pay initialization
 * 
 * SECURITY: Requires SIWE authentication
 * CORS: Restricted to allowed origins only
 * 
 * POST /api/onramp/session-token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { pool } from '../../../server/db';
import { applyCors, validateOrigin } from '../../../lib/middleware/cors';

interface SessionTokenResponse {
  token?: string;
  error?: string;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...val] = cookie.trim().split('=');
      return [key, val.join('=')];
    })
  );
}

async function verifySiweSession(req: NextApiRequest): Promise<{ authenticated: boolean; address: string | null }> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies['siwe_session'];
    
    if (!sessionToken) {
      return { authenticated: false, address: null };
    }
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT wallet_address FROM wallet_sessions 
         WHERE session_token = $1 AND expires_at > NOW()`,
        [sessionToken]
      );
      
      if (result.rows.length === 0) {
        return { authenticated: false, address: null };
      }
      
      return { authenticated: true, address: result.rows[0].wallet_address };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('SIWE session verification error:', error);
    return { authenticated: false, address: null };
  }
}

function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function getClientIP(req: NextApiRequest): string {
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  const xRealIp = req.headers['x-real-ip'];
  const forwarded = req.headers['x-forwarded-for'];
  
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  }
  
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
  }
  
  if (forwarded) {
    const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',');
    const clientIp = ips[0].trim();
    return clientIp.replace(/^::ffff:/, '');
  }
  
  const remoteAddr = req.socket?.remoteAddress || '0.0.0.0';
  return remoteAddr.replace(/^::ffff:/, '');
}

function base64UrlEncode(input: Buffer | string): string {
  const base64 = Buffer.isBuffer(input) ? input.toString('base64') : Buffer.from(input).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function createPrivateKeyFromCDP(rawKey: string): crypto.KeyObject {
  let keyData = rawKey.trim().replace(/\\n/g, '\n');
  
  if (keyData.startsWith('{')) {
    try {
      const parsed = JSON.parse(keyData);
      keyData = (parsed.privateKey || parsed.key || parsed.apiSecret || '').replace(/\\n/g, '\n');
    } catch {}
  }
  
  if (keyData.includes('-----BEGIN')) {
    // Handle case where key is on one line with spaces
    if (!keyData.includes('\n')) {
      // Extract header, content, and footer
      const headerMatch = keyData.match(/-----BEGIN [A-Z ]+-----/);
      const footerMatch = keyData.match(/-----END [A-Z ]+-----/);
      
      if (headerMatch && footerMatch) {
        const header = headerMatch[0];
        const footer = footerMatch[0];
        let content = keyData
          .replace(header, '')
          .replace(footer, '')
          .trim()
          .replace(/\s+/g, ''); // Remove all whitespace
        
        // Format base64 content with proper line breaks (64 chars per line)
        const lines = content.match(/.{1,64}/g) || [];
        keyData = `${header}\n${lines.join('\n')}\n${footer}`;
      }
    }
    
    const key = crypto.createPrivateKey(keyData);
    
    // Validate key type
    if (key.asymmetricKeyType !== 'ec' && key.asymmetricKeyType !== 'ed25519') {
      throw new Error('Unsupported key type - must be EC or Ed25519');
    }
    
    return key;
  }
  
  throw new Error('Unable to parse private key');
}

function createJWT(keyName: string, privateKey: crypto.KeyObject): string {
  const keyType = privateKey.asymmetricKeyType;
  const alg = keyType === 'ed25519' ? 'EdDSA' : 'ES256';
  
  const header = {
    alg,
    typ: 'JWT',
    kid: keyName,
    nonce: crypto.randomBytes(16).toString('hex')
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'coinbase-cloud',
    nbf: now,
    exp: now + 120,
    sub: keyName,
    uri: 'POST api.developer.coinbase.com/onramp/v1/token'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  let signature: Buffer;
  if (alg === 'EdDSA') {
    signature = crypto.sign(null, Buffer.from(message), privateKey);
  } else {
    signature = crypto.sign('SHA256', Buffer.from(message), {
      key: privateKey,
      dsaEncoding: 'ieee-p1363'
    });
  }

  return `${message}.${base64UrlEncode(signature)}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionTokenResponse>
) {
  if (applyCors(req, res)) {
    return;
  }

  if (!validateOrigin(req)) {
    console.warn('CORS violation: Origin not allowed:', req.headers.origin);
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifySiweSession(req);
  if (!session.authenticated) {
    console.warn('Unauthenticated session token request');
    return res.status(401).json({ error: 'Authentication required. Please connect and sign in with your wallet.' });
  }

  console.log('Authenticated session token request for:', session.address);

  const cdpKeyId = process.env.CDP_API_KEY_ID;
  const cdpPrivateKey = process.env.CDP_API_PRIVATE_KEY;

  if (!cdpKeyId || !cdpPrivateKey) {
    console.log('CDP credentials not configured');
    return res.status(200).json({ 
      token: undefined,
      error: 'CDP credentials not configured'
    });
  }

  try {
    const { walletAddress, assets, networks } = req.body;

    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    if (session.address && walletAddress.toLowerCase() !== session.address.toLowerCase()) {
      console.warn('Wallet address mismatch: session=', session.address, 'requested=', walletAddress);
      return res.status(403).json({ error: 'Wallet address does not match authenticated session' });
    }

    const clientIP = getClientIP(req);
    console.log('Client IP detected:', clientIP);
    
    let privateKey: crypto.KeyObject;
    try {
      privateKey = createPrivateKeyFromCDP(cdpPrivateKey);
    } catch (keyError: any) {
      console.error('Failed to parse private key:', keyError.message);
      return res.status(200).json({ 
        token: undefined,
        error: 'Invalid private key format'
      });
    }

    const jwt = createJWT(cdpKeyId, privateKey);
    console.log('JWT created, length:', jwt.length);

    const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addresses: [{
          address: walletAddress,
          blockchains: networks || ['arbitrum']
        }],
        assets: assets || ['ETH', 'USDC'],
        clientIp: clientIP
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('CDP API error:', response.status, response.statusText);
      console.error('CDP API response body:', errorData);
      
      let userMessage = 'Unable to connect to payment provider. Please try again.';
      if (response.status === 401) {
        userMessage = 'Payment service authentication failed. Please contact support.';
      } else if (response.status === 400 && errorData.includes('private IP')) {
        userMessage = 'Please try again from your browser.';
      }
      
      return res.status(200).json({ 
        token: undefined,
        error: userMessage
      });
    }

    const data = await response.json();
    console.log('Session token generated successfully');
    return res.status(200).json({ token: data.token });

  } catch (error: any) {
    console.error('Session token generation failed:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
