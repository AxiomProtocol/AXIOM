// Staking service to handle real staking functionality
export interface StakingData {
  totalStaked: string;
  totalRewards: string;
  currentAPY: string;
  pendingRewards: string;
  totalStakers: number;
  userStakeAmount?: string;
  userRewards?: string;
  lockPeriod?: number;
}

export interface StakeTransaction {
  amount: string;
  lockPeriod: number; // in days
  walletAddress: string;
}

export const stakingService = {
  // Get staking summary data
  async getStakingSummary(): Promise<StakingData> {
    try {
      const response = await fetch('/api/staking/summary');
      if (response.ok) {
        return await response.json();
      }
      
      // Fallback data if API fails
      return {
        totalStaked: '0',
        totalRewards: '0',
        currentAPY: '12.5',
        pendingRewards: '0',
        totalStakers: 0
      };
    } catch (error) {
      console.error('Error fetching staking summary:', error);
      return {
        totalStaked: '0',
        totalRewards: '0',
        currentAPY: '12.5',
        pendingRewards: '0',
        totalStakers: 0
      };
    }
  },

  // Get user staking position
  async getUserStaking(walletAddress: string): Promise<Partial<StakingData>> {
    try {
      const response = await fetch('/api/staking/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      return {
        userStakeAmount: '0',
        userRewards: '0',
        lockPeriod: 0
      };
    } catch (error) {
      console.error('Error fetching user staking:', error);
      return {
        userStakeAmount: '0',
        userRewards: '0',
        lockPeriod: 0
      };
    }
  },

  // Stake tokens
  async stakeTokens(transaction: StakeTransaction): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const response = await fetch('/api/staking/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, txHash: result.txHash };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Error staking tokens:', error);
      return { success: false, error: error.message };
    }
  },

  // Claim rewards
  async claimRewards(walletAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const response = await fetch('/api/staking/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, txHash: result.txHash };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      return { success: false, error: error.message };
    }
  }
};
