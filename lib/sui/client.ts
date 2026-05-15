import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// =============================================================================
// Axiom Protocol — Sui Client
//
// TESTNET ONLY. No mainnet activation.
// CHAIN_SUI_ENABLED is NOT set. This client is used for read-only testnet
// queries and staging dry-run operations only.
//
// Phase 8 — Staging
// =============================================================================

const SUPPORTED_NETWORKS = ['testnet'] as const;
type SuiNetwork = (typeof SUPPORTED_NETWORKS)[number];

const PACKAGE_IDS: Record<SuiNetwork, string> = {
  testnet: '0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602',
};

function getNetwork(): SuiNetwork {
  const env = process.env.SUI_NETWORK as SuiNetwork | undefined;
  if (env && SUPPORTED_NETWORKS.includes(env)) {
    return env;
  }
  return 'testnet';
}

let _client: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  if (_client) return _client;
  const network = getNetwork();
  _client = new SuiClient({ url: getFullnodeUrl(network) });
  return _client;
}

export function getSuiNetwork(): SuiNetwork {
  return getNetwork();
}

export function getPackageId(network?: SuiNetwork): string {
  return PACKAGE_IDS[network ?? getNetwork()];
}

export const SUI_CONSTANTS = {
  MAX_PROOF_DEPTH: 20,
  MAX_SUPPLY: BigInt('1000000000000000'),
  DECIMALS: 6,
  SYMBOL: 'ATC',
  FULL_NAME: 'AXIOM TEST CLAIM',
  DISCLAIMER:
    'TESTNET ONLY — This token has no monetary value. It is NOT AXUSD, AXAU, AXM, or any canonical Axiom asset. It cannot be redeemed for any real asset.',
} as const;
