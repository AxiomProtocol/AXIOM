import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { EULER_LENDING_CONTRACTS } from '../../../shared/contracts';
import { ERC3643_CONTRACTS } from '../../../shared/contracts-3643';
import { pool } from '../../../server/db';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const EVK_VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function interestRate() view returns (uint256)',
  'function interestFee() view returns (uint16)',
];

function getProvider(): ethers.JsonRpcProvider {
  const key = process.env.ALCHEMY_API_KEY;
  const url = key
    ? `https://arb-mainnet.g.alchemy.com/v2/${key}`
    : 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(url);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const vaultAddress = EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT;
  const isDeployed = vaultAddress !== ZERO_ADDRESS;

  let supplyApyPct = '0.00';
  let tvlAxusd = '0.00';
  let totalBorrowsAxusd = '0.00';
  let utilizationPct = '0.00';
  let vaultDeployed = false;

  if (isDeployed) {
    try {
      const provider = getProvider();
      const vault = new ethers.Contract(vaultAddress, EVK_VAULT_ABI, provider);

      const [totalAssets, totalBorrows, interestRate, interestFee] = await Promise.all([
        vault.totalAssets().catch(() => 0n),
        vault.totalBorrows().catch(() => 0n),
        vault.interestRate().catch(() => 0n),
        vault.interestFee().catch(() => 0),
      ]);

      const totalAssetsNum = parseFloat(ethers.formatEther(totalAssets as bigint));
      const totalBorrowsNum = parseFloat(ethers.formatEther(totalBorrows as bigint));
      const utilization = totalAssetsNum > 0 ? (totalBorrowsNum / totalAssetsNum) * 100 : 0;

      const SECONDS_PER_YEAR_BI = BigInt(31_536_000);
      const interestRateBn = interestRate as bigint;
      const borrowAPY = interestRateBn > 0n
        ? Number(interestRateBn * SECONDS_PER_YEAR_BI * 10_000n / (10n ** 27n)) / 100
        : 0;
      const interestFeeRatio = Number(interestFee) / 10_000;
      const supplyAPY = borrowAPY > 0 ? borrowAPY * (utilization / 100) * (1 - interestFeeRatio) : 0;

      supplyApyPct = supplyAPY.toFixed(2);
      tvlAxusd = totalAssetsNum.toFixed(2);
      totalBorrowsAxusd = totalBorrowsNum.toFixed(2);
      utilizationPct = utilization.toFixed(2);
      vaultDeployed = true;
    } catch (err) {
      console.error('[savings/info] vault fetch error:', err);
    }
  }

  // Protocol deposits = net AXUSD deposited by users (confirmed deposits minus confirmed withdrawals)
  let protocolDepositsAxusd = '0.00';
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT
          COALESCE(
            SUM(CASE WHEN operation = 'deposit' THEN CAST(deposit_amount_axusd AS NUMERIC) ELSE 0 END)
            - SUM(CASE WHEN operation = 'withdraw' THEN CAST(deposit_amount_axusd AS NUMERIC) ELSE 0 END),
          0) AS net_deposited
        FROM savings_positions
        WHERE status = 'confirmed'
      `);
      const net = parseFloat(result.rows[0]?.net_deposited ?? '0');
      protocolDepositsAxusd = Math.max(0, net).toFixed(2);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[savings/info] db error:', err);
  }

  return res.status(200).json({
    success: true,
    supplyApyPct,
    tvlAxusd,
    totalBorrowsAxusd,
    utilizationPct,
    protocolDepositsAxusd,
    vaultDeployed,
    vaultAddress: isDeployed ? vaultAddress : null,
    axusdAddress: ERC3643_CONTRACTS.AXUSD_TOKEN,
    apyLabel: 'Variable',
    network: { chainId: 42161, name: 'Arbitrum One' },
    timestamp: new Date().toISOString(),
  });
}
