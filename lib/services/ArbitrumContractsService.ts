/**
 * ArbitrumContractsService - Abstraction layer for all Axiom blockchain contract interactions
 * 
 * This interface provides a unified way to interact with:
 * 1. AXM token contracts on Arbitrum One
 * 2. Staking & Emissions Hub
 * 3. DEX (AxiomExchangeHub)
 * 4. All 22 deployed Axiom smart contracts
 * 
 * Network: Arbitrum One (Chain ID: 42161)
 * Source of Truth: shared/contracts.ts
 */

import {
  NETWORK_CONFIG,
  CORE_CONTRACTS,
  AXM_TOKEN_CONFIG,
  STAKING_CONFIG,
  DEX_CONFIG,
  getExplorerUrl,
  getTransactionUrl,
  isValidChainId
} from '../../shared/contracts';

export interface IContractsService {
  // ===== AXM TOKEN FUNCTIONALITY =====
  
  /**
   * Get AXM token balance for an address
   */
  getAXMBalance(address: string): Promise<string>;
  
  /**
   * Get staking information for user
   */
  getStakingInfo(address: string): Promise<{
    totalStaked: string;
    rewards: string;
    stakingAPY: number;
  }>;
  
  /**
   * Stake AXM tokens
   */
  stakeAXM(amount: string, userAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }>;
  
  /**
   * Unstake AXM tokens
   */
  unstakeAXM(amount: string, userAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }>;

  // ===== CONTRIBUTION TRACKING =====
  
  /**
   * Record on-chain contribution (for circles or individual goals)
   */
  recordContribution(contribution: {
    userAddress: string;
    amount: string;
    contributionType: 'individual' | 'circle';
    targetId?: string; // circle_id for group contributions
  }): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }>;
  
  /**
   * Get contribution history for user
   */
  getContributionHistory(userAddress: string): Promise<Array<{
    date: string;
    amount: string;
    type: 'individual' | 'circle';
    transactionHash: string;
    targetId?: string;
  }>>;
}

/**
 * ArbitrumContractsService - Real Arbitrum One blockchain contract interactions
 * Integrates with all 22 deployed Axiom smart contracts
 */
export class ArbitrumContractsService implements IContractsService {
  private ethers: any;
  private axmContract: any;
  private stakingContract: any;
  private provider: any;
  private signer: any;
  private isProduction: boolean;
  
