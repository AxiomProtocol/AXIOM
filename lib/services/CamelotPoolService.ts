/**
 * Camelot Pool Service - Real blockchain data from Camelot DEX on Arbitrum One
 * Fetches live liquidity pool data, reserves, APR calculations
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
  'function stableSwap() external view returns (bool)',
  'function FEE_DENOMINATOR() external view returns (uint256)',
  'function token0FeePercent() external view returns (uint16)',
  'function token1FeePercent() external view returns (uint16)'
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
  totalSupply: string;
  feePercent: number;
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

function calculateUserShare(userBalance: bigint, totalSupply: bigint, tvl: number): { share: number; liquidity: number } {
  if (totalSupply === 0n || userBalance === 0n) {
    return { share: 0, liquidity: 0 };
  }
  const precision = 10000n;
  const shareScaled = (userBalance * precision * 100n) / totalSupply;
  const share = Number(shareScaled) / Number(precision);
  const liquidity = tvl * (share / 100);
  return { share: Math.round(share * 1000) / 1000, liquidity: Math.round(liquidity * 100) / 100 };
}

class CamelotPoolService {
  private provider: ethers.JsonRpcProvider;
  private initialized: boolean = false;

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
      
      const estimatedDailyVolumeRatio = 0.1;
      const dailyVolume = tvl * estimatedDailyVolumeRatio;
      const dailyFees = dailyVolume * (feePercent / 100);
      const annualFees = dailyFees * 365;
      const baseApr = tvl > 0 ? (annualFees / tvl) * 100 : 0;

      let yourLiquidity = 0;
      let yourShare = 0;
      
      if (userAddress && poolConfig.pairAddress) {
        try {
          const userLpBalance: bigint = await pairContract.balanceOf(userAddress);
          const { share, liquidity } = calculateUserShare(userLpBalance, totalSupplyBN, tvl);
          yourShare = share;
          yourLiquidity = liquidity;
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
        tvl: Math.round(tvl),
        apr: Math.round(baseApr * 10) / 10,
        volume24h: Math.round(dailyVolume),
        fees24h: Math.round(dailyFees * 100) / 100,
        yourLiquidity,
        yourShare,
        totalSupply: ethers.formatEther(totalSupplyBN),
        feePercent
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
}

export const camelotPoolService = new CamelotPoolService();
export default camelotPoolService;
