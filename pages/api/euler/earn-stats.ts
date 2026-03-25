import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import {
  isEulerEarnDeployed,
  EULER_EARN_VAULT_ADDRESS,
  AXIOM_FEE_BURNER_ADDRESS,
} from '../../../src/config/activeContracts.generated';
import { EULER_LENDING_CONTRACTS, AXUSD_GENIUS_CONTRACTS } from '../../../shared/contracts';
import { ethers } from 'ethers';

const ALCHEMY_RPC = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
const TOTAL_ASSETS_ABI = ['function totalAssets() view returns (uint256)'];

async function fetchOnChainTvl(vaultAddress: string, label: string): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC);
    const contract = new ethers.Contract(vaultAddress, TOTAL_ASSETS_ABI, provider);
    const raw: bigint = await contract.totalAssets();
    return Number(ethers.formatUnits(raw, 6));
  } catch {
    return 0;
  }
}

const ZERO = '0x0000000000000000000000000000000000000000';

const STRATEGIES = [
  {
    id: 'credit_market',
    label: 'Phase 6 Credit Market',
    address: '0x85074a74774568692128eE97Da661Fe49dcF5fE4',
    targetWeightBps: 4000,
    description: 'AXIOMCreditMarket — fix-and-flip loan book, AMORTIZED/INTEREST_ONLY modes',
    riskTier: 'MEDIUM' as const,
  },
  {
    id: 'evk_vault',
    label: 'EVK Open Money Market',
    address: EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT,
    targetWeightBps: 4000,
    description: 'Euler EVK — ERC-3643 AXUSD lending vault, USDC-collateralized borrowers',
    riskTier: 'LOW' as const,
  },
  {
    id: 'tbill_vault',
    label: 'T-Bill Reserve',
    address: AXUSD_GENIUS_CONTRACTS.TBILL_VAULT,
    targetWeightBps: 2000,
    description: 'On-chain T-Bill vault — short-duration US Treasury exposure',
    riskTier: 'LOW' as const,
  },
];

const PERF_FEE_BPS = 1000;

async function getAmeRegime(): Promise<{ regime: string; confidence: number } | null> {
  try {
    const result = await pool.query(
      `SELECT regime_band, rs FROM ame_evaluations ORDER BY created_at DESC LIMIT 1`
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      regime: String(row.regime_band),
      confidence: parseFloat(String(row.rs)),
    };
  } catch {
    return null;
  }
}

async function getFundRateBps(): Promise<number | null> {
  try {
    const result = await pool.query(
      `SELECT interest_rate_bps FROM lending_fund_config ORDER BY updated_at DESC LIMIT 1`
    );
    if (result.rows.length === 0) return null;
    return parseInt(String(result.rows[0].interest_rate_bps), 10);
  } catch {
    return null;
  }
}

async function getLastRebalance(): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT created_at FROM sentinel_decisions
       WHERE action_type = 'EULER_EARN_REBALANCE'
         AND scope = 'EULER_EARN'
       ORDER BY created_at DESC LIMIT 1`
    );
    if (result.rows.length === 0) return null;
    return String(result.rows[0].created_at);
  } catch {
    return null;
  }
}

function computeBlendedApyBps(strategies: typeof STRATEGIES, creditRateBps: number): number {
  const creditWeight = strategies[0].targetWeightBps / 10000;
  const evkWeight = strategies[1].targetWeightBps / 10000;
  const tbillWeight = strategies[2].targetWeightBps / 10000;

  const creditNetBps = creditRateBps * 0.70;
  const evkBps = 300;
  const tbillBps = 400;

  const grossBps = creditWeight * creditNetBps + evkWeight * evkBps + tbillWeight * tbillBps;
  const afterPerfFee = grossBps * (1 - PERF_FEE_BPS / 10000);
  return Math.round(afterPerfFee);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const deployed = isEulerEarnDeployed();

    const [ameRegime, creditRateBps, lastRebalance, vaultTvlUsd] = await Promise.all([
      getAmeRegime(),
      getFundRateBps(),
      getLastRebalance(),
      deployed ? fetchOnChainTvl(EULER_EARN_VAULT_ADDRESS, 'EulerEarnVault') : Promise.resolve(0),
    ]);

    const effectiveCreditRate = creditRateBps ?? 1400;
    const blendedApyBps = computeBlendedApyBps(STRATEGIES, effectiveCreditRate);

    const strategyTvlFetches = deployed
      ? await Promise.all(
          STRATEGIES.map(s =>
            s.address !== ZERO ? fetchOnChainTvl(s.address, s.id) : Promise.resolve(0)
          )
        )
      : STRATEGIES.map(() => 0);

    const strategies = STRATEGIES.map((s, i) => ({
      ...s,
      weightPct: (s.targetWeightBps / 100).toFixed(0),
      isDeployed: s.address !== ZERO,
      tvlUsd: strategyTvlFetches[i],
    }));

    return res.status(200).json({
      vaultAddress: EULER_EARN_VAULT_ADDRESS,
      deployed,
      status: deployed ? 'LIVE' : 'PENDING_DEPLOYMENT',
      asset: 'AXUSD',
      assetAddress: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
      tvlUsd: vaultTvlUsd,
      blendedApyBps,
      blendedApyLabel: 'Variable',
      blendedApyPct: (blendedApyBps / 100).toFixed(2),
      perfFeeBps: PERF_FEE_BPS,
      perfFeeRecipient: AXIOM_FEE_BURNER_ADDRESS,
      perfFeeCollectedUsd: null,
      perfFeeNote: 'Performance fees accrue on-chain to AxiomFeeBurner. Indexing available post-deployment via fee recipient balance delta.',
      strategies,
      lastRebalanceAt: lastRebalance,
      ameRegime: ameRegime?.regime ?? null,
      ameConfidence: ameRegime?.confidence ?? null,
      smearingPeriodDays: 14,
      erc3643LpmWhitelist: {
        note: 'Euler Earn Vault must be registered in the ERC-3643 LPM after deployment. Use POST /api/erc3643/whitelist/add-platform with x-admin-key.',
        vaultAddress: EULER_EARN_VAULT_ADDRESS,
        registrationHandledByDeployScript: false,
        registrationEndpoint: '/api/erc3643/whitelist/add-platform',
      },
      deployInstructions: deployed
        ? null
        : 'npx hardhat run scripts/deploy-axusd-euler-earn-vault.js --network arbitrumOne',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
