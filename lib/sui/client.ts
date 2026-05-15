import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// =============================================================================
// Axiom Protocol — Sui Client
//
// Phase 9: Supports testnet (Phase 8 prototype) and mainnet (Phase 9 candidate).
//
// SUI_NETWORK env var controls active network (default: testnet).
// Mainnet package ID is populated after successful frozen publish.
//
// Community distribution only. NOT AXUSD, AXAU, AXM, SEED, or KAG.
// =============================================================================

export type SuiNetwork = 'testnet' | 'mainnet';

const SUPPORTED_NETWORKS: SuiNetwork[] = ['testnet', 'mainnet'];

const PACKAGE_IDS: Record<SuiNetwork, string> = {
  testnet: '0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602',
  // Phase 9 mainnet — PUBLISHED 2026-05-15
  // Tx: Hw4xfYPodku9qpJHVZNuWPFj8RkRre9KirBeUUgBEe6c
  // Deployer: 0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad
  mainnet: '0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487',
};

const MAINNET_PACKAGE_PUBLISHED = PACKAGE_IDS.mainnet !== '';

export function getSuiNetworkUrl(network: SuiNetwork = 'mainnet'): string {
  return getFullnodeUrl(network);
}

function getNetwork(): SuiNetwork {
  const env = process.env.SUI_NETWORK as SuiNetwork | undefined;
  if (env && SUPPORTED_NETWORKS.includes(env)) return env;
  return 'testnet';
}

let _client: SuiClient | null = null;
let _clientNetwork: SuiNetwork | null = null;

export function getSuiClient(network?: SuiNetwork): SuiClient {
  const target = network ?? getNetwork();
  if (_client && _clientNetwork === target) return _client;
  _client = new SuiClient({ url: getSuiNetworkUrl(target) });
  _clientNetwork = target;
  return _client;
}

export function getSuiNetwork(): SuiNetwork {
  return getNetwork();
}

export function getPackageId(network?: SuiNetwork): string {
  return PACKAGE_IDS[network ?? getNetwork()];
}

export function isMainnetPackagePublished(): boolean {
  return MAINNET_PACKAGE_PUBLISHED;
}

export const SUI_CONSTANTS = {
  MAX_PROOF_DEPTH: 20,
  MAX_SUPPLY: 1_000_000_000_000_000n,
  DECIMALS: 6,
  TESTNET_SYMBOL: 'ATC',
  TESTNET_FULL_NAME: 'AXIOM TEST CLAIM',
  MAINNET_SYMBOL: 'AMC',
  MAINNET_FULL_NAME: 'AXIOM MAINNET CLAIM',
  DISCLAIMER:
    'COMMUNITY REWARDS LAYER — NON-FINANCIAL. This token has no monetary value. It is NOT AXUSD, AXAU, AXM, SEED, or KAG. Not backed by any reserve. Not redeemable for any canonical asset or fiat currency.',
} as const;
