import type { SuiCampaign } from './types';
import { getPackageId, SUI_CONSTANTS } from './client';
import type { BuildInput } from './proofs/buildMerkleTree';

// =============================================================================
// Campaign Registry — Phase 9 Production + Phase 8 Archive
//
// Community distribution only. NOT AXUSD, AXAU, AXM, SEED, or KAG.
//
// Each campaign entry carries:
//   - eligibilityList: the raw (address, amount) entries used for proof generation
//   - merkleRoot: pre-computed root (must match on-chain)
//   - packageId: the deployed Move package ID
//   - campaignObjectId: the ClaimCampaign shared object ID (after publish)
//   - status: derived from isActive + isClosed for API-layer simplicity
// =============================================================================

function deriveStatus(
  isActive: boolean,
  isClosed: boolean,
  packageId?: string,
  campaignObjectId?: string,
): 'active' | 'inactive' | 'closed' | 'pending' {
  if (isClosed) return 'closed';
  if (!packageId || !campaignObjectId) return 'pending';
  if (!isActive) return 'inactive';
  return 'active';
}

// Phase 8 testnet prototype — permanently closed, archive only
const TESTNET_CAMPAIGN: SuiCampaign = {
  id: 'phase6-smoke-campaign',
  label: 'Phase 6 Smoke Test Campaign',
  packageId: getPackageId('testnet'),
  campaignObjectId: '',
  network: 'testnet',
  merkleRoot: '',
  amountPerClaim: '1000000',
  expiresAtEpoch: '0',
  isActive: false,
  isClosed: true,
  status: 'closed',
  eligibilityList: [],
  poolBalance: '0',
  totalClaimed: 0,
  createdAt: '2025-01-01T00:00:00Z',
  disclaimer: SUI_CONSTANTS.DISCLAIMER,
};

// Phase 9 mainnet — PUBLISHED 2026-05-15
// Package: 0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487
// Publish Tx: Hw4xfYPodku9qpJHVZNuWPFj8RkRre9KirBeUUgBEe6c
// Campaign Tx: 8rQGeoPsa8H1N71c6USucdZNwJiK5skiJVgNwk8P4Xu4
// AdminCap:  0x637ce7868be3f24f85968629debbee72490406147ffa756f3324fb5acb945f9a
// Deployer:  0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad
//
// Status: INACTIVE — awaiting eligibility CSV + merkle root + pool funding + activate()
// eligibilityList populated by operator before campaign activation.
const MAINNET_CANDIDATE_CAMPAIGN: SuiCampaign = {
  id: 'phase9-mainnet-candidate',
  label: 'Phase 9 — Axiom Community Distribution (Mainnet)',
  packageId: '0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487',
  campaignObjectId: '0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982',
  network: 'mainnet',
  merkleRoot: '',       // populated by operator after eligibility CSV + buildMerkleTree()
  amountPerClaim: '1000000',          // 1 AMC (6 decimals)
  expiresAtEpoch: '0',
  isActive: false,
  isClosed: false,
  status: deriveStatus(false, false,
    '0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487',
    '0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982',
  ),
  eligibilityList: [] as BuildInput[],
  poolBalance: '0',
  totalClaimed: 0,
  createdAt: '2026-05-15T00:00:00Z',
  disclaimer: SUI_CONSTANTS.DISCLAIMER,
};

const REGISTRY: SuiCampaign[] = [
  MAINNET_CANDIDATE_CAMPAIGN,
  TESTNET_CAMPAIGN,
];

export function getAllCampaigns(): SuiCampaign[] {
  return REGISTRY;
}

export function getCampaignById(id: string): SuiCampaign | undefined {
  return REGISTRY.find((c) => c.id === id);
}

export function getActiveCampaigns(): SuiCampaign[] {
  return REGISTRY.filter((c) => c.status === 'active');
}

export function getMainnetCampaign(): SuiCampaign | undefined {
  return REGISTRY.find((c) => c.network === 'mainnet');
}
