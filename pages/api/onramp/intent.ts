/**
 * Onramp Intent API - Create purchase intents
 * POST /api/onramp/intent
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { getProviderWidgetUrl, getOnrampConfig } from '../../../lib/onramp/config';
import type { OnrampProvider } from '../../../lib/onramp/types';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function generateIntentId(): string {
  return `onramp_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, provider, chainId, asset, fiatCurrency, fiatAmount, userId } = req.body;

    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const validProviders: OnrampProvider[] = ['moonpay', 'ramp', 'transak'];
    if (!provider || !validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    if (!chainId || typeof chainId !== 'number') {
      return res.status(400).json({ error: 'Invalid chain ID' });
    }

    if (!asset || typeof asset !== 'string') {
      return res.status(400).json({ error: 'Invalid asset' });
    }

    if (!fiatCurrency || typeof fiatCurrency !== 'string') {
      return res.status(400).json({ error: 'Invalid fiat currency' });
    }

    if (!fiatAmount || typeof fiatAmount !== 'number' || fiatAmount <= 0) {
      return res.status(400).json({ error: 'Invalid fiat amount' });
    }

    const config = getOnrampConfig();
    if (!config.providers[provider as OnrampProvider].enabled) {
      return res.status(400).json({ error: `Provider ${provider} is not configured` });
    }

    const intentId = generateIntentId();
    
    const widgetUrl = getProviderWidgetUrl(provider as OnrampProvider, {
      walletAddress,
      asset,
      fiatCurrency,
      fiatAmount,
      chainId
    });

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO onramp_purchase_intents 
         (intent_id, user_id, wallet_address, provider, chain_id, asset, fiat_currency, fiat_amount, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'created', NOW(), NOW())`,
        [intentId, userId || null, walletAddress.toLowerCase(), provider, chainId, asset, fiatCurrency, fiatAmount]
      );
    } finally {
      client.release();
    }

    return res.status(200).json({
      intentId,
      widgetUrl,
      status: 'created'
    });

  } catch (error) {
    console.error('Failed to create onramp intent:', error);
    return res.status(500).json({ error: 'Failed to create purchase intent' });
  }
}
