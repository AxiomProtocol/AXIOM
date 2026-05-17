/**
 * lib/defi/aave/arbitrumService.ts
 *
 * Read-only Aave v3 market data service — Arbitrum One.
 * Uses AaveProtocolDataProvider on-chain contract.
 * Cache: 60 s in-process. Null-on-failure error policy.
 *
 * NOTE: Supply/borrow figures are in underlying token units, NOT USD.
 * Use supplyApyPct / variableBorrowApyPct for rate-based comparisons.
 * User position data from getUserAccountData IS USD-denominated (Aave base unit = 1e8 USD).
 */

import { ethers } from 'ethers';

const AAVE_DATA_PROVIDER = '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654';
const RAY = BigInt('1000000000000000000000000000'); // 1e27

const DATA_PROVIDER_ABI = [
  'function getAllReservesTokens() view returns (tuple(string symbol, address tokenAddress)[])',
  'function getReserveData(address asset) view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)',
  'function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)',
];

const POOL_ABI = [
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
];

const POOL_ADDRESS = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';

/**
 * Focus assets: USDC is the primary AXUSD collateral context.
 * AXUSD itself is an ERC-3643 token and is not listed on Aave;
 * querying it will gracefully return null and be excluded from markets[].
 * AXUSD_ARBITRUM env var can be set to attempt inclusion when/if listed.
 */
const FOCUS_ASSETS: Record<string, { decimals: number; label: string; axusdContext: boolean }> = {
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': { decimals: 6,  label: 'USDC',   axusdContext: true  },
  '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f': { decimals: 8,  label: 'WBTC',   axusdContext: false },
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': { decimals: 18, label: 'WETH',   axusdContext: false },
  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': { decimals: 6,  label: 'USDT',   axusdContext: false },
  '0x5979D7b546E38E414F7E9822514be443A4800529': { decimals: 18, label: 'wstETH', axusdContext: false },
};

const AXUSD_ARBITRUM = (process.env.AXUSD_ARBITRUM_ADDRESS ?? '').toLowerCase();
if (AXUSD_ARBITRUM) {
  (FOCUS_ASSETS as Record<string, { decimals: number; label: string; axusdContext: boolean }>)[AXUSD_ARBITRUM] = {
    decimals: 6, label: 'AXUSD', axusdContext: true,
  };
}

export interface AaveMarketEntry {
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
  /** True if this asset is used as AXUSD collateral context */
  axusdContext: boolean;
}

export interface AaveArbitrumMarket {
  protocol: 'aave-v3';
  chain: 'arbitrum';
  chainId: 42161;
  poolAddress: string;
  dataProviderAddress: string;
  markets: AaveMarketEntry[];
  /** Total supply across all focus markets in token units (NOT USD) */
  totalTvlTokens: number;
  /** Total borrows across all focus markets in token units (NOT USD) */
  totalBorrowsTokens: number;
  axusdContextNote: string;
  fetchedAt: string;
}

export interface AaveUserPosition {
  protocol: 'aave-v3';
  chain: 'arbitrum';
  userAddress: string;
  /** USD value — Aave base unit is 1e8 per dollar */
  totalCollateralUsd: number;
  /** USD value */
  totalDebtUsd: number;
  /** USD value */
  availableBorrowsUsd: number;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: number | null;
  fetchedAt: string;
}

function getProvider(): ethers.JsonRpcProvider {
  const key = process.env.ALCHEMY_API_KEY;
  const url = key
    ? `https://arb-mainnet.g.alchemy.com/v2/${key}`
    : 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(url);
}

function rayToPercent(ray: bigint): number {
  return Number((ray * 10000n) / RAY) / 100;
}

let _cache: { data: AaveArbitrumMarket; ts: number } | null = null;
const CACHE_TTL = 60_000;

