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

function base64UrlEncode(input: Buffer | string): string {
  const base64 = Buffer.isBuffer(input) ? input.toString('base64') : Buffer.from(input).toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function createPrivateKeyFromCDP(rawKey: string): crypto.KeyObject {
  let keyData = rawKey.trim();
  
  console.log('Raw key starts with:', keyData.substring(0, 30));
  console.log('Raw key length:', keyData.length);
  
  keyData = keyData.replace(/\\n/g, '\n');
  
  if (keyData.startsWith('{')) {
    try {
      const parsed = JSON.parse(keyData);
      console.log('Parsed CDP JSON, keys:', Object.keys(parsed));
      if (parsed.privateKey) {
        keyData = parsed.privateKey.replace(/\\n/g, '\n');
        console.log('Extracted privateKey, starts with:', keyData.substring(0, 30));
      } else if (parsed.key) {
        keyData = parsed.key.replace(/\\n/g, '\n');
      } else if (parsed.apiSecret) {
        keyData = parsed.apiSecret.replace(/\\n/g, '\n');
      }
    } catch (e: any) {
      console.log('JSON parse failed:', e.message);
    }
  }
  
  if (keyData.includes('-----BEGIN')) {
    console.log('Parsing PEM key directly');
    return crypto.createPrivateKey(keyData);
  }
  
  const cleanKey = keyData.replace(/[\s\n\r]/g, '');
  const keyBuffer = Buffer.from(cleanKey, 'base64');
  
  console.log('Key buffer length:', keyBuffer.length, 'bytes');
  
  const derTypes: Array<'sec1' | 'pkcs8'> = ['sec1', 'pkcs8'];
  for (const type of derTypes) {
    try {
      const key = crypto.createPrivateKey({
        key: keyBuffer,
        format: 'der',
        type
      });
      console.log('Parsed as DER', type);
      return key;
    } catch (e: any) {
      console.log('DER', type, 'failed:', e.message);
    }
  }
  
  const pemFormats = [
    { header: '-----BEGIN EC PRIVATE KEY-----', footer: '-----END EC PRIVATE KEY-----' },
    { header: '-----BEGIN PRIVATE KEY-----', footer: '-----END PRIVATE KEY-----' }
  ];
  
  for (const fmt of pemFormats) {
    const pemFormatted = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;
    const pem = `${fmt.header}\n${pemFormatted}\n${fmt.footer}`;
    try {
      const key = crypto.createPrivateKey(pem);
      console.log('Parsed as PEM');
      return key;
    } catch (e: any) {
      console.log('PEM failed:', e.message);
    }
  }
  
  if (keyBuffer.length === 64) {
    try {
      const key = crypto.createPrivateKey({
        key: keyBuffer,
        format: 'der',
        type: 'pkcs8'
      });
      console.log('Parsed as raw 64-byte PKCS8');
      return key;
    } catch (e: any) {
      console.log('64-byte PKCS8 failed:', e.message);
    }
    
    try {
      const ed25519Prefix = Buffer.from([
        0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20
      ]);
      const privateKeyBytes = keyBuffer.subarray(0, 32);
      const ed25519Der = Buffer.concat([ed25519Prefix, privateKeyBytes]);
      const key = crypto.createPrivateKey({
        key: ed25519Der,
        format: 'der',
        type: 'pkcs8'
      });
      console.log('Parsed as Ed25519 from 64-byte key');
      return key;
    } catch (e: any) {
      console.log('Ed25519 conversion failed:', e.message);
    }
  }
  
  if (keyBuffer.length === 32 || keyBuffer.length === 64) {
    const privateKeyBytes = keyBuffer.length === 64 ? keyBuffer.subarray(0, 32) : keyBuffer;
    
    const SEC1_P256_PREFIX = Buffer.from([
      0x30, 0x41, 0x02, 0x01, 0x01, 0x04, 0x20
    ]);
    const SEC1_P256_SUFFIX = Buffer.from([
      0xa0, 0x0a, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07
    ]);
    
    const sec1Der = Buffer.concat([SEC1_P256_PREFIX, privateKeyBytes, SEC1_P256_SUFFIX]);
    try {
      const key = crypto.createPrivateKey({
        key: sec1Der,
        format: 'der',
        type: 'sec1'
      });
      console.log('Parsed as raw P-256 key from', keyBuffer.length, 'bytes');
      return key;
    } catch (e: any) {
      console.log('Raw P-256 conversion failed:', e.message);
    }
  }
  
  throw new Error(`Unable to parse private key (${keyBuffer.length} bytes)`);
}

function createJWT(keyName: string, privateKey: crypto.KeyObject): string {
  const keyType = privateKey.asymmetricKeyType;
  const alg = keyType === 'ed25519' ? 'EdDSA' : 'ES256';
  
  console.log('Creating JWT with algorithm:', alg, 'keyType:', keyType);
  
  const header = {
    alg,
    typ: 'JWT',
    kid: keyName,
    nonce: crypto.randomBytes(16).toString('hex')
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'cdp',
    nbf: now,
    exp: now + 120,
    sub: keyName,
    aud: ['cdp_service'],
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

  const encodedSignature = base64UrlEncode(signature);
  return `${message}.${encodedSignature}`;
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
    
    let privateKey: crypto.KeyObject;
    try {
      privateKey = createPrivateKeyFromCDP(cdpPrivateKey);
      console.log('Private key parsed, type:', privateKey.asymmetricKeyType, 'details:', privateKey.asymmetricKeyDetails);
    } catch (keyError: any) {
      console.error('Failed to parse private key:', keyError.message);
      return res.status(200).json({ 
        token: undefined,
        error: 'Invalid private key format - ensure CDP_API_PRIVATE_KEY is in PEM format'
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
      console.error('Request used key ID:', cdpKeyId);
      
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
