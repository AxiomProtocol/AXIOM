/**
 * lib/defi/uniswap/polygonService.ts
 *
 * Read-only Uniswap v3 pool data service — Polygon PoS.
 * Uses Uniswap v3 subgraph via TheGraph for AXUSD/USDC and USDC/POL pairs.
 * Cache: 60 s in-process. Null-on-failure error policy.
 */

const SUBGRAPH_URL =
  'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-polygon';

const USDC_NATIVE    = '0x3c499c542ceF5E3811e1192ce70d8cC03d5c3359'.toLowerCase();
const USDC_BRIDGED   = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'.toLowerCase();
const WMATIC_POL     = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'.toLowerCase();
const POL_TOKEN      = '0x455e53cbb86018ac2b8092fdcd39d8444affc3f6'.toLowerCase();
const AXUSD_POLYGON  = (process.env.POLYGON_AXUSD_ADDRESS ?? '').toLowerCase();

const POOL_QUERY = `
  query topPools($tokens: [String!]!) {
    pools(
      first: 50
      orderBy: totalValueLockedUSD
      orderDirection: desc
      where: { token0_in: $tokens, token1_in: $tokens }
    ) {
      id
      feeTier
      totalValueLockedUSD
      volumeUSD
      txCount
      token0 { id symbol decimals }
      token1 { id symbol decimals }
      token0Price
      token1Price
    }
  }
`;

const USDC_TOKEN0_QUERY = `
  query usdcPools($usdc: String!) {
    token0Pools: pools(
      first: 20
      orderBy: totalValueLockedUSD
      orderDirection: desc
      where: { token0: $usdc }
    ) {
      id
      feeTier
      totalValueLockedUSD
      volumeUSD
      txCount
      token0 { id symbol decimals }
      token1 { id symbol decimals }
      token0Price
      token1Price
    }
    token1Pools: pools(
      first: 20
      orderBy: totalValueLockedUSD
      orderDirection: desc
      where: { token1: $usdc }
    ) {
      id
      feeTier
      totalValueLockedUSD
      volumeUSD
      txCount
      token0 { id symbol decimals }
      token1 { id symbol decimals }
      token0Price
      token1Price
    }
  }
`;

export interface UniswapV3Pool {
  poolAddress: string;
  token0: { address: string; symbol: string; decimals: number };
  token1: { address: string; symbol: string; decimals: number };
  feeTier: number;
  feeBps: number;
  tvlUsd: number;
  volumeAllTimeUsd: number;
  txCount: number;
  token0Price: number;
  token1Price: number;
  pairLabel: string;
  category: 'axusd_usdc' | 'usdc_pol' | 'usdc_other';
}

export interface UniswapV3PolygonPools {
  protocol: 'uniswap-v3';
  chain: 'polygon';
  chainId: 137;
  factoryAddress: string;
  subgraphUrl: string;
  pools: UniswapV3Pool[];
  axusdPools: UniswapV3Pool[];
  usdcPolPools: UniswapV3Pool[];
  totalTvlUsd: number;
  fetchedAt: string;
  axusdDeployed: boolean;
}

interface RawPool {
  id: string;
  feeTier: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
  txCount: string;
  token0: { id: string; symbol: string; decimals: string };
  token1: { id: string; symbol: string; decimals: string };
  token0Price: string;
  token1Price: string;
}

function classifyPool(
  t0: string,
  t1: string,
): 'axusd_usdc' | 'usdc_pol' | 'usdc_other' {
  const isAxusd  = t0 === AXUSD_POLYGON || t1 === AXUSD_POLYGON;
  const isUsdc   = t0 === USDC_NATIVE || t0 === USDC_BRIDGED || t1 === USDC_NATIVE || t1 === USDC_BRIDGED;
  const isPol    = t0 === WMATIC_POL || t0 === POL_TOKEN || t1 === WMATIC_POL || t1 === POL_TOKEN;
  if (isAxusd && isUsdc) return 'axusd_usdc';
  if (isUsdc && isPol) return 'usdc_pol';
  return 'usdc_other';
}

