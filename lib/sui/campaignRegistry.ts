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

// Phase 9 mainnet — ACTIVE 2026-05-15
// Package:     0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487
// Publish Tx:  Hw4xfYPodku9qpJHVZNuWPFj8RkRre9KirBeUUgBEe6c
// Campaign Tx: 8rQGeoPsa8H1N71c6USucdZNwJiK5skiJVgNwk8P4Xu4
// Root Tx:     4dpfFWu4CYfm1QkogaaHxhjo5dgwTK1K2RvrjQpD5LmQ
// Fund Tx:     2RufGy3STSUzMTvxgqHhW4hAiifBLhf1EZFSTB32KosU
// Activate Tx: 5AHTFEVAwggD4tBnwJpmSE6adxrVfjgnjR5BG3HhgW8E
// Immutable Tx:6qv18P2ZeMNKEKzzTnQyukKKKcUAEGnhsFFRqMqb37J7
// AdminCap:    0x637ce7868be3f24f85968629debbee72490406147ffa756f3324fb5acb945f9a
// Deployer:    0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad
//
// Eligibility proof data: lib/sui/proofs/phase9-mainnet-eligibility.json
const MAINNET_CANDIDATE_CAMPAIGN: SuiCampaign = {
  id: 'phase9-mainnet-candidate',
  label: 'Phase 9 — Axiom Community Distribution (Mainnet)',
  packageId: '0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487',
  campaignObjectId: '0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982',
  network: 'mainnet',
  merkleRoot: 'dd6b3d845ed2129701dac7cf2637baf7a0b599d27813be4c75d3deb80394c67a',
  amountPerClaim: '1000000',
  expiresAtEpoch: '0',
  isActive: true,
  isClosed: false,
  status: deriveStatus(true, false,
    '0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487',
    '0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982',
  ),
  eligibilityList: [
    { address: '0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad', amount: '1000000' },
    { address: '0x10c8bad6a245708e560a011493f362b095bbcfaf52e15a18d7d52f0aea8ab154', amount: '1000000' },
    { address: '0x7daa77a5e9071a274934f77be170d573b0da6788fefbca7089f4f2b6a970914d', amount: '1000000' },
    { address: '0xef8fa8ff375159b49a972fd3ad0efb8c9f7784c924d3bef426f1daa1c28fddd5', amount: '1000000' },
  ] as BuildInput[],
  poolBalance: '4000000',
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
