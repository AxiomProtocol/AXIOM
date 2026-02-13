import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { pool } from '../../../server/db';
import { ACTIVE_PSM, EULER_PSM } from '../../../src/config/activeContracts.generated';

const VALID_PSM_ADDRESSES = [ACTIVE_PSM.toLowerCase(), EULER_PSM.toLowerCase()];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-cache');

  const { txHash, week, ecosystem, operation, inputAmount, description } = req.body;

  if (!txHash || !week || !ecosystem || !operation || !inputAmount) {
    return res.status(400).json({ success: false, error: 'Missing required fields: txHash, week, ecosystem, operation, inputAmount' });
  }

  if (!['PRIMARY', 'EULER'].includes(ecosystem)) {
    return res.status(400).json({ success: false, error: 'Invalid ecosystem: must be PRIMARY or EULER' });
  }

  if (!['Mint', 'Redeem'].includes(operation)) {
    return res.status(400).json({ success: false, error: 'Invalid operation: must be Mint or Redeem' });
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return res.status(500).json({ success: false, error: 'ALCHEMY_API_KEY not configured' });
  }

  const MINT_SELECTORS = ['0xa0712d68', '0xa43e6141'];
  const REDEEM_SELECTORS = ['0xdb006a75', '0xe042f940'];

  try {
    const provider = new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`);
    const [receipt, tx] = await Promise.all([
      provider.getTransactionReceipt(txHash),
      provider.getTransaction(txHash),
    ]);

    if (!receipt || !tx) {
      return res.status(400).json({ success: false, error: 'Transaction not found on-chain. It may still be pending.' });
    }

    if (receipt.status !== 1) {
      return res.status(400).json({ success: false, error: 'Transaction failed on-chain (reverted).' });
    }

    const txTo = receipt.to?.toLowerCase();
    if (!txTo || !VALID_PSM_ADDRESSES.includes(txTo)) {
      return res.status(400).json({ success: false, error: `Transaction target ${txTo} is not a valid PSM address.` });
    }

    const expectedPsm = ecosystem === 'PRIMARY' ? ACTIVE_PSM.toLowerCase() : EULER_PSM.toLowerCase();
    if (txTo !== expectedPsm) {
      return res.status(400).json({ success: false, error: `Transaction was sent to ${txTo} but ecosystem ${ecosystem} expects ${expectedPsm}. DO NOT MIX ecosystems.` });
    }

    const selector = tx.data?.slice(0, 10).toLowerCase();
    const expectedSelectors = operation === 'Mint' ? MINT_SELECTORS : REDEEM_SELECTORS;
    if (!expectedSelectors.includes(selector)) {
      return res.status(400).json({ success: false, error: `Transaction method signature ${selector} does not match expected ${operation} selectors ${expectedSelectors.join(', ')}.` });
    }

    const ecoLabel = ecosystem === 'PRIMARY' ? 'PRIMARY (GENIUS)' : 'EULER (Original)';
    const title = operation === 'Mint'
      ? `PSM Mint: ${inputAmount} USDC via ${ecoLabel} PSM`
      : `PSM Redeem: ${inputAmount} AXUSD via ${ecoLabel} PSM`;

    const logDescription = description || `${operation} operation via ${ecoLabel} PSM. Verified on-chain: tx ${txHash} confirmed in block ${receipt.blockNumber}.`;

    const numericAmount = parseFloat(inputAmount) || 0;

    const result = await pool.query(
      `INSERT INTO founder_ops_log (week, phase, category, title, description, tx_hash, product, amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        parseInt(week) || 1,
        1,
        'PSM Stress Test',
        title,
        logDescription,
        txHash,
        'PSM',
        numericAmount,
        'completed',
      ]
    );

    const host = req.headers['host'] || 'localhost:5000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    try {
      await fetch(`${baseUrl}/api/solvency/auto-ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auto-ingest-key': process.env.ADMIN_SOLVENCY_KEY || '',
          'referer': baseUrl,
        },
        body: JSON.stringify({ notes: `Auto-ingest after PSM ${operation} — ${new Date().toISOString()}` }),
      });
    } catch (ingestErr: any) {
      console.warn('[log-psm-op] Auto-ingest warning:', ingestErr.message);
    }

    return res.status(201).json({ success: true, entry: result.rows[0] });
  } catch (err: any) {
    console.error('[log-psm-op] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
