/**
 * AIP-001 V2 Contract Service
 * Service layer for interacting with Sovereign Banking System contracts
 * 
 * Contracts:
 * - AxiomScoreSBT: Credit scoring with Soulbound Tokens
 * - SusuInsuranceFund: Default insurance fund
 * - veAXM: Vote-escrowed AXM for governance
 * - AxiomFeeBurner: Fee collection and buyback/burn
 */

import { ethers } from 'ethers';
import { V2_SOVEREIGN_BANKING_CONTRACTS, CORE_CONTRACTS } from '../../shared/contracts';

// ABIs (minimal interfaces for frontend/backend use)
const AXIOM_SCORE_SBT_ABI = [
  "function getScore(address user) view returns (uint256)",
  "function getProfile(address user) view returns (tuple(uint256 score, uint256 totalLoans, uint256 successfulRepayments, uint256 defaults, uint256 lastUpdated, bool isActive))",
  "function hasMinimumScore(address user, uint256 minScore) view returns (bool)",
  "function getScoreTier(address user) view returns (string)",
  "function getPaymentCount(address user) view returns (uint256)",
  "function totalProfiles() view returns (uint256)",
  "function initializeProfile(address user) returns (uint256)",
  "event ScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore, string reason)"
];

const SUSU_INSURANCE_FUND_ABI = [
  "function totalFundBalance() view returns (uint256)",
  "function totalDiverted() view returns (uint256)",
  "function totalClaimsPaid() view returns (uint256)",
  "function pendingClaimsCount() view returns (uint256)",
  "function getCoverageCapacity() view returns (uint256)",
  "function getFundStats() view returns (tuple(uint256 balance, uint256 totalDiverted, uint256 totalPaid, uint256 pendingClaims, uint256 coverageRatio))",
  "function getClaim(uint256 claimId) view returns (tuple(uint256 claimId, uint256 poolId, address claimant, uint256 amount, string reason, uint256 submittedAt, uint256 processedAt, uint8 status, address processedBy))",
  "function submitClaim(uint256 poolId, uint256 amount, string reason) returns (uint256)",
  "event ClaimSubmitted(uint256 indexed claimId, uint256 indexed poolId, address indexed claimant, uint256 amount)",
  "event ClaimPaid(uint256 indexed claimId, address indexed recipient, uint256 amount)"
];

const VE_AXM_ABI = [
  "function balanceOf(address user) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function totalLocked() view returns (uint256)",
  "function totalLockers() view returns (uint256)",
  "function getLock(address user) view returns (tuple(uint256 amount, uint256 unlockTime, uint256 lockStart))",
  "function getClaimableRewards(address user) view returns (uint256)",
  "function currentRewardEpoch() view returns (uint256)",
  "function totalRewardsDistributed() view returns (uint256)",
  "function createLock(uint256 amount, uint256 lockDuration)",
  "function increaseLockAmount(uint256 additionalAmount)",
  "function extendLock(uint256 newDuration)",
  "function withdraw()",
  "function claimRewards(uint256 epochId)",
  "event Locked(address indexed user, uint256 amount, uint256 unlockTime, uint256 votingPower)",
  "event RewardsClaimed(address indexed user, uint256 indexed epochId, uint256 amount)"
];

const AXIOM_FEE_BURNER_ABI = [
  "function totalFeesCollected() view returns (uint256)",
  "function totalAxmBurned() view returns (uint256)",
  "function totalBuybacks() view returns (uint256)",
  "function pendingFees() view returns (uint256)",
  "function buybackThreshold() view returns (uint256)",
  "function canExecuteBuyback() view returns (bool)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getBuybackRecord(uint256 id) view returns (tuple(uint256 buybackId, uint256 feesUsed, uint256 axmPurchased, uint256 axmBurned, uint256 axmToVeHolders, uint256 timestamp, uint256 pricePerAxm))",
  "event BuybackExecuted(uint256 indexed buybackId, uint256 feesUsed, uint256 axmPurchased)",
  "event AxmBurned(uint256 amount, uint256 totalBurned)"
];

// Provider setup
function getProvider() {
  const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Contract instances
export function getAxiomScoreSBT(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.AXIOM_SCORE_SBT, AXIOM_SCORE_SBT_ABI, provider);
}

export function getSusuInsuranceFund(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.SUSU_INSURANCE_FUND, SUSU_INSURANCE_FUND_ABI, provider);
}

