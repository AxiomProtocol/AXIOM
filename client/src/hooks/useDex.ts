import { useState, useEffect, useCallback } from 'react';
import { DEX_V2_CONTRACTS } from '../config/contracts';

export interface Pool {
  id: number;
  tokenA: string;
  tokenB: string;
  reserveA: string;
  reserveB: string;
  totalLiquidity: string;
  swapFee: number;
  isActive: boolean;
}

export interface SwapQuote {
  amountOut: string;
  priceImpact: number;
  fee: string;
  route: string[];
}

export interface UserLiquidity {
  poolId: number;
  liquidity: string;
  sharePercent: number;
}

export interface DexStats {
  totalPools: number;
  totalTVL: string;
  totalVolume24h: string;
  totalFees24h: string;
}

export function useDexPools() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dex/pools');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setPools(data.pools || []);
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
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setStats(data.stats);
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

export function useUserRewards(address: string | undefined) {
  const [tradingRewards, setTradingRewards] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    if (!address) {
      setTradingRewards('0');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/dex/user/rewards?address=${address}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setTradingRewards(data.tradingRewards || '0');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rewards');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return { tradingRewards, loading, error, refetch: fetchRewards };
}

export function useUserLimitOrders(address: string | undefined) {
  const [orders, setOrders] = useState<any[]>([]);
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
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setOrders(data.orders || []);
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

  return { orders, loading, error, refetch: fetchOrders };
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

export { DEX_V2_CONTRACTS };
