/**
 * lib/defi/uniswap/polygonService.ts
 *
 * Read-only Uniswap v3 pool data service — Polygon PoS.
 * Queries pool contracts directly via Polygon RPC.
 * Cache: 60 s in-process. Null-on-failure error policy.
 */

import { ethers } from 'ethers';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

const POOL_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
];

interface PoolConfig {
  address: string;
  label: string;
  token0Symbol: string;
  token0Decimals: number;
  token1Symbol: string;
  token1Decimals: number;
  feeBps: number;
}

const KNOWN_POOLS: PoolConfig[] = [
  {
    address: '0x45dDa9cb7c25131DF268515131f647d726f50608',
    label: 'USDC / WETH',
    token0Symbol: 'USDC',
    token0Decimals: 6,
    token1Symbol: 'WETH',
    token1Decimals: 18,
    feeBps: 5,
  },
  {
    address: '0xA374094527e1673A86de625aa59517c5dE346d32',
    label: 'USDC / WMATIC',
    token0Symbol: 'USDC',
    token0Decimals: 6,
    token1Symbol: 'WMATIC',
    token1Decimals: 18,
    feeBps: 5,
  },
  {
    address: '0x50eaEDB835021E4A108B7290636d62E9765cc6d7',
    label: 'WBTC / WETH',
    token0Symbol: 'WBTC',
    token0Decimals: 8,
    token1Symbol: 'WETH',
    token1Decimals: 18,
    feeBps: 5,
  },
  {
    address: '0x167384319B41F7094e62f7506409Eb38079AbfF8',
    label: 'WMATIC / USDC',
    token0Symbol: 'WMATIC',
    token0Decimals: 18,
    token1Symbol: 'USDC',
    token1Decimals: 6,
    feeBps: 30,
  },
];

export interface UniswapV3PolygonPool {
  poolAddress: string;
  label: string;
  token0Symbol: string;
  token1Symbol: string;
  feeBps: number;
  token0Balance: number;
  token1Balance: number;
  tvlUsd: number | null;
  liquidityRaw: string;
  status: 'live' | 'error';
}

export interface UniswapV3PolygonPools {
  protocol: 'uniswap-v3';
  chain: 'polygon';
  chainId: 137;
  factoryAddress: string;
  pools: UniswapV3PolygonPool[];
  totalPoolsQueried: number;
  fetchedAt: string;
}

function getProvider(): ethers.JsonRpcProvider {
  const url = process.env.POLYGON_RPC_URL ?? 'https://polygon-rpc.com';
  return new ethers.JsonRpcProvider(url);
}

let _cache: { data: UniswapV3PolygonPools; ts: number } | null = null;
const CACHE_TTL = 60_000;

export async function getUniswapV3PolygonPools(): Promise<UniswapV3PolygonPools | null> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;
  try {
    const provider = getProvider();
    const pools = await Promise.all(
      KNOWN_POOLS.map(async (cfg): Promise<UniswapV3PolygonPool> => {
        try {
          const pool = new ethers.Contract(cfg.address, POOL_ABI, provider);
          const [token0Addr, token1Addr, liquidity] = await Promise.all([
            pool.token0(),
            pool.token1(),
            pool.liquidity(),
          ]);

          const t0 = new ethers.Contract(token0Addr, ERC20_ABI, provider);
          const t1 = new ethers.Contract(token1Addr, ERC20_ABI, provider);
          const [bal0, bal1] = await Promise.all([
            t0.balanceOf(cfg.address),
            t1.balanceOf(cfg.address),
          ]);

          const b0 = parseFloat(ethers.formatUnits(bal0, cfg.token0Decimals));
          const b1 = parseFloat(ethers.formatUnits(bal1, cfg.token1Decimals));

          const isStableBase  = cfg.token0Symbol === 'USDC' || cfg.token0Symbol === 'USDT';
          const isStableQuote = cfg.token1Symbol === 'USDC' || cfg.token1Symbol === 'USDT';
          let tvlUsd: number | null = null;
          if (isStableBase && isStableQuote) {
            tvlUsd = b0 + b1;
          } else if (isStableBase) {
            tvlUsd = b0 * 2;
          } else if (isStableQuote) {
            tvlUsd = b1 * 2;
          }

          return {
            poolAddress: cfg.address,
            label: cfg.label,
            token0Symbol: cfg.token0Symbol,
            token1Symbol: cfg.token1Symbol,
            feeBps: cfg.feeBps,
            token0Balance: parseFloat(b0.toFixed(4)),
            token1Balance: parseFloat(b1.toFixed(4)),
            tvlUsd: tvlUsd !== null ? parseFloat(tvlUsd.toFixed(2)) : null,
            liquidityRaw: liquidity.toString(),
            status: 'live',
          };
        } catch {
          return {
            poolAddress: cfg.address,
            label: cfg.label,
            token0Symbol: cfg.token0Symbol,
            token1Symbol: cfg.token1Symbol,
            feeBps: cfg.feeBps,
            token0Balance: 0,
            token1Balance: 0,
            tvlUsd: null,
            liquidityRaw: '0',
            status: 'error',
          };
        }
      })
    );

    const result: UniswapV3PolygonPools = {
      protocol: 'uniswap-v3',
      chain: 'polygon',
      chainId: 137,
      factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      pools,
      totalPoolsQueried: pools.length,
      fetchedAt: new Date().toISOString(),
    };
    _cache = { data: result, ts: Date.now() };
    return result;
  } catch {
    return null;
  }
}
