import { ethers } from 'ethers';

import ExchangeHubABI from '../../abis/dex/AxiomExchangeHubV2.json';
import OracleAdapterABI from '../../abis/dex/AxiomOracleAdapter.json';
import LPStakingABI from '../../abis/dex/AxiomLPStaking.json';
import FeeDistributorABI from '../../abis/dex/AxiomFeeDistributor.json';
import TradingRewardsABI from '../../abis/dex/AxiomTradingRewards.json';
import DEXRouterABI from '../../abis/dex/AxiomDEXRouter.json';
import DEXAnalyticsABI from '../../abis/dex/AxiomDEXAnalytics.json';
import LimitOrdersABI from '../../abis/dex/AxiomLimitOrders.json';

export const DEX_ADDRESSES = {
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

const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

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

export interface StakingPosition {
  poolId: number;
  stakedAmount: string;
  pendingRewards: string;
  startTime: number;
}

class DexService {
  private provider: ethers.JsonRpcProvider;
  private exchangeHub: ethers.Contract;
  private oracleAdapter: ethers.Contract;
  private lpStaking: ethers.Contract;
  private feeDistributor: ethers.Contract;
  private tradingRewards: ethers.Contract;
  private dexRouter: ethers.Contract;
  private dexAnalytics: ethers.Contract;
  private limitOrders: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    
    this.exchangeHub = new ethers.Contract(
      DEX_ADDRESSES.EXCHANGE_HUB_V2,
      ExchangeHubABI,
      this.provider
    );
    
    this.oracleAdapter = new ethers.Contract(
      DEX_ADDRESSES.ORACLE_ADAPTER,
      OracleAdapterABI,
      this.provider
    );
    
    this.lpStaking = new ethers.Contract(
      DEX_ADDRESSES.LP_STAKING,
      LPStakingABI,
      this.provider
    );
    
    this.feeDistributor = new ethers.Contract(
      DEX_ADDRESSES.FEE_DISTRIBUTOR,
      FeeDistributorABI,
      this.provider
    );
    
    this.tradingRewards = new ethers.Contract(
      DEX_ADDRESSES.TRADING_REWARDS,
      TradingRewardsABI,
      this.provider
    );
    
    this.dexRouter = new ethers.Contract(
      DEX_ADDRESSES.DEX_ROUTER,
      DEXRouterABI,
      this.provider
    );
    
    this.dexAnalytics = new ethers.Contract(
      DEX_ADDRESSES.DEX_ANALYTICS,
      DEXAnalyticsABI,
      this.provider
    );
    
    this.limitOrders = new ethers.Contract(
      DEX_ADDRESSES.LIMIT_ORDERS,
      LimitOrdersABI,
      this.provider
    );
  }

  async getPoolCount(): Promise<number> {
    try {
      const count = await this.exchangeHub.poolCount();
      return Number(count);
    } catch (error) {
      console.error('Error getting pool count:', error);
      return 0;
    }
  }

  async getPool(poolId: number): Promise<Pool | null> {
    try {
      const pool = await this.exchangeHub.pools(poolId);
      return {
        id: poolId,
        tokenA: pool.tokenA,
        tokenB: pool.tokenB,
        reserveA: ethers.formatEther(pool.reserveA),
        reserveB: ethers.formatEther(pool.reserveB),
        totalLiquidity: ethers.formatEther(pool.totalLiquidity),
        swapFee: Number(pool.swapFee),
        isActive: pool.isActive
      };
    } catch (error) {
      console.error(`Error getting pool ${poolId}:`, error);
      return null;
    }
  }

  async getAllPools(): Promise<Pool[]> {
    const poolCount = await this.getPoolCount();
    const pools: Pool[] = [];
    
    for (let i = 1; i <= poolCount; i++) {
      const pool = await this.getPool(i);
      if (pool && pool.isActive) {
        pools.push(pool);
      }
    }
    
    return pools;
  }

  async getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<SwapQuote | null> {
    try {
      const amountInWei = ethers.parseEther(amountIn);
      const result = await this.dexRouter.getOptimalRoute(tokenIn, tokenOut, amountInWei);
      
      return {
        amountOut: ethers.formatEther(result.amountOut),
        priceImpact: Number(result.priceImpact) / 100,
        fee: ethers.formatEther(result.fee),
        route: result.path
      };
    } catch (error) {
      console.error('Error getting swap quote:', error);
      return null;
    }
  }

  async getUserLiquidity(userAddress: string): Promise<UserLiquidity[]> {
    try {
      const poolCount = await this.getPoolCount();
      const positions: UserLiquidity[] = [];
      
      for (let i = 1; i <= poolCount; i++) {
        const liquidity = await this.exchangeHub.liquidityBalances(i, userAddress);
        if (liquidity > 0n) {
          const pool = await this.getPool(i);
          if (pool) {
            const totalLiq = ethers.parseEther(pool.totalLiquidity);
            const sharePercent = totalLiq > 0n 
              ? Number((liquidity * 10000n) / totalLiq) / 100
              : 0;
            
            positions.push({
              poolId: i,
              liquidity: ethers.formatEther(liquidity),
              sharePercent
            });
          }
        }
      }
      
      return positions;
    } catch (error) {
      console.error('Error getting user liquidity:', error);
      return [];
    }
  }

  async getStakingPosition(userAddress: string, poolId: number): Promise<StakingPosition | null> {
    try {
      const stake = await this.lpStaking.stakes(poolId, userAddress);
      const pending = await this.lpStaking.pendingRewards(poolId, userAddress);
      
      return {
        poolId,
        stakedAmount: ethers.formatEther(stake.amount),
        pendingRewards: ethers.formatEther(pending),
        startTime: Number(stake.startTime)
      };
    } catch (error) {
      console.error('Error getting staking position:', error);
      return null;
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<string | null> {
    try {
      const [price] = await this.oracleAdapter.getPrice(tokenAddress);
      return ethers.formatEther(price);
    } catch (error) {
      console.error('Error getting token price:', error);
      return null;
    }
  }

  async getTradingVolume(poolId: number): Promise<string> {
    try {
      const volume = await this.dexAnalytics.poolVolume24h(poolId);
      return ethers.formatEther(volume);
    } catch (error) {
      console.error('Error getting trading volume:', error);
      return '0';
    }
  }

  async getTotalTVL(): Promise<string> {
    try {
      const pools = await this.getAllPools();
      let totalTVL = 0n;
      
      for (const pool of pools) {
        totalTVL += ethers.parseEther(pool.reserveA);
        totalTVL += ethers.parseEther(pool.reserveB);
      }
      
      return ethers.formatEther(totalTVL);
    } catch (error) {
      console.error('Error getting total TVL:', error);
      return '0';
    }
  }

  async getUserTradingRewards(userAddress: string): Promise<string> {
    try {
      const rewards = await this.tradingRewards.pendingRewards(userAddress);
      return ethers.formatEther(rewards);
    } catch (error) {
      console.error('Error getting trading rewards:', error);
      return '0';
    }
  }

  async getUserLimitOrders(userAddress: string): Promise<any[]> {
    try {
      const orderCount = await this.limitOrders.userOrderCount(userAddress);
      const orders: any[] = [];
      
      for (let i = 0; i < Number(orderCount); i++) {
        const orderId = await this.limitOrders.userOrders(userAddress, i);
        const order = await this.limitOrders.orders(orderId);
        if (order.status === 0) {
          orders.push({
            id: Number(orderId),
            tokenIn: order.tokenIn,
            tokenOut: order.tokenOut,
            amountIn: ethers.formatEther(order.amountIn),
            targetPrice: ethers.formatEther(order.targetPrice),
            minAmountOut: ethers.formatEther(order.minAmountOut),
            createdAt: Number(order.createdAt),
            expiresAt: Number(order.expiresAt)
          });
        }
      }
      
      return orders;
    } catch (error) {
      console.error('Error getting limit orders:', error);
      return [];
    }
  }

  async getProtocolStats(): Promise<{
    totalPools: number;
    totalTVL: string;
    totalVolume24h: string;
    totalFees24h: string;
  }> {
    try {
      const pools = await this.getAllPools();
      const tvl = await this.getTotalTVL();
      
      let totalVolume = 0n;
      for (const pool of pools) {
        const volume = await this.dexAnalytics.poolVolume24h(pool.id);
        totalVolume += volume;
      }
      
      const totalFees = await this.feeDistributor.totalFeesCollected();
      
      return {
        totalPools: pools.length,
        totalTVL: tvl,
        totalVolume24h: ethers.formatEther(totalVolume),
        totalFees24h: ethers.formatEther(totalFees)
      };
    } catch (error) {
      console.error('Error getting protocol stats:', error);
      return {
        totalPools: 0,
        totalTVL: '0',
        totalVolume24h: '0',
        totalFees24h: '0'
      };
    }
  }
}

export const dexService = new DexService();
export default dexService;
