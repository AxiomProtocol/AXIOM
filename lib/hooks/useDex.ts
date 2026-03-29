// Fix 3 (regression) + Fix 6 (dead code) + Fix 7 (pool mapping)
// - DEX_V2_CONTRACTS removed — those contracts are not deployed; it was dead exported code
// - useDexPools now maps real token addresses (from lib/tokens.ts) and real reserves from API
// - useUserRewards returns a typed TradingRewardsData object + available flag (not a raw string)

import { useState, useEffect, useCallback } from 'react';
import { getAddressBySymbol } from '../tokens';

export interface Pool {
  id: number;
  tokenA: string;
  tokenB: string;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  protocol?: string;
  reserveA: string;
  reserveB: string;
  totalLiquidity: string;
  swapFee: number;
  isActive: boolean;
  pairAddress?: string;
}

export interface SwapQuote {
  amountOut: string;
  priceImpact: number;
  fee: string;
  route: string[];
}

export interface UserLiquidity {
  poolId: number;
  pairAddress?: string;
  tokenA?: string;
  tokenB?: string;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  liquidity: string;
  lpTokenBalance?: string;
  sharePercent: number;
  tvl?: number;
}

export interface DexStats {
  totalPools: number;
  totalTVL: string;
  totalVolume24h: string;
  totalFees24h: string;
}

// Fix 1 (regression): typed rewards object replaces the bare string that caused NaN
export interface TradingRewardsData {
  earned: string;
  claimable: string;
  claimed: string;
}

// Typed shape of a single pool entry returned by /api/dex/pools → eulerSwap[]
interface EulerSwapPoolAPIEntry {
  tokenASymbol?: string;
  tokenBSymbol?: string;
  tokenAAddress?: string;
  tokenBAddress?: string;
  protocol?: string;
  reserveA?: number | string;
  reserveB?: number | string;
  tvl?: number | string;
  feeBps?: number;
  status?: string;
  poolAddress?: string;
}

export function useDexPools() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dex/pools');
      if (!response.ok) throw new Error(`Pool data unavailable (${response.status})`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const rawPools = data.pools;
      if (Array.isArray(rawPools)) {
        setPools(rawPools);
      } else if (rawPools && typeof rawPools === 'object') {
        // Fix 3: tokenA/tokenB were wrongly set to poolAddress/''; map to real token addresses
        const eulerSwapPools: Pool[] = (rawPools.eulerSwap || []).map((p: EulerSwapPoolAPIEntry, idx: number) => ({
          id: idx + 1,
          tokenA: getAddressBySymbol(p.tokenASymbol) || p.tokenAAddress || '',
          tokenB: getAddressBySymbol(p.tokenBSymbol) || p.tokenBAddress || '',
          tokenASymbol: p.tokenASymbol || 'Token A',
          tokenBSymbol: p.tokenBSymbol || 'Token B',
          protocol: p.protocol || 'EulerSwap',
          // Fix 3: reserveA/reserveB were always '0'; now use real on-chain values from API
          reserveA: p.reserveA !== undefined ? String(p.reserveA) : '0',
          reserveB: p.reserveB !== undefined ? String(p.reserveB) : '0',
          totalLiquidity: String(p.tvl || 0),
          swapFee: p.feeBps || 0,
          isActive: p.status === 'ACTIVE',
          pairAddress: p.poolAddress || '',
        }));
        setPools(eulerSwapPools);
      } else {
        setPools([]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pools');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return { pools, loading, error, refetch: fetchPools };
}

export function useDexStats() {
  const [stats, setStats] = useState<DexStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dex/stats');
      if (!response.ok) throw new Error(`Stats unavailable (${response.status})`);
      const data = await response.json();

      if (data.error && !data.totalPools) {
        throw new Error(data.error);
      }

      setStats({
        totalPools: data.totalPools || 0,
        totalTVL: data.totalTVL || '0',
        totalVolume24h: data.totalVolume24h || '0',
        totalFees24h: data.totalFees24h || '0',
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

export function useSwapQuote(tokenIn: string, tokenOut: string, amountIn: string) {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
      setQuote(null);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({ tokenIn, tokenOut, amountIn });
      const response = await fetch(`/api/dex/quote?${params}`);
      if (!response.ok) throw new Error(`Quote unavailable (${response.status})`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setQuote(data.quote);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [tokenIn, tokenOut, amountIn]);

  useEffect(() => {
    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [fetchQuote]);

  return { quote, loading, error };
}

export function useUserLiquidity(address: string | undefined) {
  const [positions, setPositions] = useState<UserLiquidity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!address) {
      setPositions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/dex/user/liquidity?address=${address}`);
      if (!response.ok) throw new Error(`Liquidity data unavailable (${response.status})`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPositions(data.positions || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return { positions, loading, error, refetch: fetchPositions };
}

// Fix 1 (regression): returns typed TradingRewardsData + available flag.
// The API now returns tradingRewards as { earned, claimable, claimed } — not a string.
// Old code: setTradingRewards(data.tradingRewards || '0') → caused parseFloat(object) = NaN
export function useUserRewards(address: string | undefined) {
  const EMPTY: TradingRewardsData = { earned: '0', claimable: '0', claimed: '0' };
  const [rewards, setRewards] = useState<TradingRewardsData>(EMPTY);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    if (!address) {
      setRewards(EMPTY);
      setAvailable(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/dex/user/rewards?address=${address}`);
      if (!response.ok) throw new Error(`Rewards data unavailable (${response.status})`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const tr = data.tradingRewards;
      setRewards(
        tr && typeof tr === 'object'
          ? { earned: tr.earned ?? '0', claimable: tr.claimable ?? '0', claimed: tr.claimed ?? '0' }
          : EMPTY,
      );
      setAvailable(data.available === true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rewards');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return { rewards, available, loading, error, refetch: fetchRewards };
}

export function useUserLimitOrders(address: string | undefined) {
  const [orders, setOrders] = useState<any[]>([]);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!address) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/dex/user/orders?address=${address}`);
      if (!response.ok) throw new Error(`Orders data unavailable (${response.status})`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setOrders(data.orders || []);
      setAvailable(data.available === true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, available, loading, error, refetch: fetchOrders };
}

export function useTokenPrice(tokenAddress: string | undefined) {
  const [price, setPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!tokenAddress) {
      setPrice(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/dex/price?token=${tokenAddress}`);
      if (!response.ok) throw new Error(`Price data unavailable (${response.status})`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPrice(data.price);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
    } finally {
      setLoading(false);
    }
  }, [tokenAddress]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  return { price, loading, error, refetch: fetchPrice };
}
