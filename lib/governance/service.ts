/**
 * Governance Service
 * 
 * Handles voting operations with automatic fallback between
 * on-chain governance and API-based voting.
 */

import { ethers } from 'ethers';
import { 
  GOVERNANCE_CONFIG, 
  GOVERNANCE_ABI, 
  isOnchainVotingEnabled,
  getGovernanceContractAddress,
  getProposalState,
  type ProposalState
} from './config';
import { CORE_CONTRACTS, NETWORK_CONFIG } from '../../shared/contracts';

export interface VoteResult {
  success: boolean;
  txHash?: string;
  error?: string;
  method: 'onchain' | 'api';
}

export interface VotingPowerResult {
  votingPower: string;
  breakdown: {
    axmBalance: string;
    stakedBalance: string;
    delegatedPower?: string;
    nodePower?: string;
  };
  source: 'onchain' | 'api';
}

export interface ProposalInfo {
  id: string;
  state: ProposalState;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  startBlock: number;
  endBlock: number;
  hasVoted: boolean;
}

export class GovernanceService {
  private provider: ethers.JsonRpcProvider;
  
  constructor() {
    this.provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  }

  async castVote(
    proposalId: string,
    support: number,
    voterAddress: string,
    signer?: ethers.Signer
  ): Promise<VoteResult> {
    if (isOnchainVotingEnabled() && signer) {
      return this.castOnchainVote(proposalId, support, signer);
    }
    return this.castApiVote(proposalId, support, voterAddress);
  }

  private async castOnchainVote(
    proposalId: string,
    support: number,
    signer: ethers.Signer
  ): Promise<VoteResult> {
    try {
      const contractAddress = getGovernanceContractAddress();
      if (!contractAddress) {
        throw new Error('Governance contract not configured');
      }

      const contract = new ethers.Contract(contractAddress, GOVERNANCE_ABI, signer);
      const tx = await contract.castVote(proposalId, support);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
        method: 'onchain',
      };
    } catch (error: any) {
      console.error('On-chain vote failed, falling back to API:', error);
      const voterAddress = await signer.getAddress();
      return this.castApiVote(proposalId, support, voterAddress);
    }
  }

  private async castApiVote(
    proposalId: string,
    support: number,
    voterAddress: string
  ): Promise<VoteResult> {
    try {
      const response = await fetch('/api/governance/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, support, voterAddress }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to record vote');
      }

      return {
        success: true,
        method: 'api',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to cast vote',
        method: 'api',
      };
    }
  }

  async getVotingPower(walletAddress: string): Promise<VotingPowerResult> {
    if (isOnchainVotingEnabled()) {
      try {
        return await this.getOnchainVotingPower(walletAddress);
      } catch (error) {
        console.error('On-chain voting power failed, using API:', error);
      }
    }
    return this.getApiVotingPower(walletAddress);
  }

  private async getOnchainVotingPower(walletAddress: string): Promise<VotingPowerResult> {
    const contractAddress = getGovernanceContractAddress();
    if (!contractAddress) {
      throw new Error('Governance contract not configured');
    }

    const contract = new ethers.Contract(contractAddress, GOVERNANCE_ABI, this.provider);
    const power = await contract.getVotingPower(walletAddress);

    return {
      votingPower: ethers.formatEther(power),
      breakdown: {
        axmBalance: '0',
        stakedBalance: '0',
      },
      source: 'onchain',
    };
  }

  private async getApiVotingPower(walletAddress: string): Promise<VotingPowerResult> {
    try {
      const response = await fetch(`/api/governance/voting-power?wallet=${walletAddress}`);
      const data = await response.json();

      return {
        votingPower: data.votingPower || '0',
        breakdown: data.breakdown || { axmBalance: '0', stakedBalance: '0' },
        source: 'api',
      };
    } catch (error) {
      return {
        votingPower: '0',
        breakdown: { axmBalance: '0', stakedBalance: '0' },
        source: 'api',
      };
    }
  }

  async hasVoted(proposalId: string, walletAddress: string): Promise<boolean> {
    if (isOnchainVotingEnabled()) {
      try {
        const contractAddress = getGovernanceContractAddress();
        if (contractAddress) {
          const contract = new ethers.Contract(contractAddress, GOVERNANCE_ABI, this.provider);
          return await contract.hasVoted(proposalId, walletAddress);
        }
      } catch (error) {
        console.error('hasVoted check failed:', error);
      }
    }
    
    return false;
  }

  async getProposalState(proposalId: string): Promise<ProposalState> {
    if (isOnchainVotingEnabled()) {
      try {
        const contractAddress = getGovernanceContractAddress();
        if (contractAddress) {
          const contract = new ethers.Contract(contractAddress, GOVERNANCE_ABI, this.provider);
          const stateNum = await contract.state(proposalId);
          return getProposalState(Number(stateNum));
        }
      } catch (error) {
        console.error('getProposalState failed:', error);
      }
    }
    
    return 'Active';
  }
}

export const governanceService = new GovernanceService();
