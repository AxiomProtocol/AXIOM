import { ethers } from 'ethers';
import { 
  CORE_CONTRACTS, 
  COMMUNITY_SAVINGS_CONTRACTS, 
  ADVANCED_DEFI_CONTRACTS,
  NETWORK_CONFIG 
} from '../../shared/contracts';
import { db } from '../../server/db';
import { 
  memberCredentials, 
  policyCommitments, 
  reputationEvents,
  users
} from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const IDENTITY_COMPLIANCE_ABI = [
  "function isVerified(address wallet) external view returns (bool)",
  "function getVerificationLevel(address wallet) external view returns (uint8)",
  "function getVerificationTimestamp(address wallet) external view returns (uint256)"
];

const STAKING_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function stakedBalance(address account) external view returns (uint256)",
  "function getStakeInfo(address account) external view returns (uint256 amount, uint256 since, uint256 tier)"
];

const REPUTATION_ORACLE_ABI = [
  "function getReputation(address wallet) external view returns (uint256 score, uint256 lastUpdate)",
  "function getCreditScore(address wallet) external view returns (uint256)"
];

const AXM_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)"
];

export interface PolicyCheckResult {
  passed: boolean;
  checks: {
    identityVerified: boolean;
    sufficientStake: boolean;
    commitmentSigned: boolean;
    reputationScore: number;
    axmBalance: string;
    stakedBalance: string;
  };
  errors: string[];
  warnings: string[];
}

export interface MemberCredentialData {
  walletAddress: string;
  isVerified: boolean;
  verificationLevel: number;
  verifiedAt: Date | null;
  reputationScore: number;
  completedRotations: number;
  defaultCount: number;
}

export class PolicyGuardService {
  private provider: ethers.JsonRpcProvider;
  private identityContract: ethers.Contract;
  private stakingContract: ethers.Contract;
  private reputationContract: ethers.Contract;
  private axmTokenContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    
    this.identityContract = new ethers.Contract(
      CORE_CONTRACTS.IDENTITY_COMPLIANCE,
      IDENTITY_COMPLIANCE_ABI,
      this.provider
    );

    this.stakingContract = new ethers.Contract(
      CORE_CONTRACTS.STAKING_EMISSIONS,
      STAKING_ABI,
      this.provider
    );

    this.reputationContract = new ethers.Contract(
      ADVANCED_DEFI_CONTRACTS.REPUTATION_ORACLE,
      REPUTATION_ORACLE_ABI,
      this.provider
    );

