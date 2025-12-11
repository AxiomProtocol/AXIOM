import { ethers } from 'ethers';
import { COMMUNITY_SAVINGS_CONTRACTS, CORE_CONTRACTS, NETWORK_CONFIG } from '../../shared/contracts';

const SUSU_HUB_ABI = [
  "function createPool(address token, uint256 memberCount, uint256 contributionAmount, uint256 cycleDuration, uint256 startTime, bool randomizedOrder, bool openJoin, uint16 protocolFeeBps) external returns (uint256)",
  "function joinPool(uint256 poolId) external",
  "function contribute(uint256 poolId) external",
  "function processPayout(uint256 poolId) external",
  "function startPool(uint256 poolId) external",
  "function exitPool(uint256 poolId) external",
  "function cancelPool(uint256 poolId, string calldata reason) external",
  "function getPool(uint256 poolId) external view returns (tuple(uint256 poolId, address creator, address token, uint256 memberCount, uint256 contributionAmount, uint256 cycleDuration, uint256 startTime, uint256 currentCycle, uint256 totalCycles, uint256 gracePeriod, uint16 protocolFeeBps, uint16 lateFeeBps, bool randomizedOrder, bool openJoin, uint8 status, uint256 createdAt, uint256 lastPayoutTime, uint256 totalContributed, uint256 totalPaidOut, uint256 totalFeesPaid))",
  "function getPoolMembers(uint256 poolId) external view returns (address[])",
  "function getMember(uint256 poolId, address wallet) external view returns (tuple(address wallet, uint256 payoutPosition, uint256 joinedAt, uint256 totalContributed, uint256 totalReceived, uint256 missedPayments, uint256 lateFees, bool hasReceivedPayout, uint8 status))",
  "function getPayoutOrder(uint256 poolId) external view returns (address[])",
  "function getUserPools(address user) external view returns (uint256[])",
  "function getContribution(uint256 poolId, uint256 cycle, address wallet) external view returns (tuple(bool hasPaid, uint256 amount, uint256 paidAt, bool wasLate))",
  "function getCurrentRecipient(uint256 poolId) external view returns (address)",
  "function getExpectedPayout(uint256 poolId) external view returns (uint256 gross, uint256 net, uint256 fee)",
  "function getCycleInfo(uint256 poolId) external view returns (uint256 cycle, uint256 contributionCount, uint256 cycleStart, uint256 cycleEnd, uint256 graceEnd, bool payoutProcessed)",
  "function hasContributed(uint256 poolId, address wallet) external view returns (bool)",
  "function totalPools() external view returns (uint256)",
  "function defaultProtocolFeeBps() external view returns (uint16)",
  "function defaultGracePeriod() external view returns (uint256)",
  "function defaultLateFeeBps() external view returns (uint16)",
  "event PoolCreated(uint256 indexed poolId, address indexed creator, address token, uint256 memberCount, uint256 contributionAmount, uint256 cycleDuration, uint256 startTime)",
  "event MemberJoined(uint256 indexed poolId, address indexed member, uint256 position, uint256 timestamp)",
  "event ContributionMade(uint256 indexed poolId, address indexed member, uint256 indexed cycle, uint256 amount, bool wasLate)",
  "event PayoutProcessed(uint256 indexed poolId, address indexed recipient, uint256 indexed cycle, uint256 grossAmount, uint256 netAmount, uint256 protocolFee)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)"
];

export enum PoolStatus {
  Pending = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3
}

export enum MemberStatus {
  Active = 0,
  Ejected = 1,
  Exited = 2
}

export interface SusuPool {
  poolId: number;
  creator: string;
  token: string;
  tokenSymbol?: string;
  memberCount: number;
  contributionAmount: string;
  cycleDuration: number;
  startTime: number;
  currentCycle: number;
  totalCycles: number;
  gracePeriod: number;
  protocolFeeBps: number;
  lateFeeBps: number;
  randomizedOrder: boolean;
  openJoin: boolean;
  status: PoolStatus;
  createdAt: number;
  lastPayoutTime: number;
  totalContributed: string;
  totalPaidOut: string;
  totalFeesPaid: string;
  currentMemberCount?: number;
}

export interface SusuMember {
  wallet: string;
  payoutPosition: number;
  joinedAt: number;
  totalContributed: string;
  totalReceived: string;
  missedPayments: number;
  lateFees: string;
  hasReceivedPayout: boolean;
  status: MemberStatus;
}

export interface CycleInfo {
  cycle: number;
  contributionCount: number;
  cycleStart: number;
  cycleEnd: number;
  graceEnd: number;
  payoutProcessed: boolean;
}

