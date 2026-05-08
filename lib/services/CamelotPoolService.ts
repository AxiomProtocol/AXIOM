/**
 * Camelot Pool Service - Real blockchain data from Camelot DEX on Arbitrum One
 * Fetches live liquidity pool data, reserves, real trading volume from swap events
 */

import { ethers } from 'ethers';
import { NETWORK_CONFIG, AXUSD_GENIUS_CONTRACTS, CAMELOT_DEX, STABLECOINS, CORE_CONTRACTS } from '../../shared/contracts';

const CAMELOT_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function token0FeePercent() external view returns (uint16)',
  'function token1FeePercent() external view returns (uint16)',
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'
];

const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function totalSupply() external view returns (uint256)'
];

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

export interface PoolData {
  id: string;
  name: string;
  token0: string;
  token1: string;
  token0Address: string;
  token1Address: string;
  pairAddress: string;
  reserve0: string;
  reserve1: string;
  tvl: number;
  apr: number;
  volume24h: number;
  fees24h: number;
  yourLiquidity: number;
  yourShare: number;
  yourLpTokenBalance: string;
  totalSupply: string;
  feePercent: number;
  swapCount24h: number;
}

export interface LPIncentive {
  poolId: string;
  poolName: string;
  baseApr: number;
  boostApr: number;
  totalApr: number;
  axmRewards: number;
  duration: string;
  eligibleTvl: number;
}

const POOL_CONFIGS = [
  {
    id: 'axusd-usdc',
    name: 'AXUSD-USDC',
    token0Address: AXUSD_GENIUS_CONTRACTS.AXUSD,
    token1Address: STABLECOINS.USDC,
    pairAddress: AXUSD_GENIUS_CONTRACTS.LP_POOL_CAMELOT,
    incentive: { boostApr: 5.0, axmRewards: 10000, duration: '30 days' },
    defaultFeePercent: 0.3
  },
  {
    id: 'axm-eth',
    name: 'AXM-ETH',
    token0Address: CORE_CONTRACTS.AXM_TOKEN,
    token1Address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    pairAddress: null,
    incentive: { boostApr: 7.5, axmRewards: 15000, duration: '30 days' },
    defaultFeePercent: 0.3
  }
];

function formatBigIntWithDecimals(value: bigint, decimals: number): number {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  return parseFloat(`${integerPart}.${fractionalStr}`);
}

function calculateUserShare(userBalance: bigint, totalSupply: bigint, tvl: number): { share: number; liquidity: number; lpTokenBalance: string } {
  if (totalSupply === 0n || userBalance === 0n) {
    return { share: 0, liquidity: 0, lpTokenBalance: '0' };
  }
  const precision = 10000n;
  const shareScaled = (userBalance * precision * 100n) / totalSupply;
  const share = Number(shareScaled) / Number(precision);
  const liquidity = tvl * (share / 100);
  return { 
    share: Math.round(share * 1000) / 1000, 
    liquidity: Math.round(liquidity * 100) / 100,
    lpTokenBalance: ethers.formatEther(userBalance)
  };
}

class CamelotPoolService {
  private provider: ethers.JsonRpcProvider;
  private initialized: boolean = false;
  private volumeCache: Map<string, { volume: number; fees: number; swapCount: number; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  }

  private async getProvider(): Promise<ethers.JsonRpcProvider> {
    if (!this.initialized) {
      try {
        await this.provider.getNetwork();
        this.initialized = true;
      } catch (error) {
        console.error('Failed to connect to Arbitrum RPC:', error);
        throw new Error('BLOCKCHAIN_CONNECTION_FAILED');
      }
    }
    return this.provider;
  }

  private async get24hVolumeFromSwapEvents(
    pairAddress: string,
    token0Decimals: number,
    token1Decimals: number,
    feePercent: number
  ): Promise<{ volume: number; fees: number; swapCount: number }> {
    const cacheKey = pairAddress.toLowerCase();
    const cached = this.volumeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return { volume: cached.volume, fees: cached.fees, swapCount: cached.swapCount };
    }

