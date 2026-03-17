/**
 * AXM/AXUSD Reward & Verification Service
 * Phase 10: Integration with Arbitrum for verified data contributions
 * Distributes AXM tokens to field contributors and settles AXUSD for verified costs
 */

import axios from "axios";
import { Wallet, Contract, ethers } from "ethers";

export interface ContributionReward {
  contributorId: string;
  dealId: string;
  contributionType: "field_inspection" | "outcome_submission" | "verification";
  axmReward: number; // Amount of AXM tokens
  reasonForReward: string;
  transactionHash?: string;
}

export interface VerifiedCostSettlement {
  dealId: string;
  settlementType: "rehab_cost" | "financing_cost" | "disposition_cost";
  verifiedAmount: number;
  axusdAmount: number; // Stablecoin settlement
  operatorId: string;
  verificationMethod: string;
  arbitrumProofHash?: string;
}

export class AXMRewardService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private axmContract: ethers.Contract;
  private axusdContract: ethers.Contract;

  constructor(
    arbitrumRpcUrl: string = "https://arb1.arbitrum.io/rpc",
    privateKey: string = process.env.AXIOM_OPERATOR_KEY || "",
    axmTokenAddress: string = process.env.AXM_TOKEN_ADDRESS || "",
    axusdTokenAddress: string = process.env.AXUSD_TOKEN_ADDRESS || ""
  ) {
    this.provider = new ethers.JsonRpcProvider(arbitrumRpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);

    // AXM token contract (ERC20)
    const erc20Abi = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address account) returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
    ];

    this.axmContract = new Contract(axmTokenAddress, erc20Abi, this.signer);
    this.axusdContract = new Contract(axusdTokenAddress, erc20Abi, this.signer);
  }

  /**
   * Reward field inspector for submitting inspection data
   */
  async rewardFieldInspector(
    contributorAddress: string,
    dealId: string,
    samplingConfidence: number,
    deficiencyCount: number
  ): Promise<ContributionReward> {
    try {
      // Calculate reward based on sampling quality and deficiency detection
      let baseReward = 100; // Base AXM
      const qualityBonus =
        samplingConfidence >= 0.8
          ? 50
          : samplingConfidence >= 0.5
            ? 25
            : 0;
      const discoveryBonus = Math.min(deficiencyCount * 5, 200); // Up to 200 AXM for findings

      const totalReward = baseReward + qualityBonus + discoveryBonus;

      // Transfer AXM tokens to contributor
      const tx = await this.axmContract.transfer(
        contributorAddress,
        ethers.parseUnits(totalReward.toString(), 18)
      );

      await tx.wait();

      return {
        contributorId: contributorAddress,
        dealId,
        contributionType: "field_inspection",
        axmReward: totalReward,
        reasonForReward: `Field inspection: ${samplingConfidence.toFixed(0)}% sampling, ${deficiencyCount} deficiencies detected`,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error("[AXMReward] Error rewarding field inspector:", error);
      throw error;
    }
  }

  /**
   * Reward outcome verifier for submitting actual results
   */
  async rewardOutcomeVerifier(
    verifierAddress: string,
    dealId: string,
    varianceFromPrediction: number // Percent
  ): Promise<ContributionReward> {
    try {
      // Reward accuracy: closer to 0% variance = more reward
      const accuracyBonus =
        Math.abs(varianceFromPrediction) < 5
          ? 200
          : Math.abs(varianceFromPrediction) < 15
            ? 100
            : 50;

      const reward = 150 + accuracyBonus; // Base + accuracy bonus

      const tx = await this.axmContract.transfer(
        verifierAddress,
        ethers.parseUnits(reward.toString(), 18)
      );

      await tx.wait();

      return {
        contributorId: verifierAddress,
        dealId,
        contributionType: "outcome_submission",
        axmReward: reward,
        reasonForReward: `Outcome verification: ${Math.abs(varianceFromPrediction).toFixed(1)}% variance from prediction`,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error("[AXMReward] Error rewarding verifier:", error);
      throw error;
    }
  }

  /**
   * Settle verified cost against capital commitment
   * Uses AXUSD stablecoin for precision cost tracking
   */
  async settleVerifiedCost(
    dealId: string,
    operatorAddress: string,
    settlementType: "rehab_cost" | "financing_cost" | "disposition_cost",
    verifiedAmount: number,
    verificationHash: string
  ): Promise<VerifiedCostSettlement> {
    try {
      // Convert verified amount to AXUSD (1:1 by definition)
      const axusdAmount = verifiedAmount;

      // Record settlement on-chain with verification hash
      // (This would normally call a custom contract function)
      const settlementTx = {
        from: operatorAddress,
        to: "0x" + "0".repeat(40), // Settlement contract address
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "string", "uint256", "bytes32"],
          [
            dealId,
            settlementType,
            ethers.parseUnits(axusdAmount.toString(), 6), // USDC 6 decimals
            verificationHash,
          ]
        ),
      };

      // In production, would execute settlement transaction
      // For now, mock the response
      return {
        dealId,
        settlementType,
        verifiedAmount,
        axusdAmount,
        operatorId: operatorAddress,
        verificationMethod: `On-chain verification: ${verificationHash}`,
        arbitrumProofHash: verificationHash,
      };
    } catch (error) {
      console.error("[AXMReward] Error settling verified cost:", error);
      throw error;
    }
  }

  /**
   * Create verification proof hash for Arbitrum
   * Encodes deal data for permanent on-chain record
   */
  async createVerificationProof(
    dealId: string,
    actualResults: {
      rehabCost: number;
      timelineDays: number;
      exitValue: number;
    }
  ): Promise<string> {
    try {
      // Create deterministic hash from deal data
      const proofData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "uint256", "uint256", "uint256"],
        [
          dealId,
          ethers.parseUnits(actualResults.rehabCost.toString(), 18),
          actualResults.timelineDays,
          ethers.parseUnits(actualResults.exitValue.toString(), 18),
        ]
      );

      const proofHash = ethers.keccak256(proofData);

      // Store proof hash on-chain (in production)
      // For now, return the hash
      return proofHash;
    } catch (error) {
      console.error("[AXMReward] Error creating verification proof:", error);
      throw error;
    }
  }

  /**
   * Get AXM balance for address
   */
  async getAXMBalance(address: string): Promise<number> {
    try {
      const balance = await this.axmContract.balanceOf(address);
      return parseFloat(ethers.formatUnits(balance, 18));
    } catch (error) {
      console.error("[AXMReward] Error fetching AXM balance:", error);
      throw error;
    }
  }

  /**
   * Verify transaction on Arbitrum
   */
  async verifyTransaction(transactionHash: string): Promise<{
    confirmed: boolean;
    blockNumber: number;
    timestamp: number;
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(transactionHash);

      if (!receipt) {
        return { confirmed: false, blockNumber: 0, timestamp: 0 };
      }

      const block = await this.provider.getBlock(receipt.blockNumber);

      return {
        confirmed: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        timestamp: block!.timestamp,
      };
    } catch (error) {
      console.error("[AXMReward] Error verifying transaction:", error);
      throw error;
    }
  }
}

// Singleton instance
let axmService: AXMRewardService | null = null;

export function getAXMService(): AXMRewardService {
  if (!axmService) {
    axmService = new AXMRewardService();
  }
  return axmService;
}