export class SusuService {
  private provider: ethers.JsonRpcProvider;
  private susuContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    this.susuContract = new ethers.Contract(
      COMMUNITY_SAVINGS_CONTRACTS.SUSU_HUB,
      SUSU_HUB_ABI,
      this.provider
    );
  }

  async getTotalPools(): Promise<number> {
    const total = await this.susuContract.totalPools();
    return Number(total);
  }

  async getDefaultParams(): Promise<{ protocolFeeBps: number; gracePeriod: number; lateFeeBps: number }> {
    const [protocolFeeBps, gracePeriod, lateFeeBps] = await Promise.all([
      this.susuContract.defaultProtocolFeeBps(),
      this.susuContract.defaultGracePeriod(),
      this.susuContract.defaultLateFeeBps()
    ]);
    return {
      protocolFeeBps: Number(protocolFeeBps),
      gracePeriod: Number(gracePeriod),
      lateFeeBps: Number(lateFeeBps)
    };
  }

  async getPool(poolId: number): Promise<SusuPool | null> {
    try {
      const pool = await this.susuContract.getPool(poolId);
      const members = await this.susuContract.getPoolMembers(poolId);
      
      let tokenSymbol = 'AXM';
      try {
        const tokenContract = new ethers.Contract(pool.token, ERC20_ABI, this.provider);
        tokenSymbol = await tokenContract.symbol();
      } catch (e) {
        console.error('Error fetching token symbol:', e);
      }

      return {
        poolId: Number(pool.poolId),
        creator: pool.creator,
        token: pool.token,
        tokenSymbol,
        memberCount: Number(pool.memberCount),
        contributionAmount: ethers.formatEther(pool.contributionAmount),
        cycleDuration: Number(pool.cycleDuration),
        startTime: Number(pool.startTime),
        currentCycle: Number(pool.currentCycle),
        totalCycles: Number(pool.totalCycles),
        gracePeriod: Number(pool.gracePeriod),
        protocolFeeBps: Number(pool.protocolFeeBps),
        lateFeeBps: Number(pool.lateFeeBps),
        randomizedOrder: pool.randomizedOrder,
        openJoin: pool.openJoin,
        status: Number(pool.status) as PoolStatus,
        createdAt: Number(pool.createdAt),
        lastPayoutTime: Number(pool.lastPayoutTime),
        totalContributed: ethers.formatEther(pool.totalContributed),
        totalPaidOut: ethers.formatEther(pool.totalPaidOut),
        totalFeesPaid: ethers.formatEther(pool.totalFeesPaid),
        currentMemberCount: members.length
      };
    } catch (error) {
      console.error('Error fetching pool:', error);
      return null;
    }
  }

  async getAllPools(limit: number = 50): Promise<SusuPool[]> {
    const totalPools = await this.getTotalPools();
    const pools: SusuPool[] = [];
    
    const start = Math.max(1, totalPools - limit + 1);
    for (let i = totalPools; i >= start; i--) {
      const pool = await this.getPool(i);
      if (pool) {
        pools.push(pool);
      }
    }
    
    return pools;
  }

  async getPoolMembers(poolId: number): Promise<string[]> {
    return await this.susuContract.getPoolMembers(poolId);
  }

  async getMember(poolId: number, wallet: string): Promise<SusuMember | null> {
    try {
      const member = await this.susuContract.getMember(poolId, wallet);
      if (member.wallet === ethers.ZeroAddress) return null;
      
      return {
        wallet: member.wallet,
        payoutPosition: Number(member.payoutPosition),
        joinedAt: Number(member.joinedAt),
        totalContributed: ethers.formatEther(member.totalContributed),
        totalReceived: ethers.formatEther(member.totalReceived),
        missedPayments: Number(member.missedPayments),
        lateFees: ethers.formatEther(member.lateFees),
        hasReceivedPayout: member.hasReceivedPayout,
        status: Number(member.status) as MemberStatus
      };
    } catch (error) {
      console.error('Error fetching member:', error);
      return null;
    }
  }

  async getUserPools(userAddress: string): Promise<number[]> {
    try {
      const poolIds = await this.susuContract.getUserPools(userAddress);
      return poolIds.map((id: bigint) => Number(id));
    } catch (error) {
      console.error('Error fetching user pools:', error);
      return [];
    }
  }

  async getPayoutOrder(poolId: number): Promise<string[]> {
    return await this.susuContract.getPayoutOrder(poolId);
  }

  async getCurrentRecipient(poolId: number): Promise<string> {
    return await this.susuContract.getCurrentRecipient(poolId);
  }

  async getExpectedPayout(poolId: number): Promise<{ gross: string; net: string; fee: string }> {
    const [gross, net, fee] = await this.susuContract.getExpectedPayout(poolId);
    return {
      gross: ethers.formatEther(gross),
      net: ethers.formatEther(net),
      fee: ethers.formatEther(fee)
    };
  }

  async getCycleInfo(poolId: number): Promise<CycleInfo> {
    const info = await this.susuContract.getCycleInfo(poolId);
    return {
      cycle: Number(info.cycle),
      contributionCount: Number(info.contributionCount),
      cycleStart: Number(info.cycleStart),
      cycleEnd: Number(info.cycleEnd),
      graceEnd: Number(info.graceEnd),
      payoutProcessed: info.payoutProcessed
    };
  }

  async hasContributed(poolId: number, wallet: string): Promise<boolean> {
    return await this.susuContract.hasContributed(poolId, wallet);
  }

  getContractAddress(): string {
    return COMMUNITY_SAVINGS_CONTRACTS.SUSU_HUB;
  }

  getAxmTokenAddress(): string {
    return CORE_CONTRACTS.AXM_TOKEN;
  }
}

export const susuService = new SusuService();
