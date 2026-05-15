import type { SuiCampaign } from './types';
import { getPackageId, SUI_CONSTANTS } from './client';

// =============================================================================
// Campaign Registry — Phase 8 Staging
//
// TESTNET ONLY. Campaigns registered here are for staging validation only.
// No real assets. No mainnet. Not AXUSD or any canonical Axiom product.
// =============================================================================

const TESTNET_DISCLAIMER = SUI_CONSTANTS.DISCLAIMER;

const REGISTRY: SuiCampaign[] = [
  {
    id: 'phase6-smoke-campaign',
    label: 'Phase 6 Smoke Test Campaign',
    packageId: getPackageId('testnet'),
    network: 'testnet',
    merkleRoot: '',
    amountPerClaim: '1000000',
    expiresAtEpoch: '0',
    isActive: false,
    isClosed: true,
    poolBalance: '0',
    totalClaimed: 0,
    createdAt: '2025-01-01T00:00:00Z',
    disclaimer: TESTNET_DISCLAIMER,
  },
];

export function getAllCampaigns(): SuiCampaign[] {
  return REGISTRY;
}

export function getCampaignById(id: string): SuiCampaign | undefined {
  return REGISTRY.find((c) => c.id === id);
}

export function getActiveCampaigns(): SuiCampaign[] {
  return REGISTRY.filter((c) => c.isActive && !c.isClosed);
}
