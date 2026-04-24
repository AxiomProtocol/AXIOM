// Airdrop service to handle Merkle proof verification and claims
export interface AirdropEligibility {
  eligible: boolean;
  amount?: string;
  proof?: string[];
  claimed?: boolean;
  error?: string;
}

export interface AirdropClaim {
  walletAddress: string;
  amount: string;
  merkleProof: string[];
}

export const airdropService = {
  // Check airdrop eligibility
  async checkEligibility(walletAddress: string): Promise<AirdropEligibility> {
    try {
      const response = await fetch('/api/airdrop/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        const errorData = await response.json();
        return {
          eligible: false,
          error: errorData.error || 'Failed to check eligibility'
        };
      }
    } catch (error: any) {
      console.error('Error checking airdrop eligibility:', error);
      return {
        eligible: false,
        error: error.message || 'Failed to check eligibility'
      };
    }
  },

  // Claim airdrop tokens
  async claimAirdrop(claim: AirdropClaim): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const response = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claim)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, txHash: result.txHash };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Error claiming airdrop:', error);
      return { success: false, error: error.message };
    }
  },

  // Validate Merkle proof format
  validateMerkleProof(proofString: string): { valid: boolean; proof?: string[]; error?: string } {
    try {
      const proof = JSON.parse(proofString);
      
      if (!Array.isArray(proof)) {
        return { valid: false, error: 'Proof must be a JSON array' };
      }
      
      if (proof.length === 0) {
        return { valid: false, error: 'Proof array cannot be empty' };
      }
      
      // Check if all elements are valid hex strings
      const hexRegex = /^0x[a-fA-F0-9]+$/;
      for (const element of proof) {
        if (typeof element !== 'string' || !hexRegex.test(element)) {
          return { valid: false, error: 'All proof elements must be valid hex strings starting with 0x' };
        }
      }
      
      return { valid: true, proof };
    } catch (error) {
      return { valid: false, error: 'Invalid JSON format' };
    }
  }
};