    this.axmTokenContract = new ethers.Contract(
      CORE_CONTRACTS.AXM_TOKEN,
      AXM_TOKEN_ABI,
      this.provider
    );
  }

  async checkIdentityVerification(walletAddress: string): Promise<{ verified: boolean; level: number; timestamp: number }> {
    try {
      const [isVerified, level, timestamp] = await Promise.all([
        this.identityContract.isVerified(walletAddress).catch(() => false),
        this.identityContract.getVerificationLevel(walletAddress).catch(() => 0),
        this.identityContract.getVerificationTimestamp(walletAddress).catch(() => 0)
      ]);
      
      return {
        verified: isVerified,
        level: Number(level),
        timestamp: Number(timestamp)
      };
    } catch (error) {
      console.error('Error checking identity verification:', error);
      return { verified: false, level: 0, timestamp: 0 };
    }
  }

  async getAxmBalance(walletAddress: string): Promise<string> {
    try {
      const balance = await this.axmTokenContract.balanceOf(walletAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting AXM balance:', error);
      return '0';
    }
  }

  async getStakedBalance(walletAddress: string): Promise<string> {
    try {
      const staked = await this.stakingContract.stakedBalance(walletAddress).catch(() => BigInt(0));
      return ethers.formatEther(staked);
    } catch (error) {
      console.error('Error getting staked balance:', error);
      return '0';
    }
  }

  async getReputationScore(walletAddress: string): Promise<number> {
    try {
      const [score] = await this.reputationContract.getReputation(walletAddress);
      return Number(score);
    } catch (error) {
      console.error('Error getting reputation score:', error);
      const dbCredential = await this.getMemberCredential(walletAddress);
      return dbCredential?.reputationScore || 50;
    }
  }

  async checkSufficientStake(walletAddress: string, requiredAmount: number): Promise<boolean> {
    const [axmBalance, stakedBalance] = await Promise.all([
      this.getAxmBalance(walletAddress),
      this.getStakedBalance(walletAddress)
    ]);
    
    const totalAvailable = parseFloat(axmBalance) + parseFloat(stakedBalance);
    return totalAvailable >= requiredAmount;
  }

  async hasSignedCommitment(walletAddress: string, poolId?: number): Promise<boolean> {
    try {
      const conditions: any[] = [eq(policyCommitments.walletAddress, walletAddress.toLowerCase())];
      
      if (poolId) {
        conditions.push(eq(policyCommitments.poolId, poolId));
      }
      
      const commitment = await db
        .select()
        .from(policyCommitments)
        .where(and(...conditions))
        .limit(1);
      
      return commitment.length > 0 && commitment[0].signedAt !== null;
    } catch (error) {
      console.error('Error checking commitment:', error);
      return false;
    }
  }

  async runPolicyChecks(
    walletAddress: string, 
    poolContributionAmount: number,
    poolId?: number
  ): Promise<PolicyCheckResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const requiredStake = poolContributionAmount * 1.5;
    
    const [identityCheck, axmBalance, stakedBalance, reputationScore, hasCommitment] = await Promise.all([
      this.checkIdentityVerification(walletAddress),
      this.getAxmBalance(walletAddress),
      this.getStakedBalance(walletAddress),
      this.getReputationScore(walletAddress),
      this.hasSignedCommitment(walletAddress, poolId)
    ]);
    
    const totalBalance = parseFloat(axmBalance) + parseFloat(stakedBalance);
    const sufficientStake = totalBalance >= requiredStake;
    
    if (!identityCheck.verified) {
      errors.push('Member Credential verification required. Please complete identity verification first.');
    }
    
    if (!sufficientStake) {
      errors.push(`Insufficient AXM balance. You need at least ${requiredStake.toFixed(2)} AXM (1.5x monthly contribution) as security deposit.`);
    }
    
    if (!hasCommitment && poolId) {
      errors.push('You must agree to the 2-rotation minimum commitment before joining.');
    }
    
    if (reputationScore < 30) {
      errors.push('Your reputation score is too low to join this group. Build trust by completing smaller commitments first.');
    } else if (reputationScore < 50) {
      warnings.push('Your reputation score is below average. You may only be assigned to later payout positions.');
    }
    
    const passed = errors.length === 0;
    
    return {
      passed,
      checks: {
        identityVerified: identityCheck.verified,
        sufficientStake,
        commitmentSigned: hasCommitment,
        reputationScore,
        axmBalance,
        stakedBalance
      },
      errors,
      warnings
    };
  }

  async getMemberCredential(walletAddress: string): Promise<MemberCredentialData | null> {
    try {
      const credential = await db
        .select()
        .from(memberCredentials)
        .where(eq(memberCredentials.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
      
      if (credential.length === 0) return null;
      
      const cred = credential[0];
      return {
        walletAddress: cred.walletAddress,
        isVerified: cred.isVerified ?? false,
        verificationLevel: cred.verificationLevel ?? 0,
        verifiedAt: cred.verifiedAt,
        reputationScore: cred.reputationScore ?? 50,
        completedRotations: cred.completedRotations ?? 0,
        defaultCount: cred.defaultCount ?? 0
      };
    } catch (error) {
      console.error('Error getting member credential:', error);
      return null;
    }
  }

  async createOrUpdateMemberCredential(data: Partial<MemberCredentialData> & { walletAddress: string }): Promise<void> {
    const normalizedAddress = data.walletAddress.toLowerCase();
    
    try {
      const existing = await this.getMemberCredential(normalizedAddress);
      
      if (existing) {
        await db
          .update(memberCredentials)
          .set({
            ...data,
            walletAddress: normalizedAddress,
            updatedAt: new Date()
          })
          .where(eq(memberCredentials.walletAddress, normalizedAddress));
      } else {
        await db.insert(memberCredentials).values({
          walletAddress: normalizedAddress,
          isVerified: data.isVerified || false,
          verificationLevel: data.verificationLevel || 0,
          reputationScore: data.reputationScore || 50,
          completedRotations: data.completedRotations || 0,
          defaultCount: data.defaultCount || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error creating/updating member credential:', error);
      throw error;
    }
  }

  async recordReputationEvent(
    walletAddress: string,
    eventType: 'contribution' | 'payout_received' | 'rotation_completed' | 'default' | 'early_exit' | 'on_time_payment',
    severity: 'positive' | 'neutral' | 'negative',
    details: Record<string, any>
  ): Promise<void> {
    try {
      const scoreChange = this.calculateScoreChange(eventType, severity);
      
      await db.insert(reputationEvents).values({
        walletAddress: walletAddress.toLowerCase(),
        eventType,
        severity,
        scoreChange,
        metadata: details,
        createdAt: new Date()
      });

      const credential = await this.getMemberCredential(walletAddress);
      if (credential) {
        const newScore = Math.max(0, Math.min(100, credential.reputationScore + scoreChange));
        await this.createOrUpdateMemberCredential({
          walletAddress,
          reputationScore: newScore,
          defaultCount: eventType === 'default' ? credential.defaultCount + 1 : credential.defaultCount,
          completedRotations: eventType === 'rotation_completed' ? credential.completedRotations + 1 : credential.completedRotations
        });
      }
    } catch (error) {
      console.error('Error recording reputation event:', error);
    }
  }

  private calculateScoreChange(eventType: string, severity: string): number {
    const changes: Record<string, Record<string, number>> = {
      contribution: { positive: 2, neutral: 1, negative: 0 },
      payout_received: { positive: 3, neutral: 1, negative: 0 },
      rotation_completed: { positive: 10, neutral: 5, negative: 0 },
      default: { positive: 0, neutral: -10, negative: -25 },
      early_exit: { positive: 0, neutral: -5, negative: -15 },
      on_time_payment: { positive: 3, neutral: 1, negative: 0 }
    };
    
    return changes[eventType]?.[severity] || 0;
  }

  async signCommitment(walletAddress: string, poolId: number, rotationCount: number = 2): Promise<void> {
    try {
      await db.insert(policyCommitments).values({
        walletAddress: walletAddress.toLowerCase(),
        poolId,
        minRotations: rotationCount,
        signedAt: new Date(),
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error signing commitment:', error);
      throw error;
    }
  }

  async getPayoutPosition(walletAddress: string, totalPositions: number): Promise<number> {
    const credential = await this.getMemberCredential(walletAddress);
    
    if (!credential || credential.completedRotations === 0) {
      const lastThreeStart = Math.max(1, totalPositions - 2);
      return lastThreeStart + Math.floor(Math.random() * 3);
    }
    
    if (credential.completedRotations >= 2 && credential.reputationScore >= 70) {
      return Math.floor(Math.random() * totalPositions) + 1;
    }
    
    const midStart = Math.floor(totalPositions / 2);
    return midStart + Math.floor(Math.random() * (totalPositions - midStart)) + 1;
  }

  async canEarlyExit(walletAddress: string, poolId: number): Promise<{ allowed: boolean; forfeitAmount: string; reason: string }> {
    const commitment = await db
      .select()
      .from(policyCommitments)
      .where(and(
        eq(policyCommitments.walletAddress, walletAddress.toLowerCase()),
        eq(policyCommitments.poolId, poolId)
      ))
      .limit(1);

    if (commitment.length === 0) {
      return { allowed: true, forfeitAmount: '0', reason: 'No commitment found' };
    }

    const credential = await this.getMemberCredential(walletAddress);
    const minRotations = commitment[0].minRotations ?? 2;
    const completedInPool = commitment[0].completedRotations ?? 0;

    if (completedInPool >= minRotations) {
      return { allowed: true, forfeitAmount: '0', reason: 'Commitment fulfilled' };
    }

    return { 
      allowed: true, 
      forfeitAmount: 'Security deposit + reputation penalty',
      reason: `Early exit before completing ${minRotations} rotations. Your security deposit will be forfeited and reputation will be penalized.`
    };
  }
}

export const policyGuardService = new PolicyGuardService();
