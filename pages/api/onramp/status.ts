/**
 * Onramp Status API - Update purchase intent status
 * POST /api/onramp/status
 * GET /api/onramp/status?intentId=xxx
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import type { OnrampStatus } from '../../../lib/onramp/types';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { intentId, walletAddress } = req.query;

    if (!intentId && !walletAddress) {
      return res.status(400).json({ error: 'intentId or walletAddress required' });
    }

    const client = await pool.connect();
    try {
      let result;
      if (intentId) {
        result = await client.query(
          `SELECT intent_id, wallet_address, provider, chain_id, asset, fiat_currency, fiat_amount, 
                  crypto_amount_estimate, status, provider_reference, created_at, updated_at
           FROM onramp_purchase_intents 
           WHERE intent_id = $1`,
          [intentId]
        );
      } else {
        result = await client.query(
          `SELECT intent_id, wallet_address, provider, chain_id, asset, fiat_currency, fiat_amount, 
                  crypto_amount_estimate, status, provider_reference, created_at, updated_at
           FROM onramp_purchase_intents 
           WHERE wallet_address = $1
           ORDER BY created_at DESC
           LIMIT 10`,
          [(walletAddress as string).toLowerCase()]
        );
      }

      if (intentId && result.rows.length === 0) {
        return res.status(404).json({ error: 'Intent not found' });
      }

      return res.status(200).json({
        intents: result.rows.map(row => ({
          intentId: row.intent_id,
          walletAddress: row.wallet_address,
          provider: row.provider,
          chainId: row.chain_id,
          asset: row.asset,
          fiatCurrency: row.fiat_currency,
          fiatAmount: parseFloat(row.fiat_amount),
          cryptoAmountEstimate: row.crypto_amount_estimate ? parseFloat(row.crypto_amount_estimate) : null,
          status: row.status,
          providerReference: row.provider_reference,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Failed to get onramp status:', error);
    return res.status(500).json({ error: 'Failed to get status' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { intentId, status, providerReference } = req.body;

    if (!intentId) {
      return res.status(400).json({ error: 'intentId required' });
    }

    const validStatuses: OnrampStatus[] = ['created', 'pending', 'completed', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE onramp_purchase_intents 
         SET status = $2, provider_reference = COALESCE($3, provider_reference), updated_at = NOW()
         WHERE intent_id = $1
         RETURNING intent_id, status`,
        [intentId, status, providerReference || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Intent not found' });
      }

      return res.status(200).json({
        ok: true,
        intentId: result.rows[0].intent_id,
        status: result.rows[0].status
      });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Failed to update onramp status:', error);
    return res.status(500).json({ error: 'Failed to update status' });
  }
}