    try {
      const provider = await this.getProvider();
      const pairContract = new ethers.Contract(pairAddress, CAMELOT_PAIR_ABI, provider);
      
      const currentBlock = await provider.getBlockNumber();
      const blocksIn24h = Math.floor((24 * 60 * 60) / 0.25);
      const fromBlock = Math.max(0, currentBlock - blocksIn24h);
      
      const swapFilter = pairContract.filters.Swap();
      
      let allEvents: ethers.Log[] = [];
      const batchSize = 10000;
      
      for (let startBlock = fromBlock; startBlock <= currentBlock; startBlock += batchSize) {
        const endBlock = Math.min(startBlock + batchSize - 1, currentBlock);
        try {
          const events = await pairContract.queryFilter(swapFilter, startBlock, endBlock);
          allEvents = allEvents.concat(events);
        } catch (error) {
          console.error(`Error fetching events for blocks ${startBlock}-${endBlock}:`, error);
        }
      }

      let totalVolume = 0;
      let swapCount = allEvents.length;

      for (const event of allEvents) {
        try {
          const log = event as ethers.EventLog;
          if (log.args) {
            const amount0In = log.args[1] as bigint;
            const amount1In = log.args[2] as bigint;
            const amount0Out = log.args[3] as bigint;
            const amount1Out = log.args[4] as bigint;

            const vol0In = formatBigIntWithDecimals(amount0In, token0Decimals);
            const vol1In = formatBigIntWithDecimals(amount1In, token1Decimals);
            const vol0Out = formatBigIntWithDecimals(amount0Out, token0Decimals);
            const vol1Out = formatBigIntWithDecimals(amount1Out, token1Decimals);

            totalVolume += vol0In + vol1In + vol0Out + vol1Out;
          }
        } catch (err) {
          console.error('Error parsing swap event:', err);
        }
      }

      totalVolume = totalVolume / 2;
      const fees = totalVolume * (feePercent / 100);

      this.volumeCache.set(cacheKey, {
        volume: totalVolume,
        fees,
        swapCount,
        timestamp: Date.now()
      });

      return { volume: totalVolume, fees, swapCount };
    } catch (error) {
      console.error('Error fetching swap events:', error);
      return { volume: 0, fees: 0, swapCount: 0 };
    }
  }

  async getPoolData(poolConfig: typeof POOL_CONFIGS[0], userAddress?: string): Promise<PoolData | null> {
    if (!poolConfig.pairAddress) {
      return null;
    }

    try {
      const provider = await this.getProvider();
      const pairContract = new ethers.Contract(poolConfig.pairAddress, CAMELOT_PAIR_ABI, provider);
      
      const [reserves, token0, token1, totalSupplyBN] = await Promise.all([
        pairContract.getReserves(),
        pairContract.token0(),
        pairContract.token1(),
        pairContract.totalSupply()
      ]);

      const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider);
      const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider);

      const [token0Decimals, token1Decimals, token0Symbol, token1Symbol] = await Promise.all([
        token0Contract.decimals(),
        token1Contract.decimals(),
        token0Contract.symbol().catch(() => 'TOKEN0'),
        token1Contract.symbol().catch(() => 'TOKEN1')
      ]);

      const reserve0 = formatBigIntWithDecimals(reserves[0], Number(token0Decimals));
      const reserve1 = formatBigIntWithDecimals(reserves[1], Number(token1Decimals));
      
      const isToken0Axusd = token0.toLowerCase() === AXUSD_GENIUS_CONTRACTS.AXUSD.toLowerCase();
      const axusdReserve = isToken0Axusd ? reserve0 : reserve1;
      const usdcReserve = isToken0Axusd ? reserve1 : reserve0;
      
      const tvl = axusdReserve + usdcReserve;

      let feePercent = poolConfig.defaultFeePercent;
      try {
        const [token0Fee, token1Fee] = await Promise.all([
          pairContract.token0FeePercent().catch(() => null),
          pairContract.token1FeePercent().catch(() => null)
        ]);
        if (token0Fee !== null && token1Fee !== null) {
          feePercent = (Number(token0Fee) + Number(token1Fee)) / 200;
        }
      } catch {
      }

      const { volume: volume24h, fees: fees24h, swapCount: swapCount24h } = await this.get24hVolumeFromSwapEvents(
        poolConfig.pairAddress,
        Number(token0Decimals),
        Number(token1Decimals),
        feePercent
      );

      const annualFees = fees24h * 365;
      const baseApr = tvl > 0 ? (annualFees / tvl) * 100 : 0;

      let yourLiquidity = 0;
      let yourShare = 0;
      let yourLpTokenBalance = '0';
      
      if (userAddress && poolConfig.pairAddress) {
        try {
          const userLpBalance: bigint = await pairContract.balanceOf(userAddress);
          const result = calculateUserShare(userLpBalance, totalSupplyBN, tvl);
          yourShare = result.share;
          yourLiquidity = result.liquidity;
          yourLpTokenBalance = result.lpTokenBalance;
        } catch (error) {
          console.error('Error fetching user LP balance:', error);
        }
      }

      return {
        id: poolConfig.id,
        name: poolConfig.name,
        token0: token0Symbol,
        token1: token1Symbol,
        token0Address: token0,
        token1Address: token1,
        pairAddress: poolConfig.pairAddress,
        reserve0: reserve0.toFixed(2),
        reserve1: reserve1.toFixed(2),
        tvl: Math.round(tvl * 100) / 100,
        apr: Math.round(baseApr * 100) / 100,
        volume24h: Math.round(volume24h * 100) / 100,
        fees24h: Math.round(fees24h * 100) / 100,
        yourLiquidity,
        yourShare,
        yourLpTokenBalance,
        totalSupply: ethers.formatEther(totalSupplyBN),
        feePercent,
        swapCount24h
      };
    } catch (error) {
      console.error(`Error fetching pool data for ${poolConfig.name}:`, error);
      throw error;
    }
  }

  async getAllPools(userAddress?: string): Promise<PoolData[]> {
    const results: PoolData[] = [];
    
    for (const config of POOL_CONFIGS) {
      try {
        const pool = await this.getPoolData(config, userAddress);
        if (pool) {
          results.push(pool);
        }
      } catch (error) {
        console.error(`Failed to fetch pool ${config.id}:`, error);
      }
    }
    
    return results;
  }

  async getLPIncentives(): Promise<LPIncentive[]> {
    const pools = await this.getAllPools();
    
    return pools.map(pool => {
      const config = POOL_CONFIGS.find(c => c.id === pool.id);
      const incentive = config?.incentive || { boostApr: 0, axmRewards: 0, duration: 'N/A' };
      
      return {
        poolId: pool.id,
        poolName: pool.name,
        baseApr: pool.apr,
        boostApr: incentive.boostApr,
        totalApr: pool.apr + incentive.boostApr,
        axmRewards: incentive.axmRewards,
        duration: incentive.duration,
        eligibleTvl: pool.tvl
      };
    });
  }

  async getPoolByPairAddress(pairAddress: string, userAddress?: string): Promise<PoolData | null> {
    const config = POOL_CONFIGS.find(c => c.pairAddress?.toLowerCase() === pairAddress.toLowerCase());
    if (!config) return null;
    return this.getPoolData(config, userAddress);
  }

  async getPairAddress(tokenA: string, tokenB: string): Promise<string | null> {
    try {
      const provider = await this.getProvider();
      const factory = new ethers.Contract(CAMELOT_DEX.FACTORY, FACTORY_ABI, provider);
      const pairAddress = await factory.getPair(tokenA, tokenB);
      
      if (pairAddress === ethers.ZeroAddress) {
        return null;
      }
      return pairAddress;
    } catch (error) {
      console.error('Error getting pair address:', error);
      return null;
    }
  }

  /**
   * Compute a time-weighted average price (TWAP) for `tokenAddress` vs USDC
   * using the Uniswap-V2-compatible cumulative price accumulators stored on
   * every Camelot V2 pair.
   *
   * Algorithm (Uniswap V2 TWAP reference pattern):
   *   For each observation point (current and historical block):
   *     effectiveCum(T) = price0CumulativeLast + spotQ112 × (T − blockTimestampLast)
   *   where T is the ACTUAL block timestamp (fetched from the chain), not the
   *   pair's stored blockTimestampLast, so stale-sync periods are always covered.
   *
   *   TWAP_Q112 = (effectiveCum(T_now) − effectiveCum(T_hist)) / (T_now − T_hist)
   *
   * Returns null if: pair does not exist, time window is zero, reserves are
   * empty, or any RPC call fails.
   *
   * @param tokenAddress  checksummed address of the token to price
   * @param tokenDecimals number of decimals for that token (default 18)
   * @param twapWindowSecs TWAP observation window in seconds (default 1800 = 30 min)
   */
  async getTokenTWAPVsUsdc(
    tokenAddress: string,
    tokenDecimals: number = 18,
    twapWindowSecs: number = 1_800,
  ): Promise<number | null> {
    try {
      const provider = await this.getProvider();
      const pairAddress = await this.getPairAddress(tokenAddress, STABLECOINS.USDC);
      if (!pairAddress) return null;

      const pairABI = [
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
        'function token0() external view returns (address)',
        'function price0CumulativeLast() external view returns (uint256)',
      ];
      const pair = new ethers.Contract(pairAddress, pairABI, provider);

      // Step 1: resolve current block and derive a historical block target.
      // The historical block is only a coarse starting point — we use the
      // ACTUAL block timestamps (T_now, T_hist) as the authoritative window.
      const currentBlock = await provider.getBlockNumber();
      // ~4 blocks/s on Arbitrum One → 30 min ≈ 7200 blocks (approximation only)
      const historicalBlock = Math.max(1, currentBlock - Math.ceil(twapWindowSecs * 4));

      // Step 2: fetch actual block timestamps and pair state at both block heights.
      const [
        nowBlockData,
        histBlockData,
        reserves_now,
        cum0_now,
        token0Addr,
        reserves_hist,
        cum0_hist,
      ] = await Promise.all([
        provider.getBlock(currentBlock),
        provider.getBlock(historicalBlock),
        pair.getReserves({ blockTag: currentBlock }),
        pair.price0CumulativeLast({ blockTag: currentBlock }),
        pair.token0(),
        pair.getReserves({ blockTag: historicalBlock }),
        pair.price0CumulativeLast({ blockTag: historicalBlock }),
      ]);

      const isToken0 = (token0Addr as string).toLowerCase() === tokenAddress.toLowerCase();
      const Q112 = 2n ** 112n;
      // 12-decimal fixed-point preserves ~12 significant digits through BigInt division
      const PRECISION = 10n ** 12n;

      // Use actual block timestamps to define the exact observation window
      const T_now  = BigInt(nowBlockData?.timestamp  ?? Number(reserves_now[2]));
      const T_hist = BigInt(histBlockData?.timestamp ?? Number(reserves_hist[2]));

      const timeDelta = T_now - T_hist;
      if (timeDelta <= 0n) return null;

      // Step 3: project each stored cumulative forward to its block's actual timestamp.
      // effectiveCum(T) = priceCumulativeLast + spotQ112 × (T − blockTimestampLast)
      // This correctly handles "stale" pools where no swap occurred near the boundary.

      const r0_now: bigint  = reserves_now[0];
      const r1_now: bigint  = reserves_now[1];
      const bts_lastNow = BigInt(reserves_now[2]);
      const lagNow = T_now > bts_lastNow ? T_now - bts_lastNow : 0n;
      let effectiveCum_now: bigint = cum0_now as bigint;
      if (r0_now > 0n && lagNow > 0n) {
        effectiveCum_now = (cum0_now as bigint) + (r1_now * Q112 / r0_now) * lagNow;
      }

      const r0_hist: bigint = reserves_hist[0];
      const r1_hist: bigint = reserves_hist[1];
      const bts_lastHist = BigInt(reserves_hist[2]);
      const lagHist = T_hist > bts_lastHist ? T_hist - bts_lastHist : 0n;
      let effectiveCum_hist: bigint = cum0_hist as bigint;
      if (r0_hist > 0n && lagHist > 0n) {
        effectiveCum_hist = (cum0_hist as bigint) + (r1_hist * Q112 / r0_hist) * lagHist;
      }

      // Step 4: TWAP in PRECISION fixed-point
      const cumulativeDiff = effectiveCum_now - effectiveCum_hist;
      const twapFixed = cumulativeDiff * PRECISION / (Q112 * timeDelta);
      if (twapFixed === 0n) return null;

      // Step 5: decode UQ112×112 ratio to USD float with decimal adjustment.
      // price0 = token1_raw / token0_raw (time-averaged)
      let usdPrice: number;
      if (isToken0) {
        // token0 = our token (AXM, 18 dec), token1 = USDC (6 dec)
        // USD per token = price0 × 10^tokenDecimals / 1e6
        usdPrice = (Number(twapFixed) / 1e12) * Math.pow(10, tokenDecimals) / 1e6;
      } else {
        // token0 = USDC (6 dec), token1 = our token (AXM, 18 dec)
        // USD per token = 1e6 / (price0 × 10^tokenDecimals)
        const priceRaw = Number(twapFixed) / 1e12;
        if (priceRaw <= 0) return null;
        usdPrice = 1e6 / (priceRaw * Math.pow(10, tokenDecimals));
      }

      return usdPrice > 0 ? usdPrice : null;
    } catch {
      return null;
    }
  }

  clearCache(): void {
    this.volumeCache.clear();
  }
}

export const camelotPoolService = new CamelotPoolService();
export default camelotPoolService;
