/**
 * lib/defi/aave/arbitrumService.ts
 *
 * Read-only Aave v3 market data service — Arbitrum One.
 * Uses AaveProtocolDataProvider on-chain contract.
 * Cache: 60 s in-process. Null-on-failure error policy.
 */

import { ethers } from 'ethers';

const AAVE_DATA_PROVIDER = '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654';
const RAY = BigInt('1000000000000000000000000000'); // 1e27

const DATA_PROVIDER_ABI = [
  'function getAllReservesTokens() view returns (tuple(string symbol, address tokenAddress)[])',
  'function getReserveData(address asset) view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)',
  'function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)',
];

const USER_DATA_PROVIDER_ABI = [
  'function getUserReservesData(address provider, address user) view returns (tuple(address underlyingAsset, uint256 scaledATokenBalance, bool usageAsCollateralEnabledOnUser, uint256 stableBorrowRate, uint256 scaledVariableDebt, uint256 principalStableDebt, uint256 stableBorrowLastUpdateTimestamp)[], uint8 userEmodeCategoryId)',
];

const POOL_ABI = [
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
];

const POOL_ADDRESS = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const UI_POOL_DATA_PROVIDER = '0x145dE30c929a065582da84Cf96F88460dB9C4b9a';

const FOCUS_ASSETS: Record<string, { decimals: number; label: string }> = {
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': { decimals: 6,  label: 'USDC'  },
  '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f': { decimals: 8,  label: 'WBTC'  },
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': { decimals: 18, label: 'WETH'  },
  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': { decimals: 6,  label: 'USDT'  },
  '0x5979D7b546E38E414F7E9822514be443A4800529': { decimals: 18, label: 'wstETH' },
};

export interface AaveMarketEntry {
  symbol: string;
  tokenAddress: string;
  decimals: number;
  totalSupplyUsd: number;
  totalBorrowsUsd: number;
  availableLiquidityUsd: number;
  utilizationPct: number;
  supplyApyPct: number;
  variableBorrowApyPct: number;
  isActive: boolean;
  isFrozen: boolean;
  borrowingEnabled: boolean;
  ltv: number;
  liquidationThreshold: number;
}

export interface AaveArbitrumMarket {
  protocol: 'aave-v3';
  chain: 'arbitrum';
  chainId: 42161;
  poolAddress: string;
  dataProviderAddress: string;
  markets: AaveMarketEntry[];
  totalTvlUsd: number;
  totalBorrowsUsd: number;
  fetchedAt: string;
}

export interface AaveUserPosition {
  protocol: 'aave-v3';
  chain: 'arbitrum';
  userAddress: string;
  totalCollateralUsd: number;
  totalDebtUsd: number;
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
          const scale = 10 ** dec;
          const totalAToken = Number(ethers.formatUnits(rd.totalAToken, dec));
          const totalBorrow  = Number(ethers.formatUnits(BigInt(rd.totalStableDebt) + BigInt(rd.totalVariableDebt), dec));
          const available   = Math.max(0, totalAToken - totalBorrow);
          const supplyApy   = rayToPercent(BigInt(rd.liquidityRate));
          const varBorrowApy = rayToPercent(BigInt(rd.variableBorrowRate));
          const utilization = totalAToken > 0 ? (totalBorrow / totalAToken) * 100 : 0;

          const totalATokenUsd   = totalAToken;
          const totalBorrowUsd   = totalBorrow;
          const availableUsd     = available;

          return {
            symbol: meta.label,
            tokenAddress: addr,
            decimals: dec,
            totalSupplyUsd:         parseFloat(totalATokenUsd.toFixed(4)),
            totalBorrowsUsd:        parseFloat(totalBorrowUsd.toFixed(4)),
            availableLiquidityUsd:  parseFloat(availableUsd.toFixed(4)),
            utilizationPct:         parseFloat(utilization.toFixed(2)),
            supplyApyPct:           parseFloat(supplyApy.toFixed(4)),
            variableBorrowApyPct:   parseFloat(varBorrowApy.toFixed(4)),
            isActive:               cfg.isActive,
            isFrozen:               cfg.isFrozen,
            borrowingEnabled:       cfg.borrowingEnabled,
            ltv:                    Number(cfg.ltv) / 100,
            liquidationThreshold:   Number(cfg.liquidationThreshold) / 100,
          };
        } catch {
          return null;
        }
      })
    );

    const markets = entries.filter((e): e is AaveMarketEntry => e !== null);
    const totalTvlUsd    = markets.reduce((s, m) => s + m.totalSupplyUsd, 0);
    const totalBorrowsUsd = markets.reduce((s, m) => s + m.totalBorrowsUsd, 0);

    const result: AaveArbitrumMarket = {
      protocol: 'aave-v3',
      chain: 'arbitrum',
      chainId: 42161,
      poolAddress: POOL_ADDRESS,
      dataProviderAddress: AAVE_DATA_PROVIDER,
      markets,
      totalTvlUsd,
      totalBorrowsUsd,
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
