/**
 * lib/defi/aave/polygonService.ts
 *
 * Read-only Aave v3 market data service — Polygon PoS.
 * Uses AaveProtocolDataProvider on-chain contract.
 * Cache: 60 s in-process. Null-on-failure error policy.
 *
 * NOTE: Supply/borrow figures are in underlying token units, NOT USD.
 * Use supplyApyPct / variableBorrowApyPct for rate-based comparisons.
 */

import { ethers } from 'ethers';

const AAVE_DATA_PROVIDER = '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654';
const POOL_ADDRESS       = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const RAY = BigInt('1000000000000000000000000000');

const DATA_PROVIDER_ABI = [
  'function getReserveData(address asset) view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)',
  'function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)',
];

/**
 * USDC (native) is the primary AXUSD/USDC pairing context on Polygon.
 * AXUSD Polygon deployment is pending; AXUSD_POLYGON_ADDRESS env var can be
 * set to include it once deployed and listed on Aave.
 */
const FOCUS_ASSETS: Record<string, { decimals: number; label: string; axusdContext: boolean }> = {
  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': { decimals: 6,  label: 'USDC',   axusdContext: true  },
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': { decimals: 6,  label: 'USDC.e', axusdContext: true  },
  '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619': { decimals: 18, label: 'WETH',   axusdContext: false },
  '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6': { decimals: 8,  label: 'WBTC',   axusdContext: false },
  '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': { decimals: 18, label: 'WMATIC', axusdContext: false },
};

const AXUSD_POLYGON = (process.env.AXUSD_POLYGON_ADDRESS ?? '').toLowerCase();
if (AXUSD_POLYGON) {
  (FOCUS_ASSETS as Record<string, { decimals: number; label: string; axusdContext: boolean }>)[AXUSD_POLYGON] = {
    decimals: 6, label: 'AXUSD', axusdContext: true,
  };
}

export interface AavePolygonMarketEntry {
  symbol: string;
  tokenAddress: string;
  decimals: number;
  /** Total supply in underlying token units (NOT USD) */
  totalSupplyTokens: number;
  /** Total borrows in underlying token units (NOT USD) */
  totalBorrowsTokens: number;
  /** Available liquidity in underlying token units (NOT USD) */
  availableLiquidityTokens: number;
  utilizationPct: number;
  supplyApyPct: number;
  variableBorrowApyPct: number;
  isActive: boolean;
  isFrozen: boolean;
  borrowingEnabled: boolean;
  ltv: number;
  liquidationThreshold: number;
  /** True if this asset is used as AXUSD collateral/pairing context */
  axusdContext: boolean;
}

export interface AavePolygonMarket {
  protocol: 'aave-v3';
  chain: 'polygon';
  chainId: 137;
  poolAddress: string;
  dataProviderAddress: string;
  markets: AavePolygonMarketEntry[];
  /** Total supply across focus markets in token units (NOT USD) */
  totalTvlTokens: number;
  /** Total borrows across focus markets in token units (NOT USD) */
  totalBorrowsTokens: number;
  axusdContextNote: string;
  fetchedAt: string;
}

function getProvider(): ethers.JsonRpcProvider {
  const url = process.env.POLYGON_RPC_URL ?? 'https://polygon-rpc.com';
  return new ethers.JsonRpcProvider(url);
}

function rayToPercent(ray: bigint): number {
  return Number((ray * 10000n) / RAY) / 100;
}

let _cache: { data: AavePolygonMarket; ts: number } | null = null;
const CACHE_TTL = 60_000;

export async function getAavePolygonMarket(): Promise<AavePolygonMarket | null> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;
  try {
    const provider = getProvider();
    const dp = new ethers.Contract(AAVE_DATA_PROVIDER, DATA_PROVIDER_ABI, provider);

    const focusAddresses = Object.keys(FOCUS_ASSETS);
    const entries = await Promise.all(
      focusAddresses.map(async (addr): Promise<AavePolygonMarketEntry | null> => {
        try {
          const meta = FOCUS_ASSETS[addr];
          const [rd, cfg] = await Promise.all([
            dp.getReserveData(addr),
            dp.getReserveConfigurationData(addr),
          ]);
          const dec         = meta.decimals;
          const totalAToken = Number(ethers.formatUnits(rd.totalAToken, dec));
          const totalBorrow = Number(ethers.formatUnits(BigInt(rd.totalStableDebt) + BigInt(rd.totalVariableDebt), dec));
          const available   = Math.max(0, totalAToken - totalBorrow);
          const utilization = totalAToken > 0 ? (totalBorrow / totalAToken) * 100 : 0;
          const supplyApy   = rayToPercent(BigInt(rd.liquidityRate));
          const varBorrowApy = rayToPercent(BigInt(rd.variableBorrowRate));

          return {
            symbol:                   meta.label,
            tokenAddress:             addr,
            decimals:                 dec,
            totalSupplyTokens:        parseFloat(totalAToken.toFixed(4)),
            totalBorrowsTokens:       parseFloat(totalBorrow.toFixed(4)),
            availableLiquidityTokens: parseFloat(available.toFixed(4)),
            utilizationPct:           parseFloat(utilization.toFixed(2)),
            supplyApyPct:             parseFloat(supplyApy.toFixed(4)),
            variableBorrowApyPct:     parseFloat(varBorrowApy.toFixed(4)),
            isActive:                 cfg.isActive,
            isFrozen:                 cfg.isFrozen,
            borrowingEnabled:         cfg.borrowingEnabled,
            ltv:                      Number(cfg.ltv) / 100,
            liquidationThreshold:     Number(cfg.liquidationThreshold) / 100,
            axusdContext:             meta.axusdContext,
          };
        } catch {
          return null;
        }
      })
    );

    const markets = entries.filter((e): e is AavePolygonMarketEntry => e !== null);
    const result: AavePolygonMarket = {
      protocol: 'aave-v3',
      chain: 'polygon',
      chainId: 137,
      poolAddress: POOL_ADDRESS,
      dataProviderAddress: AAVE_DATA_PROVIDER,
      markets,
      totalTvlTokens:    markets.reduce((s, m) => s + m.totalSupplyTokens, 0),
      totalBorrowsTokens: markets.reduce((s, m) => s + m.totalBorrowsTokens, 0),
      axusdContextNote: 'USDC (native) and USDC.e are the AXUSD pairing context on Polygon. AXUSD Polygon deployment is pending mainnet phase.',
      fetchedAt: new Date().toISOString(),
    };
    _cache = { data: result, ts: Date.now() };
    return result;
  } catch {
    return null;
  }
}
