import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

function getNetwork(): SuiNetwork {
  const raw = process.env.AXIOM_SUI_NETWORK ?? 'testnet';
  if (['mainnet', 'testnet', 'devnet', 'localnet'].includes(raw)) {
    return raw as SuiNetwork;
  }
  return 'testnet';
}

function buildClient(): SuiClient {
  const rpcUrl = process.env.AXIOM_SUI_RPC_URL;
  if (rpcUrl) {
    return new SuiClient({ url: rpcUrl });
  }
  return new SuiClient({ url: getFullnodeUrl(getNetwork()) });
}

let _client: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  if (!_client) {
    _client = buildClient();
  }
  return _client;
}

export function getPackageId(): string {
  const id = process.env.AXIOM_SUI_PACKAGE_ID;
  if (!id) throw new Error('AXIOM_SUI_PACKAGE_ID not configured');
  return id;
}

export function getAdminCapId(): string {
  const id = process.env.AXIOM_SUI_ADMIN_CAP_ID;
  if (!id) throw new Error('AXIOM_SUI_ADMIN_CAP_ID not configured');
  return id;
}

export function getGuardedTreasuryId(): string {
  const id = process.env.AXIOM_SUI_GUARDED_TREASURY_ID;
  if (!id) throw new Error('AXIOM_SUI_GUARDED_TREASURY_ID not configured');
  return id;
}

export { getNetwork };
