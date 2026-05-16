type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

const RPC_URLS: Record<SuiNetwork, string> = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
  localnet: 'http://127.0.0.1:9000',
};

function getNetwork(): SuiNetwork {
  const raw = process.env.AXIOM_SUI_NETWORK ?? 'testnet';
  if (['mainnet', 'testnet', 'devnet', 'localnet'].includes(raw)) {
    return raw as SuiNetwork;
  }
  return 'testnet';
}

function getRpcUrl(): string {
  return process.env.AXIOM_SUI_RPC_URL ?? RPC_URLS[getNetwork()];
}

let _idCounter = 1;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const url = getRpcUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: _idCounter++, method, params }),
  });
  if (!res.ok) {
    throw new Error(`Sui RPC HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`Sui RPC error: ${json.error.message}`);
  return json.result as T;
}

export interface SuiObjectResponse {
  data?: {
    objectId: string;
    type?: string;
    content?: {
      dataType: string;
      type?: string;
      fields?: Record<string, unknown>;
    };
  };
  error?: { code: string; object_id?: string };
}

export interface SuiDynamicFieldObjectResponse {
  data?: {
    objectId: string;
    content?: {
      dataType: string;
      fields?: Record<string, unknown>;
    };
  };
}

export interface SuiEventPage {
  data: unknown[];
  nextCursor?: unknown;
  hasNextPage: boolean;
}

export class SuiJsonRpcClient {
  async getObject(params: {
    id: string;
    options?: { showContent?: boolean; showType?: boolean };
  }): Promise<SuiObjectResponse> {
    return rpc<SuiObjectResponse>('sui_getObject', [
      params.id,
      {
        showContent: params.options?.showContent ?? false,
        showType: params.options?.showType ?? false,
        showOwner: false,
        showPreviousTransaction: false,
        showStorageRebate: false,
        showDisplay: false,
      },
    ]);
  }

  async getDynamicFieldObject(params: {
    parentId: string;
    name: { type: string; value: unknown };
  }): Promise<SuiDynamicFieldObjectResponse> {
    return rpc<SuiDynamicFieldObjectResponse>('sui_getDynamicFieldObject', [
      params.parentId,
      params.name,
    ]);
  }

  async queryEvents(params: {
    query: Record<string, unknown>;
    limit?: number;
    order?: 'ascending' | 'descending';
    cursor?: unknown;
  }): Promise<SuiEventPage> {
    return rpc<SuiEventPage>('suix_queryEvents', [
      params.query,
      params.cursor ?? null,
      params.limit ?? 20,
      params.order === 'descending',
    ]);
  }
}

let _client: SuiJsonRpcClient | null = null;

export function getSuiClient(): SuiJsonRpcClient {
  if (!_client) _client = new SuiJsonRpcClient();
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
