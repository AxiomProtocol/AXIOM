/**
 * Axiom Smart City - Delegation Framework Service
 * Enables governance delegation using @metamask/delegation-toolkit
 * Network: Arbitrum One (Chain ID: 42161)
 */

import { ethers } from 'ethers';
import { CORE_CONTRACTS } from '../../shared/contracts';

export interface Delegation {
  delegator: string;
  delegatee: string;
  tokenAmount: string;
  timestamp: number;
  transactionHash?: string;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  status: 'pending' | 'active' | 'succeeded' | 'defeated' | 'executed';
  startBlock: number;
  endBlock: number;
}

export interface VotingPower {
  direct: string;
  delegated: string;
  total: string;
}

export class DelegationService {
  private static instance: DelegationService;
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;

  // ABI snippets for governance
  private readonly AXM_GOVERNANCE_ABI = [
    'function delegate(address delegatee) external',
    'function delegates(address delegator) view returns (address)',
    'function getVotes(address account) view returns (uint256)',
    'function getPastVotes(address account, uint256 blockNumber) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)',
    'event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance)'
  ];

  private constructor() {}

  static getInstance(): DelegationService {
    if (!DelegationService.instance) {
      DelegationService.instance = new DelegationService();
    }
    return DelegationService.instance;
  }

  /**
   * Initialize with provider and signer
   */
  initialize(provider: ethers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    console.log('✅ Delegation service initialized');
  }

  /**
   * Get AXM token contract instance
   */
  private getAXMContract(withSigner: boolean = false): ethers.Contract {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const contractProvider = withSigner && this.signer ? this.signer : this.provider;
    
    return new ethers.Contract(
      CORE_CONTRACTS.AXM_TOKEN,
      this.AXM_GOVERNANCE_ABI,
      contractProvider
    );
  }

  /**
   * Delegate voting power to another address
   */
  async delegateVotes(delegateeAddress: string): Promise<string> {
    try {
      if (!this.signer) {
        throw new Error('Signer not initialized. Please connect your wallet.');
      }

      console.log('🗳️ Delegating votes to:', delegateeAddress);

      // Validate address
      if (!ethers.isAddress(delegateeAddress)) {
        throw new Error('Invalid delegatee address');
      }

      const axmContract = this.getAXMContract(true);
      
      // Send delegation transaction
      const tx = await axmContract.delegate(delegateeAddress);
      console.log('⏳ Delegation transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Delegation confirmed! Block:', receipt.blockNumber);

      return tx.hash;
    } catch (error: any) {
      console.error('❌ Delegation error:', error);
      throw new Error(error.message || 'Failed to delegate votes');
    }
  }

  /**
   * Get current delegate for an address
   */
  async getCurrentDelegate(address: string): Promise<string> {
    try {
      const axmContract = this.getAXMContract();
      const delegate = await axmContract.delegates(address);
      
      return delegate;
    } catch (error) {
      console.error('❌ Failed to get current delegate:', error);
      return ethers.ZeroAddress;
    }
  }

  /**
   * Get voting power for an address
   */
  async getVotingPower(address: string): Promise<VotingPower> {
    try {
      const axmContract = this.getAXMContract();
      
      // Get current votes (includes delegated votes)
      const totalVotes = await axmContract.getVotes(address);
      
      // Get direct token balance
      const directBalance = await axmContract.balanceOf(address);
      
      // Get current delegate
      const delegate = await axmContract.delegates(address);
      
      // Calculate delegated power
      // If delegated to someone else, direct voting power is 0
      const isDelegated = delegate !== ethers.ZeroAddress && delegate !== address;
      
      return {
        direct: isDelegated ? '0' : ethers.formatEther(directBalance),
        delegated: ethers.formatEther(totalVotes - directBalance),
        total: ethers.formatEther(totalVotes)
      };
    } catch (error) {
      console.error('❌ Failed to get voting power:', error);
      return {
        direct: '0',
        delegated: '0',
        total: '0'
      };
    }
  }

