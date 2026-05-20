import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ACTIVE_AXUSD, CANONICAL_PSM } from '../../../src/config/activeContracts.generated';
import { AXUSD_USD_PEG_ADAPTER } from '../../../src/config/oracleConfig';
import { STABLECOINS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = [
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
];

type ReserveStatus = 'live' | 'planned' | 'internal';

interface ReserveData {
  timestamp: string;
  totalSupply: string;
  reserves: {
    usdc: { amount: string; percentage: number; source: string; status: ReserveStatus };
    tbills: {
      amount: string;
      percentage: number;
      status: ReserveStatus;
      assets: Array<{ name: string; amount: string; status: ReserveStatus }>;
    };
    other: { amount: string; percentage: number; source: string; status: ReserveStatus };
  };
  totalReserves: string;
  reserveRatio: number;
  isFullyBacked: boolean;
  compliance: {
    geniusActCompliant: boolean;
    lastDisclosure: string;
    nextDisclosureDue: string;
    yieldDistributionBlocked: boolean;
    auditorAttestation?: string;
  };
  contracts: Record<string, string>;
  labels: {
    live: string;
    planned: string;
    internal: string;
    operatorOnly: string;
    notPublicProduct: string;
  };
  disclaimer: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const axusd = new ethers.Contract(ACTIVE_AXUSD, ERC20_ABI, provider);
    const usdc = new ethers.Contract(STABLECOINS.USDC, ERC20_ABI, provider);

    const [totalSupplyRaw, canonicalUsdcRaw] = await Promise.all([
      axusd.totalSupply(),
      usdc.balanceOf(CANONICAL_PSM),
    ]);

    const totalSupply = parseFloat(ethers.formatUnits(totalSupplyRaw, 18));
    const canonicalUsdc = parseFloat(ethers.formatUnits(canonicalUsdcRaw, 6));
    const reserveRatio = totalSupply > 0 ? (canonicalUsdc / totalSupply) * 100 : 100;
    const isFullyBacked = reserveRatio >= 100;
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const data: ReserveData = {
      timestamp: now.toISOString(),
      totalSupply: totalSupply.toFixed(2),
      reserves: {
        usdc: {
          amount: canonicalUsdc.toFixed(6),
          percentage: canonicalUsdc > 0 ? 100 : 0,
          source: 'Canonical PSM (live USDC mint/redeem backing)',
          status: 'live',
        },
        tbills: {
          amount: '0.00',
          percentage: 0,
          status: 'planned',
          assets: [
            { name: 'Tokenized Treasury reserve sleeves', amount: '0.00', status: 'planned' },
            { name: 'T-Bill / RWA valuation adapters', amount: '0.00', status: 'planned' },
          ],
        },
        other: {
          amount: '0.00',
          percentage: 0,
          source: 'Excluded from the live canonical reserve snapshot until explicitly deployed and disclosed',
          status: 'internal',
        },
      },
      totalReserves: canonicalUsdc.toFixed(6),
      reserveRatio,
      isFullyBacked,
      compliance: {
        geniusActCompliant: false,
        lastDisclosure: now.toISOString(),
        nextDisclosureDue: nextMonth.toISOString(),
        yieldDistributionBlocked: true,
      },
      contracts: {
        axusd: ACTIVE_AXUSD,
        psm: CANONICAL_PSM,
        axusdUsdPegAdapter: AXUSD_USD_PEG_ADAPTER,
      },
      labels: {
        live: 'Live',
        planned: 'Planned',
        internal: 'Internal',
        operatorOnly: 'Operator-only',
        notPublicProduct: 'Not public investment product',
      },
      disclaimer: 'AXUSD is a compliance-native stable settlement asset. Live minting and redemption are sourced from the canonical USDC-backed PSM. Tokenized Treasury reserve sleeves are planned infrastructure and are not live unless explicitly deployed, verified, and disclosed. AxiomTreasuryVault is internal operator capital management infrastructure and is not the AXUSD reserve controller.',
    };

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('[axusd/reserves] error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch AXUSD reserve data',
      details: error.message,
    });
  }
}
