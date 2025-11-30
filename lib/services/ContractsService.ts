/**
 * ContractsService - Abstraction layer for all blockchain contract interactions
 * 
 * This interface provides a unified way to interact with:
 * 1. Existing SWF token contracts on BSC
 * 2. Future KeyGrow rent-to-own contracts (mocked for now)
 * 3. Any other smart contract integrations
 * 
 * The service preserves existing BSC functionality while providing
 * integration points for new wealth-building features.
 */

export interface IContractsService {
  // ===== EXISTING SWF TOKEN FUNCTIONALITY =====
  
  /**
   * Get SWF token balance for an address
   */
  getSWFBalance(address: string): Promise<string>;
  
  /**
   * Get staking information for user
   */
  getStakingInfo(address: string): Promise<{
    totalStaked: string;
    rewards: string;
    stakingAPY: number;
  }>;
  
  /**
   * Stake SWF tokens
   */
  stakeSWF(amount: string, userAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }>;
  
  /**
   * Unstake SWF tokens
   */
  unstakeSWF(amount: string, userAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }>;

  // ===== KEYGROW RENT-TO-OWN PATHWAY (MOCKED) =====
  
  /**
   * Generate readiness proof for rent-to-own qualification
   * This will be replaced with real KeyGrow contracts later
   */
  generateReadinessProof(userAddress: string, requirements: {
    creditScore?: number;
    savingsAmount: string;
    incomeVerification: boolean;
    documentsComplete: boolean;
  }): Promise<{
    isReady: boolean;
    score: number;
    recommendations: string[];
    proofHash?: string;
  }>;
  
  /**
   * Create agreement draft for property purchase
   * This will be replaced with real KeyGrow contracts later
   */
  createAgreementDraft(userAddress: string, propertyDetails: {
    propertyId: string;
    targetPrice: string;
    monthlyPayment: string;
    termMonths: number;
  }): Promise<{
    success: boolean;
    agreementId?: string;
    monthlyPayment: string;
    totalCost: string;
    error?: string;
  }>;
  
  /**
   * Get user's property agreements
   */
  getUserAgreements(userAddress: string): Promise<Array<{
    agreementId: string;
    propertyId: string;
    status: 'draft' | 'active' | 'completed' | 'defaulted';
    monthlyPayment: string;
    remainingBalance: string;
    nextPaymentDate: string;
  }>>;

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
 * BSCContractsService - Real BSC blockchain contract interactions
 * Restores proper staking integration with BSC mainnet/testnet
 */
export class BSCContractsService implements IContractsService {
  private ethers: any;
  private swfContract: any;
  private stakingContract: any;
  private provider: any;
  private signer: any;
  private isProduction: boolean;
  
  // BSC Network Configuration
  private readonly BSC_MAINNET_CHAIN_ID = 56;
  private readonly BSC_TESTNET_CHAIN_ID = 97;
  private readonly SWF_CONTRACT_ADDRESS = '0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738';
  
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
      
      // Validate BSC network
      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);
      
      if (currentChainId !== this.BSC_MAINNET_CHAIN_ID && currentChainId !== this.BSC_TESTNET_CHAIN_ID) {
        console.warn(`Wrong network. Please switch to BSC. Current: ${currentChainId}`);
        if (this.isProduction) {
          throw new Error('BSC network required for staking operations');
        }
      }
      
      this.provider = new this.ethers.BrowserProvider((window as any).ethereum);
      this.signer = await this.provider.getSigner();
      
