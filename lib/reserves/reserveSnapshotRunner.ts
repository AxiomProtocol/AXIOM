/**
 * lib/reserves/reserveSnapshotRunner.ts
 *
 * Hourly reserve-balance snapshot writer.
 *
 * For each of the 6 tracked reserve assets (ETH, PAXG, AXAU, AXM, USDC, AXUSD),
 * fetches the current on-chain or custodial balance and writes a row to
 * `reserve_balance_snapshots`.  The INSERT uses ON CONFLICT DO NOTHING against
 * the (symbol, snapshot_hour) unique index, so running the cron more than once
 * inside the same clock-hour is safe and idempotent.
 *
 * USD prices are fetched opportunistically:
 *   - ETH  → CoinGecko /simple/price
 *   - PAXG → CoinGecko /simple/price
 *   - AXAU → stored as 1 : 1 with XAU price (closest available: PAXG price)
 *   - AXM, USDC, AXUSD → null for now (no reliable free oracle available in-process)
 *
 * Uses `pool` from server/db.ts for all DB access (inherits Neon SSL config
 * and the no-op proxy when DATABASE_URL is absent).
 */

import { ethers } from 'ethers';
import { pool as sharedPool } from '../../server/db';
import { DEPLOYER_EOA, GOVERNANCE_SAFE } from '../../src/config/adminRoles';
import { CORE_CONTRACTS, STABLECOINS } from '../../shared/contracts';
import { ERC3643_CONTRACTS } from '../../shared/contracts-3643';
import { CANONICAL_PSM } from '../../src/config/activeContracts.generated';
import { AXAU_ADDRESSES } from '../../lib/services/AXAUContractService';
import { bitGoTreasuryExtension } from '../../lib/services/BitGoTreasuryExtension';
import { getVaultBuffer } from '../../lib/services/AXAUFulfillmentService';

const ALCHEMY_KEY  = process.env.ALCHEMY_API_KEY ?? '';
const ARBITRUM_RPC = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'] as const;

// ── Price helpers ───────────────────────────────────────────────────────────

async function fetchCoinGeckoPriceUsd(ids: string[]): Promise<Record<string, number | null>> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return Object.fromEntries(ids.map(id => [id, null]));
    const json = await res.json() as Record<string, { usd?: number }>;
    return Object.fromEntries(ids.map(id => [id, json[id]?.usd ?? null]));
  } catch {
    return Object.fromEntries(ids.map(id => [id, null]));
  }
}

// ── Snapshot hour helper ────────────────────────────────────────────────────

function currentSnapshotHour(): Date {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d;
}

// ── Per-asset balance fetchers ──────────────────────────────────────────────

async function fetchEthBalance(provider: ethers.JsonRpcProvider): Promise<number | null> {
  try {
    const raw = await provider.getBalance(DEPLOYER_EOA);
    return parseFloat(ethers.formatEther(raw));
  } catch {
    return null;
  }
}

async function fetchPaxgBalance(provider: ethers.JsonRpcProvider): Promise<number | null> {
  try {
    const PAXG_ARBITRUM = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
    const contract = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, provider);
    const raw = await contract.balanceOf(DEPLOYER_EOA) as bigint;
    const rawSafe = await contract.balanceOf(GOVERNANCE_SAFE) as bigint;
    return parseFloat(ethers.formatUnits(raw + rawSafe, 18));
  } catch {
    // Fall back to BitGo custody balance
    try {
      const bitGoData = await bitGoTreasuryExtension.getReserveAssetBalances();
      const paxg = bitGoData.assets?.find((a: any) => a.symbol === 'PAXG' || a.coin?.includes('paxg'));
      if (paxg?.balance != null) return parseFloat(String(paxg.balance));
    } catch {}
    return null;
  }
}

