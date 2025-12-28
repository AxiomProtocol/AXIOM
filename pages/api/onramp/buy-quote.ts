/**
 * Coinbase One-Click-Buy URL API
 * Generates a direct onramp URL for users to purchase crypto
 * 
 * POST /api/onramp/buy-quote
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

interface BuyQuoteResponse {
  onramp_url?: string;
  quote?: {
    purchase_amount: { value: string; currency: string };
    payment_total: { value: string; currency: string };
    coinbase_fee: { value: string; currency: string };
    network_fee: { value: string; currency: string };
  };
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

function createJWT(keyName: string, privateKey: crypto.KeyObject, uri: string): string {
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
    uri
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
  res: NextApiResponse<BuyQuoteResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cdpKeyId = process.env.CDP_API_KEY_ID;
  const cdpPrivateKey = process.env.CDP_API_PRIVATE_KEY;

  if (!cdpKeyId || !cdpPrivateKey) {
    return res.status(200).json({ error: 'CDP credentials not configured' });
  }

  try {
    const { 
      walletAddress, 
      paymentAmount = '100.00',
      paymentCurrency = 'USD',
      purchaseCurrency = 'ETH',
      purchaseNetwork = 'arbitrum',
      country = 'US'
    } = req.body;

    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const clientIP = getClientIP(req);
    console.log('Buy quote - Client IP:', clientIP);
    
    let privateKey: crypto.KeyObject;
    try {
      privateKey = createPrivateKeyFromCDP(cdpPrivateKey);
    } catch (keyError: any) {
      console.error('Failed to parse private key:', keyError.message);
      return res.status(200).json({ error: 'Invalid private key format' });
    }

    const uri = 'POST api.developer.coinbase.com/onramp/v1/buy/quote';
    const jwt = createJWT(cdpKeyId, privateKey, uri);

    console.log('Buy quote JWT generated');

    const response = await fetch('https://api.developer.coinbase.com/onramp/v1/buy/quote', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        country,
        paymentAmount,
        paymentCurrency,
        paymentMethod: 'CARD',
        purchaseCurrency,
        purchaseNetwork,
        destinationAddress: walletAddress,
        clientIp: clientIP
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('CDP Buy Quote API error:', response.status, errorData);
      
      let userMessage = 'Unable to get quote. Please try again.';
      if (response.status === 401) {
        userMessage = 'Payment service authentication failed.';
      } else if (response.status === 400 && errorData.includes('private IP')) {
        userMessage = 'Please try again from your browser.';
      }
      
      return res.status(200).json({ error: userMessage });
    }

    const data = await response.json();
    console.log('Buy quote generated successfully');
    
    return res.status(200).json({ 
      onramp_url: data.onramp_url,
      quote: {
        purchase_amount: data.purchase_amount,
        payment_total: data.payment_total,
        coinbase_fee: data.coinbase_fee,
        network_fee: data.network_fee
      }
    });

  } catch (error: any) {
    console.error('Buy quote generation failed:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