      // SWF Token Contract ABI (Basic ERC20 + custom functions)
      const SWF_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function transferFrom(address from, address to, uint256 amount) returns (bool)"
      ];
      
      // Staking Contract ABI (GovernanceDividendPool)
      const STAKING_ABI = [
        "function stake(uint256 amount) external",
        "function withdraw(uint256 amount) external", 
        "function claim() external",
        "function stakes(address user) view returns (uint256)",
        "function totalStaked() view returns (uint256)",
        "function lastClaim(address user) view returns (uint256)",
        "function rewardRate() view returns (uint256)",
        "function swfToken() view returns (address)"
      ];
      
      this.swfContract = new this.ethers.Contract(this.SWF_CONTRACT_ADDRESS, SWF_ABI, this.provider);
      
      // TODO: Get actual staking contract address from deployment
      // For now, using SWF contract address as placeholder - needs real staking contract address
      const STAKING_CONTRACT_ADDRESS = this.SWF_CONTRACT_ADDRESS; // This needs to be updated with real staking contract
      this.stakingContract = new this.ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, this.provider);
      
      console.log('✅ BSC contracts initialized successfully');
      console.log(`🌐 Network: ${currentChainId === this.BSC_MAINNET_CHAIN_ID ? 'BSC Mainnet' : 'BSC Testnet'}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize BSC contracts:', error);
      if (this.isProduction) {
        throw error;
      }
    }
  }
  
  // ===== SWF TOKEN IMPLEMENTATION =====
  
  async getSWFBalance(address: string): Promise<string> {
    try {
      if (!this.swfContract) {
        await this.initializeContracts();
      }
      
      if (this.swfContract) {
        const balance = await this.swfContract.balanceOf(address);
        return this.ethers.formatEther(balance);
      }
      
      // Development fallback only if not production
      if (!this.isProduction) {
        console.warn('⚠️ Development fallback: Using mock SWF balance');
        return "1250.50";
      }
      
      throw new Error('Unable to connect to BSC network');
    } catch (error) {
      console.error('Error getting SWF balance:', error);
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
        const [userStaked, lastClaimTime, rewardRate] = await Promise.all([
          this.stakingContract.stakes(address),
          this.stakingContract.lastClaim(address),
          this.stakingContract.rewardRate()
        ]);
        
        const totalStaked = this.ethers.formatEther(userStaked);
        
        // Calculate pending rewards based on time since last claim
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = currentTime - Number(lastClaimTime);
        const pendingRewards = (Number(totalStaked) * Number(rewardRate) * timeDiff) / (30 * 24 * 60 * 60) / 1e18;
        
        // Convert reward rate to APY (simplified calculation)
        const stakingAPY = (Number(rewardRate) * 12) / 1e18 * 100;
        
        return {
          totalStaked,
          rewards: pendingRewards.toFixed(8),
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
  
  async stakeSWF(amount: string, userAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      if (!this.stakingContract || !this.swfContract || !this.signer) {
        await this.initializeContracts();
      }
      
      if (!this.stakingContract || !this.swfContract || !this.signer) {
        throw new Error('Contracts not initialized');
      }
      
      const stakeAmount = this.ethers.parseEther(amount);
      
      // Check if user has enough SWF tokens
      const balance = await this.swfContract.balanceOf(userAddress);
      if (balance < stakeAmount) {
        throw new Error('Insufficient SWF token balance');
      }
      
      // Check if contract has allowance
      const allowance = await this.swfContract.allowance(userAddress, this.stakingContract.target);
      
      let approveTx;
      if (allowance < stakeAmount) {
        // Approve staking contract to spend SWF tokens
        console.log('🔓 Approving SWF tokens for staking...');
        const swfWithSigner = this.swfContract.connect(this.signer);
        approveTx = await swfWithSigner.approve(this.stakingContract.target, stakeAmount);
        await approveTx.wait();
        console.log('✅ SWF tokens approved for staking');
      }
      
      // Execute stake transaction
      console.log(`🔐 Staking ${amount} SWF tokens...`);
      const stakingWithSigner = this.stakingContract.connect(this.signer);
      const stakeTx = await stakingWithSigner.stake(stakeAmount);
      
      console.log('⏳ Waiting for stake transaction confirmation...');
      const receipt = await stakeTx.wait();
      
      console.log(`✅ Staking successful! Tx: ${receipt.hash}`);
      return {
        success: true,
        transactionHash: receipt.hash
      };
      
    } catch (error) {
      console.error('❌ Staking failed:', error);
      
      // In production, don't use mock - return actual error
      if (this.isProduction) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown staking error'
        };
      }
      
      // Development fallback with mock transaction
      console.warn('⚠️ Development fallback: Using mock staking transaction');
      const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64);
      return {
        success: true,
        transactionHash: mockTxHash
      };
    }
  }
  
  async unstakeSWF(amount: string, userAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      if (!this.stakingContract || !this.signer) {
        await this.initializeContracts();
      }
      
      if (!this.stakingContract || !this.signer) {
        throw new Error('Staking contract not initialized');
      }
      
      const unstakeAmount = this.ethers.parseEther(amount);
      
      // Check if user has enough staked tokens
      const stakedBalance = await this.stakingContract.stakes(userAddress);
      if (stakedBalance < unstakeAmount) {
        throw new Error('Insufficient staked balance');
      }
      
      // Execute unstake transaction (includes automatic rewards claim)
      console.log(`🔓 Unstaking ${amount} SWF tokens...`);
      const stakingWithSigner = this.stakingContract.connect(this.signer);
      const unstakeTx = await stakingWithSigner.withdraw(unstakeAmount);
      
      console.log('⏳ Waiting for unstake transaction confirmation...');
      const receipt = await unstakeTx.wait();
      
      console.log(`✅ Unstaking successful! Tx: ${receipt.hash}`);
      return {
        success: true,
        transactionHash: receipt.hash
      };
      
    } catch (error) {
      console.error('❌ Unstaking failed:', error);
      
      // In production, don't use mock - return actual error
      if (this.isProduction) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown unstaking error'
        };
      }
      
      // Development fallback with mock transaction
      console.warn('⚠️ Development fallback: Using mock unstaking transaction');
      const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64);
      return {
        success: true,
        transactionHash: mockTxHash
      };
    }
  }
  
  // ===== KEYGROW MOCKED IMPLEMENTATION =====
  
  async generateReadinessProof(userAddress: string, requirements: {
    creditScore?: number;
    savingsAmount: string;
    incomeVerification: boolean;
    documentsComplete: boolean;
  }): Promise<{
    isReady: boolean;
    score: number;
    recommendations: string[];
    proofHash?: string;
  }> {
    const { creditScore = 650, savingsAmount, incomeVerification, documentsComplete } = requirements;
    
    // Calculate readiness score (0-100)
    let score = 0;
    const recommendations: string[] = [];
    
    // Credit score factor (40% weight)
    if (creditScore >= 700) {
      score += 40;
    } else if (creditScore >= 650) {
      score += 30;
      recommendations.push("Improve credit score to 700+ for better terms");
    } else {
      score += 15;
      recommendations.push("Focus on building credit score above 650");
    }
    
    // Savings factor (30% weight)
    const savings = parseFloat(savingsAmount);
    if (savings >= 10000) {
      score += 30;
    } else if (savings >= 5000) {
      score += 20;
      recommendations.push("Build savings to $10,000 for optimal readiness");
    } else {
      score += 10;
      recommendations.push("Increase savings to at least $5,000 before applying");
    }
    
    // Income verification (15% weight)
    if (incomeVerification) {
      score += 15;
    } else {
      recommendations.push("Complete income verification to improve readiness");
    }
    
    // Documents (15% weight)
    if (documentsComplete) {
      score += 15;
    } else {
      recommendations.push("Complete all required documentation");
    }
    
    const isReady = score >= 75;
    const proofHash = isReady ? "0x" + Math.random().toString(16).substr(2, 64) : undefined;
    
    return {
      isReady,
      score,
      recommendations,
      proofHash
    };
  }
  
  async createAgreementDraft(userAddress: string, propertyDetails: {
    propertyId: string;
    targetPrice: string;
    monthlyPayment: string;
    termMonths: number;
  }): Promise<{
    success: boolean;
    agreementId?: string;
    monthlyPayment: string;
    totalCost: string;
    error?: string;
  }> {
    const { targetPrice, monthlyPayment, termMonths } = propertyDetails;
    
    try {
      // Calculate total cost with interest (simplified)
      const monthlyAmount = parseFloat(monthlyPayment);
      const totalCost = (monthlyAmount * termMonths * 1.05).toString(); // 5% total interest
      
      const agreementId = "AGR-" + Math.random().toString(36).substr(2, 9);
      
      return {
        success: true,
        agreementId,
        monthlyPayment,
        totalCost
      };
    } catch (error) {
      return {
        success: false,
        monthlyPayment,
        totalCost: targetPrice,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async getUserAgreements(userAddress: string): Promise<Array<{
    agreementId: string;
    propertyId: string;
    status: 'draft' | 'active' | 'completed' | 'defaulted';
    monthlyPayment: string;
    remainingBalance: string;
    nextPaymentDate: string;
  }>> {
    // Return mock agreements for development
    return [
      {
        agreementId: "AGR-demo123",
        propertyId: "PROP-001",
        status: 'active',
        monthlyPayment: "1250.00",
        remainingBalance: "85000.00",
        nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }
  
  // ===== CONTRIBUTION TRACKING =====
  
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
    try {
      // TODO: Implement on-chain contribution recording
      const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64);
      
      return {
        success: true,
        transactionHash: mockTxHash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async getContributionHistory(userAddress: string): Promise<Array<{
    date: string;
    amount: string;
    type: 'individual' | 'circle';
    transactionHash: string;
    targetId?: string;
  }>> {
    // Return mock history for development
    return [
      {
        date: new Date().toISOString(),
        amount: "250.00",
        type: 'individual',
        transactionHash: "0x" + Math.random().toString(16).substr(2, 64)
      },
      {
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: "100.00",
        type: 'circle',
        transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
        targetId: "circle-123"
      }
    ];
  }
}

// Export singleton instance
export const contractsService = new BSCContractsService();

// Helper function to get contracts service with proper typing
export function getContractsService(): IContractsService {
  return contractsService;
}