export function getVeAXM(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM, VE_AXM_ABI, provider);
}

export function getAxiomFeeBurner(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.AXIOM_FEE_BURNER, AXIOM_FEE_BURNER_ABI, provider);
}

// Credit Score Functions
export async function getCreditScore(userAddress: string): Promise<number> {
  const contract = getAxiomScoreSBT();
  const score = await contract.getScore(userAddress);
  return Number(score);
}

export async function getCreditProfile(userAddress: string) {
  const contract = getAxiomScoreSBT();
  const profile = await contract.getProfile(userAddress);
  return {
    score: Number(profile.score),
    totalLoans: Number(profile.totalLoans),
    successfulRepayments: Number(profile.successfulRepayments),
    defaults: Number(profile.defaults),
    lastUpdated: Number(profile.lastUpdated),
    isActive: profile.isActive
  };
}

export async function getCreditScoreTier(userAddress: string): Promise<string> {
  const contract = getAxiomScoreSBT();
  return await contract.getScoreTier(userAddress);
}

export async function hasMinimumCreditScore(userAddress: string, minScore: number): Promise<boolean> {
  const contract = getAxiomScoreSBT();
  return await contract.hasMinimumScore(userAddress, minScore);
}

// Insurance Fund Functions
export async function getInsuranceFundStats() {
  const contract = getSusuInsuranceFund();
  const stats = await contract.getFundStats();
  return {
    balance: ethers.formatEther(stats.balance),
    totalDiverted: ethers.formatEther(stats.totalDiverted),
    totalPaid: ethers.formatEther(stats.totalPaid),
    pendingClaims: Number(stats.pendingClaims),
    coverageRatio: Number(stats.coverageRatio) / 100 // Convert from basis points percentage
  };
}

export async function getInsuranceCoverageCapacity(): Promise<string> {
  const contract = getSusuInsuranceFund();
  const capacity = await contract.getCoverageCapacity();
  return ethers.formatEther(capacity);
}

// veAXM Functions
export async function getVeAXMStats() {
  const contract = getVeAXM();
  const [totalSupply, totalLocked, totalLockers, currentEpoch, totalRewards] = await Promise.all([
    contract.totalSupply(),
    contract.totalLocked(),
    contract.totalLockers(),
    contract.currentRewardEpoch(),
    contract.totalRewardsDistributed()
  ]);
  
  return {
    totalVotingPower: ethers.formatEther(totalSupply),
    totalLocked: ethers.formatEther(totalLocked),
    totalLockers: Number(totalLockers),
    currentEpoch: Number(currentEpoch),
    totalRewardsDistributed: ethers.formatEther(totalRewards)
  };
}

export async function getUserVeAXMPosition(userAddress: string) {
  const contract = getVeAXM();
  const [balance, lock, claimable] = await Promise.all([
    contract.balanceOf(userAddress),
    contract.getLock(userAddress),
    contract.getClaimableRewards(userAddress)
  ]);
  
  return {
    votingPower: ethers.formatEther(balance),
    lockedAmount: ethers.formatEther(lock.amount),
    unlockTime: Number(lock.unlockTime),
    lockStart: Number(lock.lockStart),
    claimableRewards: ethers.formatEther(claimable)
  };
}

// Fee Burner Functions
export async function getFeeBurnerStats() {
  const contract = getAxiomFeeBurner();
  const [totalCollected, totalBurned, totalBuybacks, pending] = await contract.getStats();
  const canBuyback = await contract.canExecuteBuyback();
  const threshold = await contract.buybackThreshold();
  
  return {
    totalFeesCollected: ethers.formatEther(totalCollected),
    totalAxmBurned: ethers.formatEther(totalBurned),
    totalBuybacks: Number(totalBuybacks),
    pendingFees: ethers.formatEther(pending),
    buybackThreshold: ethers.formatEther(threshold),
    canExecuteBuyback: canBuyback
  };
}

// Export contract addresses for frontend use
export const V2_CONTRACT_ADDRESSES = {
  AXIOM_SCORE_SBT: V2_SOVEREIGN_BANKING_CONTRACTS.AXIOM_SCORE_SBT,
  SUSU_INSURANCE_FUND: V2_SOVEREIGN_BANKING_CONTRACTS.SUSU_INSURANCE_FUND,
  VE_AXM: V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM,
  AXIOM_FEE_BURNER: V2_SOVEREIGN_BANKING_CONTRACTS.AXIOM_FEE_BURNER
};
