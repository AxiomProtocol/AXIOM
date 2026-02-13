import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { pool } from '../../../server/db';
import { ACTIVE_PSM, EULER_PSM } from '../../../src/config/activeContracts.generated';

const MINT_SELECTORS = ['0xa0712d68', '0xa43e6141'];
const REDEEM_SELECTORS = ['0xdb006a75', '0xe042f940'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  const providedKey = req.headers['x-admin-key'] as string;
  if (!adminKey || providedKey !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { txHashes } = req.body;
  if (!txHashes || !Array.isArray(txHashes) || txHashes.length === 0) {
    return res.status(400).json({ error: 'Provide txHashes array' });
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return res.status(500).json({ error: 'ALCHEMY_API_KEY not configured' });
  }

  const provider = new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`);
  const results: any[] = [];

  for (const txHash of txHashes) {
    try {
      const existing = await pool.query(
        `SELECT id FROM founder_ops_log WHERE tx_hash = $1`,
        [txHash]
      );
      if (existing.rows.length > 0) {
        results.push({ txHash, status: 'skipped', reason: 'Already exists' });
        continue;
      }

      const [receipt, tx] = await Promise.all([
        provider.getTransactionReceipt(txHash),
        provider.getTransaction(txHash),
      ]);

      if (!receipt || !tx) {
        results.push({ txHash, status: 'error', reason: 'Transaction not found on-chain' });
        continue;
      }

      const txTo = receipt.to?.toLowerCase();
      let ecosystem = 'UNKNOWN';
      if (txTo === ACTIVE_PSM.toLowerCase()) ecosystem = 'PRIMARY';
      else if (txTo === EULER_PSM.toLowerCase()) ecosystem = 'EULER';
      else {
        results.push({ txHash, status: 'error', reason: `Not a PSM transaction (to: ${txTo})` });
        continue;
      }

      const selector = tx.data?.slice(0, 10).toLowerCase();
      let operation = 'Unknown';
      if (MINT_SELECTORS.includes(selector)) operation = 'Mint';
      else if (REDEEM_SELECTORS.includes(selector)) operation = 'Redeem';

      const iface = new ethers.Interface([
        'function swapCollateralForAXUSDWithMin(uint256 collateralAmount, uint256 minAxusdOut)',
        'function swapAXUSDForCollateralWithMin(uint256 axusdAmount, uint256 minCollateralOut)',
      ]);

      let amount = 0;
      try {
        const decoded = iface.decodeFunctionData(
          operation === 'Mint' ? 'swapCollateralForAXUSDWithMin' : 'swapAXUSDForCollateralWithMin',
          tx.data
        );
        amount = parseFloat(ethers.formatUnits(decoded[0], operation === 'Mint' ? 6 : 18));
      } catch {}

      const ecoLabel = ecosystem === 'PRIMARY' ? 'PRIMARY (GENIUS)' : 'EULER (Original)';
      const title = operation === 'Mint'
        ? `PSM Mint: ${amount} USDC via ${ecoLabel} PSM`
        : `PSM Redeem: ${amount} AXUSD via ${ecoLabel} PSM`;

      const description = `${operation} operation via ${ecoLabel} PSM. Verified on-chain: tx ${txHash} confirmed in block ${receipt.blockNumber}. Backfilled from missing production log.`;

      await pool.query(
        `INSERT INTO founder_ops_log (week, phase, category, title, description, tx_hash, product, amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [1, 1, 'PSM Stress Test', title, description, txHash, 'PSM', amount, 'completed']
      );

      results.push({ txHash, status: 'inserted', operation, ecosystem, amount, title });
    } catch (err: any) {
      results.push({ txHash, status: 'error', reason: err.message });
    }
  }

  return res.status(200).json({ success: true, results });
}
