/**
 * Bridge.xyz API Client
 *
 * Handles all HTTP communication with the Bridge API (by Stripe).
 * Production base: https://api.bridge.xyz
 * Sandbox base:    https://api.sandbox.bridge.xyz
 *
 * Auth: Api-Key header (BRIDGE_API_KEY secret).
 */

const BRIDGE_BASE_URL =
  process.env.BRIDGE_ENVIRONMENT === 'production'
    ? 'https://api.bridge.xyz'
    : 'https://api.sandbox.bridge.xyz';

function getApiKey(): string {
  const key = process.env.BRIDGE_API_KEY;
  if (!key) throw new Error('[BridgeClient] BRIDGE_API_KEY is not set');
  return key;
}

async function bridgeFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BRIDGE_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Api-Key': getApiKey(),
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { message: text };
  }

  if (!res.ok) {
    const msg =
      (body as any)?.message ??
      (body as any)?.error ??
      `Bridge API error ${res.status}`;
    const err = new Error(msg) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body as T;
}

// ─── Customer endpoints ────────────────────────────────────────────────────────

export interface BridgeCustomer {
  id: string;
  full_name: string;
  email: string;
  type: 'individual' | 'business';
  kyc_status: 'approved' | 'under_review' | 'rejected' | 'not_started' | 'incomplete';
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerParams {
  full_name: string;
  email: string;
  type?: 'individual' | 'business';
}

export async function createCustomer(params: CreateCustomerParams): Promise<BridgeCustomer> {
  return bridgeFetch<BridgeCustomer>('/v0/customers', {
    method: 'POST',
    body: JSON.stringify({ type: 'individual', ...params }),
  });
}

export async function getCustomer(customerId: string): Promise<BridgeCustomer> {
  return bridgeFetch<BridgeCustomer>(`/v0/customers/${customerId}`);
}

// ─── KYC Link endpoints ────────────────────────────────────────────────────────

export interface BridgeKycLink {
  id: string;
  customer_id: string;
  url: string;
  expires_at: string;
  kyc_status: string;
  full_name: string;
  email: string;
  type: string;
}

export interface CreateKycLinkParams {
  full_name: string;
  email: string;
  type?: 'individual' | 'business';
  redirect_uri?: string;
}

export async function createKycLink(
  customerId: string,
  params: CreateKycLinkParams
): Promise<BridgeKycLink> {
  return bridgeFetch<BridgeKycLink>(`/v0/customers/${customerId}/kyc_links`, {
    method: 'POST',
    body: JSON.stringify({ type: 'individual', ...params }),
  });
}

export async function listKycLinks(customerId: string): Promise<{ data: BridgeKycLink[] }> {
  return bridgeFetch<{ data: BridgeKycLink[] }>(`/v0/customers/${customerId}/kyc_links`);
}

// ─── Virtual Account endpoints ─────────────────────────────────────────────────

export interface BridgeVirtualAccount {
  id: string;
  customer_id: string;
  status: string;
  source_currency: string;
  destination: {
    payment_rail: string;
    currency: string;
    address: string;
  };
  source_deposit_instructions: {
    payment_rail: string;
    currency: string;
    bank_name: string;
    account_number: string;
    routing_number: string;
    bank_address?: string;
    bank_beneficiary_name?: string;
    memo?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateVirtualAccountParams {
  customer_id: string;
  source_currency?: string;
  destination: {
    payment_rail: string;
    currency: string;
    address: string;
  };
}

export async function createVirtualAccount(
  params: CreateVirtualAccountParams
): Promise<BridgeVirtualAccount> {
  return bridgeFetch<BridgeVirtualAccount>('/v0/virtual_accounts', {
    method: 'POST',
    body: JSON.stringify({ source_currency: 'usd', ...params }),
  });
}

export async function getVirtualAccount(id: string): Promise<BridgeVirtualAccount> {
  return bridgeFetch<BridgeVirtualAccount>(`/v0/virtual_accounts/${id}`);
}

export async function listVirtualAccounts(
  customerId: string
): Promise<{ data: BridgeVirtualAccount[] }> {
  return bridgeFetch<{ data: BridgeVirtualAccount[] }>(
    `/v0/customers/${customerId}/virtual_accounts`
  );
}

// ─── External Account endpoints ────────────────────────────────────────────────

export interface BridgeExternalAccount {
  id: string;
  customer_id: string;
  currency: string;
  bank_name: string;
  account_name: string;
  account_type?: string;
  last_4: string;
  routing_number?: string;
  status: string;
  created_at: string;
}

export interface CreateExternalAccountParams {
  customer_id: string;
  currency?: string;
  account_owner_name: string;
  account_type?: 'checking' | 'savings';
  account_number: string;
  routing_number: string;
  bank_name?: string;
}

export async function createExternalAccount(
  params: CreateExternalAccountParams
): Promise<BridgeExternalAccount> {
  return bridgeFetch<BridgeExternalAccount>('/v0/external_accounts', {
    method: 'POST',
    body: JSON.stringify({ currency: 'usd', account_type: 'checking', ...params }),
  });
}

export async function getExternalAccount(id: string): Promise<BridgeExternalAccount> {
  return bridgeFetch<BridgeExternalAccount>(`/v0/external_accounts/${id}`);
}

export async function listExternalAccounts(
  customerId: string
): Promise<{ data: BridgeExternalAccount[] }> {
  return bridgeFetch<{ data: BridgeExternalAccount[] }>(
    `/v0/customers/${customerId}/external_accounts`
  );
}

export async function deleteExternalAccount(id: string): Promise<void> {
  await bridgeFetch(`/v0/external_accounts/${id}`, { method: 'DELETE' });
}

// ─── Transfer (Orchestration) endpoints ───────────────────────────────────────

export interface BridgeTransferSource {
  payment_rail: string;
  currency: string;
  from_address?: string;
}

export interface BridgeTransferDestination {
  payment_rail: string;
  currency: string;
  to_address?: string;
  external_account_id?: string;
}

export interface BridgeTransferResponse {
  id: string;
  state: string;
  amount: string;
  currency: string;
  on_behalf_of: string;
  source: BridgeTransferSource;
  destination: BridgeTransferDestination;
  source_deposit_instructions?: {
    payment_rail: string;
    amount: string;
    currency: string;
    bank_name?: string;
    account_number?: string;
    routing_number?: string;
    from_address?: string;
    to_address?: string;
    memo?: string;
  };
  receipt?: {
    initial_amount: string;
    developer_fee: string;
    exchange_fee: string;
    destination_amount: string;
    gas_fee?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateTransferParams {
  amount: string;
  on_behalf_of: string;
  source: BridgeTransferSource;
  destination: BridgeTransferDestination;
  developer_fee?: string;
}

export async function createTransfer(
  params: CreateTransferParams
): Promise<BridgeTransferResponse> {
  return bridgeFetch<BridgeTransferResponse>('/v0/transfers', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getTransfer(transferId: string): Promise<BridgeTransferResponse> {
  return bridgeFetch<BridgeTransferResponse>(`/v0/transfers/${transferId}`);
}

export async function listTransfers(
  customerId: string,
  limit = 20
): Promise<{ data: BridgeTransferResponse[] }> {
  return bridgeFetch<{ data: BridgeTransferResponse[] }>(
    `/v0/customers/${customerId}/transfers?limit=${limit}`
  );
}

// ─── Liquidation Address endpoints ────────────────────────────────────────────

export interface BridgeLiquidationAddress {
  id: string;
  customer_id: string;
  chain: string;
  address: string;
  currency: string;
  external_account_id: string;
  destination_payment_rail: string;
  destination_currency: string;
  created_at: string;
}

export interface CreateLiquidationAddressParams {
  customer_id: string;
  chain: string;
  currency: string;
  external_account_id: string;
  destination_payment_rail: string;
  destination_currency: string;
}

export async function createLiquidationAddress(
  params: CreateLiquidationAddressParams
): Promise<BridgeLiquidationAddress> {
  return bridgeFetch<BridgeLiquidationAddress>('/v0/liquidation_addresses', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function listLiquidationAddresses(
  customerId: string
): Promise<{ data: BridgeLiquidationAddress[] }> {
  return bridgeFetch<{ data: BridgeLiquidationAddress[] }>(
    `/v0/customers/${customerId}/liquidation_addresses`
  );
}