async function fetchAxauBalance(): Promise<number | null> {
  try {
    const vaultData = await getVaultBuffer();
    if (vaultData?.vaultBalance != null) {
      return parseFloat(String(vaultData.vaultBalance));
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchAxmBalance(provider: ethers.JsonRpcProvider): Promise<number | null> {
  try {
    const contract = new ethers.Contract(CORE_CONTRACTS.AXM_TOKEN, ERC20_ABI, provider);
    const [rawDeployer, rawSafe] = await Promise.all([
      contract.balanceOf(DEPLOYER_EOA) as Promise<bigint>,
      contract.balanceOf(GOVERNANCE_SAFE) as Promise<bigint>,
    ]);
    return parseFloat(ethers.formatUnits(rawDeployer + rawSafe, 18));
  } catch {
    return null;
  }
}

async function fetchUsdcBalance(provider: ethers.JsonRpcProvider): Promise<number | null> {
  try {
    const contract = new ethers.Contract(STABLECOINS.USDC, ERC20_ABI, provider);
    const raw = await contract.balanceOf(CANONICAL_PSM) as bigint;
    return parseFloat(ethers.formatUnits(raw, 6));
  } catch {
    return null;
  }
}

async function fetchAxusdSupply(provider: ethers.JsonRpcProvider): Promise<number | null> {
  try {
    const ABI = ['function totalSupply() view returns (uint256)'] as const;
    const contract = new ethers.Contract(ERC3643_CONTRACTS.AXUSD_TOKEN, ABI, provider);
    const raw = await contract.totalSupply() as bigint;
    return parseFloat(ethers.formatUnits(raw, 18));
  } catch {
    return null;
  }
}

// ── Main runner ─────────────────────────────────────────────────────────────

export interface SnapshotRunResult {
  snapshotHour: string;
  written: string[];
  skipped: string[];
  errors: Record<string, string>;
}

export async function runReserveSnapshot(): Promise<SnapshotRunResult> {
  const snapshotHour = currentSnapshotHour();
  const written: string[] = [];
  const skipped: string[] = [];
  const errors: Record<string, string> = {};

  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);

  // Fetch all balances concurrently
  const [
    ethBalance,
    paxgBalance,
    axauBalance,
    axmBalance,
    usdcBalance,
    axusdSupply,
    prices,
  ] = await Promise.all([
    fetchEthBalance(provider),
    fetchPaxgBalance(provider),
    fetchAxauBalance(),
    fetchAxmBalance(provider),
    fetchUsdcBalance(provider),
    fetchAxusdSupply(provider),
    fetchCoinGeckoPriceUsd(['ethereum', 'pax-gold']),
  ]);

  const ethPriceUsd  = prices['ethereum'] ?? null;
  const paxgPriceUsd = prices['pax-gold']  ?? null;

  const assets: Array<{
    symbol: string;
    balance: number | null;
    usdValue: number | null;
  }> = [
    {
      symbol: 'ETH',
      balance: ethBalance,
      usdValue: ethBalance != null && ethPriceUsd != null
        ? ethBalance * ethPriceUsd
        : null,
    },
    {
      symbol: 'PAXG',
      balance: paxgBalance,
      usdValue: paxgBalance != null && paxgPriceUsd != null
        ? paxgBalance * paxgPriceUsd
        : null,
    },
    {
      symbol: 'AXAU',
      balance: axauBalance,
      usdValue: axauBalance != null && paxgPriceUsd != null
        ? axauBalance * paxgPriceUsd
        : null,
    },
    {
      symbol: 'AXM',
      balance: axmBalance,
      usdValue: null,
    },
    {
      symbol: 'USDC',
      balance: usdcBalance,
      usdValue: usdcBalance,
    },
    {
      symbol: 'AXUSD',
      balance: axusdSupply,
      usdValue: axusdSupply,
    },
  ];

  // Write rows — ON CONFLICT (symbol, snapshot_hour) DO NOTHING for idempotency
  for (const asset of assets) {
    if (asset.balance === null) {
      errors[asset.symbol] = 'balance fetch returned null';
      continue;
    }
    try {
      const result = await sharedPool.query(
        `INSERT INTO reserve_balance_snapshots
           (symbol, balance, usd_value, snapshot_hour)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (symbol, snapshot_hour) DO NOTHING`,
        [asset.symbol, String(asset.balance), asset.usdValue != null ? String(asset.usdValue) : null, snapshotHour],
      );
      if ((result.rowCount ?? 0) > 0) {
        written.push(asset.symbol);
      } else {
        skipped.push(asset.symbol);
      }
    } catch (err: unknown) {
      errors[asset.symbol] = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    snapshotHour: snapshotHour.toISOString(),
    written,
    skipped,
    errors,
  };
}
