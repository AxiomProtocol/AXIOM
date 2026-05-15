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

// Phase 9 mainnet candidate — pending package publish
// packageId and campaignObjectId populated after frozen mainnet publish.
// eligibilityList populated by operator before campaign activation.
const MAINNET_CANDIDATE_CAMPAIGN: SuiCampaign = {
  id: 'phase9-mainnet-candidate',
  label: 'Phase 9 — Axiom Community Distribution (Mainnet Candidate)',
  packageId: getPackageId('mainnet'), // '' until publish is complete
  campaignObjectId: '',               // '' until create_campaign_entry() is called
  network: 'mainnet',
  merkleRoot: '',                     // populated by operator after eligibility CSV
  amountPerClaim: '1000000',          // 1 AMC (6 decimals)
  expiresAtEpoch: '0',
  isActive: false,
  isClosed: false,
  status: deriveStatus(false, false, getPackageId('mainnet'), ''),
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