function normalizePool(raw: RawPool): UniswapV3Pool {
  const t0addr = raw.token0.id.toLowerCase();
  const t1addr = raw.token1.id.toLowerCase();
  const feeTier = parseInt(raw.feeTier, 10);
  return {
    poolAddress: raw.id,
    token0: {
      address: raw.token0.id,
      symbol: raw.token0.symbol,
      decimals: parseInt(raw.token0.decimals, 10),
    },
    token1: {
      address: raw.token1.id,
      symbol: raw.token1.symbol,
      decimals: parseInt(raw.token1.decimals, 10),
    },
    feeTier,
    feeBps: feeTier / 100,
    tvlUsd:              parseFloat(parseFloat(raw.totalValueLockedUSD).toFixed(2)),
    volumeAllTimeUsd:    parseFloat(parseFloat(raw.volumeUSD).toFixed(2)),
    txCount:             parseInt(raw.txCount, 10),
    token0Price:         parseFloat(raw.token0Price),
    token1Price:         parseFloat(raw.token1Price),
    pairLabel:           `${raw.token0.symbol} / ${raw.token1.symbol}`,
    category:            classifyPool(t0addr, t1addr),
  };
}

async function subgraphFetch<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  const json = await res.json() as { data?: T; errors?: unknown[] };
  if (json.errors?.length) return null;
  return json.data ?? null;
}

let _cache: { data: UniswapV3PolygonPools; ts: number } | null = null;
const CACHE_TTL = 60_000;

export async function getUniswapV3PolygonPools(): Promise<UniswapV3PolygonPools | null> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;
  try {
    const targetTokens = [
      USDC_NATIVE, USDC_BRIDGED, WMATIC_POL, POL_TOKEN,
      ...(AXUSD_POLYGON ? [AXUSD_POLYGON] : []),
    ];

    const [mainData, usdcData] = await Promise.all([
      AXUSD_POLYGON
        ? subgraphFetch<{ pools: RawPool[] }>(POOL_QUERY, { tokens: [AXUSD_POLYGON, USDC_NATIVE, USDC_BRIDGED] })
        : Promise.resolve(null),
      subgraphFetch<{ token0Pools: RawPool[]; token1Pools: RawPool[] }>(USDC_TOKEN0_QUERY, { usdc: USDC_NATIVE }),
    ]);

    const seen = new Set<string>();
    const allRaw: RawPool[] = [];

    if (mainData?.pools) {
      for (const p of mainData.pools) { if (!seen.has(p.id)) { seen.add(p.id); allRaw.push(p); } }
    }
    if (usdcData?.token0Pools) {
      for (const p of usdcData.token0Pools) { if (!seen.has(p.id)) { seen.add(p.id); allRaw.push(p); } }
    }
    if (usdcData?.token1Pools) {
      for (const p of usdcData.token1Pools) { if (!seen.has(p.id)) { seen.add(p.id); allRaw.push(p); } }
    }

    const pools: UniswapV3Pool[] = allRaw
      .map(normalizePool)
      .sort((a, b) => b.tvlUsd - a.tvlUsd);

    const axusdPools  = pools.filter(p => p.category === 'axusd_usdc');
    const usdcPolPools = pools.filter(p => p.category === 'usdc_pol');
    const topPools    = pools.slice(0, 20);

    const result: UniswapV3PolygonPools = {
      protocol: 'uniswap-v3',
      chain: 'polygon',
      chainId: 137,
      factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      subgraphUrl: SUBGRAPH_URL,
      pools: topPools,
      axusdPools,
      usdcPolPools,
      totalTvlUsd: topPools.reduce((s, p) => s + p.tvlUsd, 0),
      fetchedAt: new Date().toISOString(),
      axusdDeployed: !!AXUSD_POLYGON && axusdPools.length > 0,
    };
    _cache = { data: result, ts: Date.now() };
    return result;
  } catch {
    return null;
  }
}
