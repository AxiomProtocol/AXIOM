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
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',');
    return ips[0].trim();
  }
  return req.socket?.remoteAddress || '0.0.0.0';
}

function createJWT(keyId: string, privateKey: string): string {
  const header = {
    alg: 'ES256',
    typ: 'JWT',
    kid: keyId
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'cdp',
    nbf: now,
    exp: now + 120,
    sub: keyId
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const message = `${base64Header}.${base64Payload}`;

  const sign = crypto.createSign('SHA256');
  sign.update(message);
  const signature = sign.sign(privateKey, 'base64url');

  return `${message}.${signature}`;
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
  const projectId = process.env.COINBASE_PROJECT_ID;

  if (!cdpKeyId || !cdpPrivateKey) {
    console.log('CDP credentials not configured, using URL-only mode');
    return res.status(200).json({ 
      token: undefined,
      error: 'Session tokens not available - using basic mode'
    });
  }

  try {
    const { walletAddress, assets, networks } = req.body;

    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const clientIP = getClientIP(req);
    const jwt = createJWT(cdpKeyId, cdpPrivateKey);

    const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destination_wallets: [{
          address: walletAddress,
          blockchains: networks || ['arbitrum']
        }],
        assets: assets || ['ETH', 'USDC'],
        client_ip: clientIP
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('CDP session token error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to generate session token' 
      });
    }

    const data = await response.json();
    return res.status(200).json({ token: data.token });

  } catch (error: any) {
    console.error('Session token generation failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
