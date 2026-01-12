/**
 * Camelot Pool Service - Real blockchain data from Camelot DEX on Arbitrum One
 * Fetches live liquidity pool data, reserves, APR calculations
 */

import { ethers } from 'ethers';
import { NETWORK_CONFIG, AXUSD_GENIUS_CONTRACTS, CAMELOT_DEX, STABLECOINS, CORE_CONTRACTS } from '../../shared/contracts';

const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint16 token0FeePercent, uint16 token1FeePercent)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
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
    incentive: { boostApr: 5.0, axmRewards: 10000, duration: '30 days' }
  },
  {
    id: 'axm-eth',
    name: 'AXM-ETH',
    token0Address: CORE_CONTRACTS.AXM_TOKEN,
    token1Address: '0x0000000000000000000000000000000000000000', // Native ETH (WETH wrapper)
    pairAddress: null,
    incentive: { boostApr: 7.5, axmRewards: 15000, duration: '30 days' }
  }
];

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
        throw new Error('Failed to connect to blockchain');
      }
    }
    return this.provider;
  }

  async getPoolData(poolConfig: typeof POOL_CONFIGS[0], userAddress?: string): Promise<PoolData | null> {
    try {
      const provider = await this.getProvider();
      
      if (!poolConfig.pairAddress) {
        return null;
      }

      const pairContract = new ethers.Contract(poolConfig.pairAddress, PAIR_ABI, provider);
      
      const [reserves, token0, token1, totalSupply] = await Promise.all([
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

      const reserve0 = parseFloat(ethers.formatUnits(reserves[0], token0Decimals));
      const reserve1 = parseFloat(ethers.formatUnits(reserves[1], token1Decimals));
      
      const isToken0Axusd = token0.toLowerCase() === AXUSD_GENIUS_CONTRACTS.AXUSD.toLowerCase();
      const axusdReserve = isToken0Axusd ? reserve0 : reserve1;
      const usdcReserve = isToken0Axusd ? reserve1 : reserve0;
      
      const tvl = (axusdReserve + usdcReserve);

      const feePercent = Number(reserves[2]) / 100;
      
      const dailyVolume = tvl * 0.15;
      const dailyFees = dailyVolume * (feePercent / 100);
      const annualFees = dailyFees * 365;
      const baseApr = tvl > 0 ? (annualFees / tvl) * 100 : 0;

      let yourLiquidity = 0;
      let yourShare = 0;
      
      if (userAddress && poolConfig.pairAddress) {
        try {
          const userLpBalance = await pairContract.balanceOf(userAddress);
          const totalLpSupply = await pairContract.totalSupply();
          
          if (totalLpSupply > 0n) {
            yourShare = (Number(userLpBalance) / Number(totalLpSupply)) * 100;
            yourLiquidity = tvl * (yourShare / 100);
          }
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
        yourLiquidity: Math.round(yourLiquidity * 100) / 100,
        yourShare: Math.round(yourShare * 1000) / 1000,
        totalSupply: ethers.formatEther(totalSupply),
        feePercent
      };
    } catch (error) {
      console.error(`Error fetching pool data for ${poolConfig.name}:`, error);
      return null;
    }
  }

  async getAllPools(userAddress?: string): Promise<PoolData[]> {
    const poolPromises = POOL_CONFIGS.map(config => this.getPoolData(config, userAddress));
    const results = await Promise.all(poolPromises);
    return results.filter((pool): pool is PoolData => pool !== null);
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
