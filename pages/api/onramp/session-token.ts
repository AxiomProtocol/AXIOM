/**
 * Coinbase Onramp Session Token API
 * Generates a secure session token for Coinbase Pay initialization
 * 
 * POST /api/onramp/session-token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

interface SessionTokenResponse {
  token?: string;
  error?: string;
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
    return crypto.createPrivateKey(keyData);
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    const clientIP = getClientIP(req);
    console.log('Client IP detected:', clientIP);
    
    let privateKey: crypto.KeyObject;
    try {
      privateKey = createPrivateKeyFromCDP(cdpPrivateKey);
      console.log('Private key parsed, type:', privateKey.asymmetricKeyType);
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
