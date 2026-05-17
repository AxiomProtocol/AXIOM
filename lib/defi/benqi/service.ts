/**
 * lib/defi/benqi/service.ts
 *
 * Read-only Benqi Finance market data service — Avalanche C-Chain.
 * Queries CToken contracts directly via Avalanche public RPC.
 * Cache: 60 s in-process. Null-on-failure error policy.
 */

import { ethers } from 'ethers';

const AVAX_RPC = 'https://api.avax.network/ext/bc/C/rpc';
const SECONDS_PER_YEAR = 31_536_000;

const CTOKEN_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function exchangeRateCurrent() view returns (uint256)',
  'function supplyRatePerTimestamp() view returns (uint256)',
  'function borrowRatePerTimestamp() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function getCash() view returns (uint256)',
  'function underlying() view returns (address)',
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

interface QiTokenConfig {
  address: string;
  label: string;
  underlyingDecimals: number;
  isNative?: boolean;
}

const QI_TOKENS: QiTokenConfig[] = [
  {
    address: '0xBEb5d47A3f720Ec0a390d04b4d41ED7d9688bC7F',
    label: 'USDC.e',
    underlyingDecimals: 6,
  },
  {
    address: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
    label: 'USDT.e',
    underlyingDecimals: 6,
  },
  {
    address: '0x5C0401e81Bc07Ca70fAD469b0c89aE18A82eef96',
    label: 'AVAX',
    underlyingDecimals: 18,
    isNative: true,
  },
  {
    address: '0xe194c4c5aC32a3C9ffDb358d9Bfd523a0B6d1568',
    label: 'WBTC.e',
    underlyingDecimals: 8,
  },
  {
    address: '0x334AD834Cd4481BB02d09615E7c11a352914004D',
    label: 'WETH.e',
    underlyingDecimals: 18,
  },
];

export interface BenqiMarketEntry {
  symbol: string;
  qiTokenAddress: string;
  underlyingDecimals: number;
  totalSupplyUnderlying: number;
  totalBorrowsUnderlying: number;
  availableLiquidityUnderlying: number;
  utilizationPct: number;
  supplyApyPct: number;
  borrowApyPct: number;
}

export interface BenqiMarket {
  protocol: 'benqi';
  chain: 'avalanche';
  chainId: 43114;
  markets: BenqiMarketEntry[];
  totalMarketsCount: number;
  fetchedAt: string;
}

function rateToApy(ratePerTimestamp: bigint): number {
  const rateNum = Number(ratePerTimestamp) / 1e18;
  return (Math.pow(1 + rateNum * SECONDS_PER_YEAR, 1) - 1) * 100;
}

let _cache: { data: BenqiMarket; ts: number } | null = null;
const CACHE_TTL = 60_000;

export async function getBenqiMarket(): Promise<BenqiMarket | null> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;
  try {
    const provider = new ethers.JsonRpcProvider(AVAX_RPC);

    const entries = await Promise.all(
      QI_TOKENS.map(async (cfg): Promise<BenqiMarketEntry | null> => {
        try {
          const ct = new ethers.Contract(cfg.address, CTOKEN_ABI, provider);
          const [supplyRate, borrowRate, totalSupply, totalBorrows, cash, exchangeRate] =
            await Promise.all([
              ct.supplyRatePerTimestamp(),
              ct.borrowRatePerTimestamp(),
              ct.totalSupply(),
              ct.totalBorrows(),
              ct.getCash(),
              ct.exchangeRateCurrent(),
            ]);

          const mantissa = 18 + cfg.underlyingDecimals - 8;
          const exchRate = Number(ethers.formatUnits(exchangeRate, mantissa));
          const supply8Dec = Number(ethers.formatUnits(totalSupply, 8));
          const totalSupplyUnderlying = supply8Dec * exchRate;
          const totalBorrowsUnderlying = Number(ethers.formatUnits(totalBorrows, cfg.underlyingDecimals));
          const cashUnderlying = Number(ethers.formatUnits(cash, cfg.underlyingDecimals));
          const utilization = totalSupplyUnderlying > 0
            ? (totalBorrowsUnderlying / totalSupplyUnderlying) * 100
            : 0;

          return {
            symbol: cfg.label,
            qiTokenAddress: cfg.address,
            underlyingDecimals: cfg.underlyingDecimals,
            totalSupplyUnderlying:      parseFloat(totalSupplyUnderlying.toFixed(4)),
            totalBorrowsUnderlying:     parseFloat(totalBorrowsUnderlying.toFixed(4)),
            availableLiquidityUnderlying: parseFloat(cashUnderlying.toFixed(4)),
            utilizationPct:             parseFloat(utilization.toFixed(2)),
            supplyApyPct:               parseFloat(rateToApy(BigInt(supplyRate)).toFixed(4)),
            borrowApyPct:               parseFloat(rateToApy(BigInt(borrowRate)).toFixed(4)),
          };
        } catch {
          return null;
        }
      })
    );

    const markets = entries.filter((e): e is BenqiMarketEntry => e !== null);
    const result: BenqiMarket = {
      protocol: 'benqi',
      chain: 'avalanche',
      chainId: 43114,
      markets,
      totalMarketsCount: markets.length,
      fetchedAt: new Date().toISOString(),
    };
    _cache = { data: result, ts: Date.now() };
    return result;
  } catch {
    return null;
  }
}
