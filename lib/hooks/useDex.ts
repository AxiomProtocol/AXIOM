import { useState, useEffect, useCallback } from 'react';

export const DEX_V2_CONTRACTS = {
  EXCHANGE_HUB_V2: '0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28',
  ORACLE_ADAPTER: '0xe0074F15EFe0E39fdc39c8e13f752DDC63AB35c7',
  LP_STAKING: '0x066623787044440015f7Ea2eC04cA58126cA00a5',
  FEE_DISTRIBUTOR: '0xD981748E2ed17681D8088be84480FE294d635ae8',
  TRADING_REWARDS: '0xb75b6e3D02116421fbd7c830a0f24d9a42420984',
  DEX_ROUTER: '0x05c655801dbf4ce8Db5aaE159769B7a1a0bFC0d8',
  DEX_ANALYTICS: '0x93cDF4AeCE237C62032e40C82d8b09dd76Fdf3E9',
  LIMIT_ORDERS: '0xBdC968773915095b71156bf265b0b10B23B9F8E2',
  DEX_GOVERNOR: '0x9A86CF2715D4c4Bb6728FB401ACd103527ABf96d',
  INSURANCE_FUND: '0x449769453e5bc43345092EeD31780bbbfc400F39'
} as const;

export interface Pool {
  id: number;
  tokenA: string;
  tokenB: string;
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
        const camelotPools: Pool[] = (rawPools.camelot || []).map((p: any, idx: number) => ({
          id: typeof p.id === 'number' ? p.id : idx + 1,
          tokenA: p.tokenA || p.poolAddress || '',
          tokenB: p.tokenB || '',
          reserveA: p.reserveA || '0',
          reserveB: p.reserveB || '0',
          totalLiquidity: p.totalLiquidity || '0',
          swapFee: p.swapFee || p.feeBps || 0,
          isActive: p.isActive ?? p.status === 'ACTIVE',
          pairAddress: p.pairAddress || p.poolAddress,
        }));
        const eulerSwapPools: Pool[] = (rawPools.eulerSwap || []).map((p: any, idx: number) => ({
          id: camelotPools.length + idx + 1,
          tokenA: p.poolAddress || '',
          tokenB: '',
          reserveA: '0',
          reserveB: '0',
          totalLiquidity: String(p.tvl || 0),
          swapFee: p.feeBps || 0,
          isActive: p.status === 'ACTIVE',
          pairAddress: p.poolAddress,
        }));
        setPools([...camelotPools, ...eulerSwapPools]);
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
        totalFees24h: data.totalFees24h || '0'
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
      if (!response.ok) throw new Error(`Rewards data unavailable (${response.status})`);
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
      if (!response.ok) throw new Error(`Orders data unavailable (${response.status})`);
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