  /**
   * Get past voting power at a specific block
   */
  async getPastVotingPower(address: string, blockNumber: number): Promise<string> {
    try {
      const axmContract = this.getAXMContract();
      const pastVotes = await axmContract.getPastVotes(address, blockNumber);
      
      return ethers.formatEther(pastVotes);
    } catch (error) {
      console.error('❌ Failed to get past voting power:', error);
      return '0';
    }
  }

  /**
   * Delegate to self (activate voting power)
   */
  async activateVotingPower(userAddress: string): Promise<string> {
    try {
      console.log('🔓 Activating voting power for:', userAddress);
      
      // Check if already delegated
      const currentDelegate = await this.getCurrentDelegate(userAddress);
      
      if (currentDelegate === userAddress) {
        console.log('ℹ️ Voting power already activated');
        return '';
      }

      // Delegate to self to activate voting power
      return await this.delegateVotes(userAddress);
    } catch (error: any) {
      console.error('❌ Failed to activate voting power:', error);
      throw new Error(error.message || 'Failed to activate voting power');
    }
  }

  /**
   * Check if address has activated their voting power
   */
  async isVotingPowerActivated(address: string): Promise<boolean> {
    try {
      const delegate = await this.getCurrentDelegate(address);
      
      // Voting power is activated if delegated to any address (including self)
      return delegate !== ethers.ZeroAddress;
    } catch (error) {
      console.error('❌ Failed to check voting power status:', error);
      return false;
    }
  }

  /**
   * Get delegation history from blockchain events
   */
  async getDelegationHistory(address: string, fromBlock: number = 0): Promise<Delegation[]> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      const axmContract = this.getAXMContract();
      
      // Query DelegateChanged events
      const filter = axmContract.filters.DelegateChanged(address);
      const events = await axmContract.queryFilter(filter, fromBlock);
      
      const delegations: Delegation[] = [];
      
      for (const event of events) {
        const block = await event.getBlock();
        const args = event.args as any;
        
        delegations.push({
          delegator: args.delegator,
          delegatee: args.toDelegate,
          tokenAmount: '0', // Amount not directly available from event
          timestamp: block.timestamp,
          transactionHash: event.transactionHash
        });
      }
      
      return delegations.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('❌ Failed to get delegation history:', error);
      return [];
    }
  }

  /**
   * Get top delegates by voting power
   */
  async getTopDelegates(limit: number = 10): Promise<Array<{ address: string; votingPower: string }>> {
    try {
      // This would require off-chain indexing or The Graph
      // For now, return empty array
      console.warn('⚠️ Top delegates requires off-chain indexing');
      return [];
    } catch (error) {
      console.error('❌ Failed to get top delegates:', error);
      return [];
    }
  }

  /**
   * Estimate gas for delegation
   */
  async estimateDelegationGas(delegateeAddress: string): Promise<string> {
    try {
      if (!this.signer) {
        throw new Error('Signer not initialized');
      }

      const axmContract = this.getAXMContract(true);
      const gasEstimate = await axmContract.delegate.estimateGas(delegateeAddress);
      
      return ethers.formatUnits(gasEstimate, 'gwei');
    } catch (error) {
      console.error('❌ Failed to estimate gas:', error);
      return '0';
    }
  }

  /**
   * Check if an address is eligible to delegate
   */
  async isDelegationEligible(address: string): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const axmContract = this.getAXMContract();
      
      // Check AXM balance
      const balance = await axmContract.balanceOf(address);
      
      if (balance === 0n) {
        return {
          eligible: false,
          reason: 'No AXM tokens to delegate'
        };
      }

      return { eligible: true };
    } catch (error) {
      console.error('❌ Failed to check delegation eligibility:', error);
      return {
        eligible: false,
        reason: 'Failed to check eligibility'
      };
    }
  }
}

// Export singleton instance
export const delegationService = DelegationService.getInstance();