export async function getAaveArbitrumMarket(): Promise<AaveArbitrumMarket | null> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;
  try {
    const provider = getProvider();
    const dp = new ethers.Contract(AAVE_DATA_PROVIDER, DATA_PROVIDER_ABI, provider);

    const focusAddresses = Object.keys(FOCUS_ASSETS);

    const entries = await Promise.all(
      focusAddresses.map(async (addr): Promise<AaveMarketEntry | null> => {
        try {
          const meta = FOCUS_ASSETS[addr];
          const [rd, cfg] = await Promise.all([
            dp.getReserveData(addr),
            dp.getReserveConfigurationData(addr),
          ]);
          const dec = meta.decimals;
          const totalAToken  = Number(ethers.formatUnits(rd.totalAToken, dec));
          const totalBorrow  = Number(ethers.formatUnits(BigInt(rd.totalStableDebt) + BigInt(rd.totalVariableDebt), dec));
          const available    = Math.max(0, totalAToken - totalBorrow);
          const supplyApy    = rayToPercent(BigInt(rd.liquidityRate));
          const varBorrowApy = rayToPercent(BigInt(rd.variableBorrowRate));
          const utilization  = totalAToken > 0 ? (totalBorrow / totalAToken) * 100 : 0;

          return {
            symbol:                    meta.label,
            tokenAddress:              addr,
            decimals:                  dec,
            totalSupplyTokens:         parseFloat(totalAToken.toFixed(4)),
            totalBorrowsTokens:        parseFloat(totalBorrow.toFixed(4)),
            availableLiquidityTokens:  parseFloat(available.toFixed(4)),
            utilizationPct:            parseFloat(utilization.toFixed(2)),
            supplyApyPct:              parseFloat(supplyApy.toFixed(4)),
            variableBorrowApyPct:      parseFloat(varBorrowApy.toFixed(4)),
            isActive:                  cfg.isActive,
            isFrozen:                  cfg.isFrozen,
            borrowingEnabled:          cfg.borrowingEnabled,
            ltv:                       Number(cfg.ltv) / 100,
            liquidationThreshold:      Number(cfg.liquidationThreshold) / 100,
            axusdContext:              meta.axusdContext,
          };
        } catch {
          return null;
        }
      })
    );

    const markets = entries.filter((e): e is AaveMarketEntry => e !== null);
    const totalTvlTokens    = markets.reduce((s, m) => s + m.totalSupplyTokens, 0);
    const totalBorrowsTokens = markets.reduce((s, m) => s + m.totalBorrowsTokens, 0);

    const result: AaveArbitrumMarket = {
      protocol: 'aave-v3',
      chain: 'arbitrum',
      chainId: 42161,
      poolAddress: POOL_ADDRESS,
      dataProviderAddress: AAVE_DATA_PROVIDER,
      markets,
      totalTvlTokens,
      totalBorrowsTokens,
      axusdContextNote: 'USDC is the primary AXUSD collateral context on Aave v3 Arbitrum. AXUSD (ERC-3643) is not currently listed as an Aave reserve.',
      fetchedAt: new Date().toISOString(),
    };
    _cache = { data: result, ts: Date.now() };
    return result;
  } catch {
    return null;
  }
}

let _userCache: Map<string, { data: AaveUserPosition; ts: number }> = new Map();

export async function getAaveArbitrumUserPosition(userAddress: string): Promise<AaveUserPosition | null> {
  const cacheKey = userAddress.toLowerCase();
  const cached = _userCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  try {
    const provider = getProvider();
    const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);
    const data = await pool.getUserAccountData(userAddress);

    // getUserAccountData returns values in USD with 8 decimal precision (Aave base unit)
    const BASE_DECIMALS = 8;
    const collateralUsd = parseFloat(ethers.formatUnits(data.totalCollateralBase, BASE_DECIMALS));
    const debtUsd       = parseFloat(ethers.formatUnits(data.totalDebtBase, BASE_DECIMALS));
    const availableUsd  = parseFloat(ethers.formatUnits(data.availableBorrowsBase, BASE_DECIMALS));
    const hfRaw = BigInt(data.healthFactor);
    const hf    = hfRaw === ethers.MaxUint256 ? null : parseFloat(ethers.formatEther(hfRaw));

    const result: AaveUserPosition = {
      protocol: 'aave-v3',
      chain: 'arbitrum',
      userAddress,
      totalCollateralUsd: collateralUsd,
      totalDebtUsd: debtUsd,
      availableBorrowsUsd: availableUsd,
      currentLiquidationThreshold: Number(data.currentLiquidationThreshold) / 100,
      ltv: Number(data.ltv) / 100,
      healthFactor: hf,
      fetchedAt: new Date().toISOString(),
    };
    _userCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch {
    return null;
  }
}