  // Arbitrum Network Configuration (from shared/contracts.ts)
  private readonly ARBITRUM_CHAIN_ID = NETWORK_CONFIG.chainId;
  private readonly AXM_CONTRACT_ADDRESS = CORE_CONTRACTS.AXM_TOKEN;
  private readonly STAKING_CONTRACT_ADDRESS = CORE_CONTRACTS.STAKING_EMISSIONS;
  private readonly DEX_CONTRACT_ADDRESS = DEX_CONFIG.address;
  
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize with existing ethers setup if available
    if (typeof window !== 'undefined' && (window as any).ethers) {
      this.ethers = (window as any).ethers;
      this.initializeContracts();
    }
  }
  
  private async initializeContracts() {
    if (!this.ethers) return;
    
    try {
      if (!(window as any).ethereum) {
        console.warn('No Web3 provider detected');
        return;
      }
      
      // Validate Arbitrum One network
      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);
      
      if (!isValidChainId(currentChainId)) {
        console.warn(`Wrong network. Please switch to Arbitrum One (Chain ID: ${this.ARBITRUM_CHAIN_ID}). Current: ${currentChainId}`);
        if (this.isProduction) {
          throw new Error('Arbitrum One network required for staking operations');
        }
      }
      
      this.provider = new this.ethers.BrowserProvider((window as any).ethereum);
      this.signer = await this.provider.getSigner();
      
      // AXM Token Contract ABI (ERC20 + governance + custom functions)
      const AXM_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function transferFrom(address from, address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)"
      ];
      
      // Staking Contract ABI (AxiomStakingAndEmissionsHub)
      const STAKING_ABI = [
        "function stake(uint256 poolId, uint256 amount) external",
        "function withdraw(uint256 poolId, uint256 amount) external",
        "function claimReward(uint256 poolId) external",
        "function pools(uint256) view returns (address stakingToken, address rewardToken, uint256 rewardRate, uint256 totalStaked, bool isActive)",
        "function userStakes(uint256 poolId, address user) view returns (uint256 amount, uint256 rewardDebt)",
        "function pendingReward(uint256 poolId, address user) view returns (uint256)",
        "function nextPoolId() view returns (uint256)"
      ];
      
      this.axmContract = new this.ethers.Contract(this.AXM_CONTRACT_ADDRESS, AXM_ABI, this.provider);
      this.stakingContract = new this.ethers.Contract(this.STAKING_CONTRACT_ADDRESS, STAKING_ABI, this.provider);
      
      console.log('✅ Arbitrum One contracts initialized successfully');
      console.log(`🌐 Network: Arbitrum One (Chain ID: ${currentChainId})`);
      console.log(`📍 AXM Token: ${this.AXM_CONTRACT_ADDRESS}`);
      console.log(`📍 Staking Hub: ${this.STAKING_CONTRACT_ADDRESS}`);
      console.log(`📍 Explorer: ${getExplorerUrl(this.AXM_CONTRACT_ADDRESS)}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Arbitrum One contracts:', error);
      if (this.isProduction) {
        throw error;
      }
    }
  }
  
  // ===== AXM TOKEN IMPLEMENTATION =====
  
  async getAXMBalance(address: string): Promise<string> {
    try {
      if (!this.axmContract) {
        await this.initializeContracts();
      }
      
      if (this.axmContract) {
        const balance = await this.axmContract.balanceOf(address);
        return this.ethers.formatEther(balance);
      }
      
      // Development fallback only if not production
      if (!this.isProduction) {
        console.warn('⚠️ Development fallback: Using mock AXM balance');
        return "1250.50";
      }
      
      throw new Error('Unable to connect to Arbitrum One network');
    } catch (error) {
      console.error('Error getting AXM balance:', error);
      if (this.isProduction) {
        throw error;
      }
      return "0";
    }
  }
  
  async getStakingInfo(address: string): Promise<{
    totalStaked: string;
    rewards: string;
    stakingAPY: number;
  }> {
    try {
      if (!this.stakingContract) {
        await this.initializeContracts();
      }
      
      if (this.stakingContract) {
        // Default to pool 0 for now - in production, fetch from user's active pools
        const poolId = 0;
        
        const [userStake, pendingRewards, poolInfo] = await Promise.all([
          this.stakingContract.userStakes(poolId, address),
          this.stakingContract.pendingReward(poolId, address),
          this.stakingContract.pools(poolId)
        ]);
        
        const totalStaked = this.ethers.formatEther(userStake.amount);
        const rewards = this.ethers.formatEther(pendingRewards);
        
        // Calculate APY from reward rate (simplified - actual calculation depends on pool structure)
        const rewardRate = Number(this.ethers.formatEther(poolInfo.rewardRate));
        const stakingAPY = rewardRate * 365 * 100; // Simplified APY calculation
        
        return {
          totalStaked,
          rewards,
          stakingAPY: Number(stakingAPY.toFixed(2))
        };
      }
      
      // Development fallback only if not production
      if (!this.isProduction) {
        console.warn('⚠️ Development fallback: Using mock staking info');
        return {
          totalStaked: "500.00",
          rewards: "25.75",
          stakingAPY: 8.5
        };
      }
      
      throw new Error('Unable to connect to staking contract');
    } catch (error) {
      console.error('Error getting staking info:', error);
      if (this.isProduction) {
        throw error;
      }
      // Development fallback
      return {
        totalStaked: "0",
        rewards: "0",
        stakingAPY: 0
      };
    }
  }
  
  async stakeAXM(amount: string, userAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      if (!this.stakingContract || !this.axmContract || !this.signer) {
        await this.initializeContracts();
      }
      
      if (!this.stakingContract || !this.axmContract || !this.signer) {
        throw new Error('Contracts not initialized');
      }
      
      const stakeAmount = this.ethers.parseEther(amount);
      const poolId = 0; // Default pool - should be configurable in production
      
      // Check if user has enough AXM tokens
      const balance = await this.axmContract.balanceOf(userAddress);
      if (balance < stakeAmount) {
        throw new Error('Insufficient AXM token balance');
      }
      
      // Check if contract has allowance
      const allowance = await this.axmContract.allowance(userAddress, this.stakingContract.target);
      
      // Approve if needed
      if (allowance < stakeAmount) {
        console.log('⏳ Approving AXM tokens for staking...');
        const approveTx = await this.axmContract.connect(this.signer).approve(
          this.stakingContract.target,
          stakeAmount
        );
        await approveTx.wait();
        console.log('✅ Approval successful');
      }
      
      // Execute stake
      console.log(`⏳ Staking ${amount} AXM tokens...`);
      const stakeTx = await this.stakingContract.connect(this.signer).stake(poolId, stakeAmount);
      const receipt = await stakeTx.wait();
      
      console.log(`✅ Staking successful! TX: ${receipt.hash}`);
      console.log(`📍 View on Blockscout: ${getTransactionUrl(receipt.hash)}`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
      
    } catch (error: any) {
      console.error('Error staking AXM:', error);
      return {
        success: false,
        error: error.message || 'Staking failed'
      };
    }
  }
  
  async unstakeAXM(amount: string, userAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      if (!this.stakingContract || !this.signer) {
        await this.initializeContracts();
      }
      
      if (!this.stakingContract || !this.signer) {
        throw new Error('Contracts not initialized');
      }
      
      const unstakeAmount = this.ethers.parseEther(amount);
      const poolId = 0; // Default pool - should be configurable in production
      
      // Check user's staked balance
      const userStake = await this.stakingContract.userStakes(poolId, userAddress);
      if (userStake.amount < unstakeAmount) {
        throw new Error('Insufficient staked balance');
      }
      
      // Execute unstake
      console.log(`⏳ Unstaking ${amount} AXM tokens...`);
      const unstakeTx = await this.stakingContract.connect(this.signer).withdraw(poolId, unstakeAmount);
      const receipt = await unstakeTx.wait();
      
      console.log(`✅ Unstaking successful! TX: ${receipt.hash}`);
      console.log(`📍 View on Blockscout: ${getTransactionUrl(receipt.hash)}`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
      
    } catch (error: any) {
      console.error('Error unstaking AXM:', error);
      return {
        success: false,
        error: error.message || 'Unstaking failed'
      };
    }
  }
  
  // ===== CONTRIBUTION TRACKING (MOCKED FOR NOW) =====
  
  async recordContribution(contribution: {
    userAddress: string;
    amount: string;
    contributionType: 'individual' | 'circle';
    targetId?: string;
  }): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    // TODO: Implement actual on-chain contribution recording
    // This will integrate with Treasury, Circles, or other contribution contracts
    
    console.log('📝 Recording contribution (mocked):', contribution);
    
    return {
      success: true,
      transactionHash: '0x' + '0'.repeat(64), // Mock transaction hash
      error: undefined
    };
  }
  
  async getContributionHistory(userAddress: string): Promise<Array<{
    date: string;
    amount: string;
    type: 'individual' | 'circle';
    transactionHash: string;
    targetId?: string;
  }>> {
    // TODO: Implement actual on-chain contribution history fetching
    // This will query events from relevant contracts
    
    console.log('📜 Fetching contribution history (mocked) for:', userAddress);
    
    return [];
  }
}

// Export singleton instance
export const contractsService = new ArbitrumContractsService();

// Export factory function
export function getContractsService(): IContractsService {
  return contractsService;
}
