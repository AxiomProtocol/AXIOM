// Environment-aware base URL:
// INCREASE_ENVIRONMENT=production → live Increase API (https://api.increase.com)
// Anything else (or unset) → sandbox (https://sandbox.increase.com)
// This is the single source of truth — NODE_ENV is not used here so that
// the dev server can connect to live Increase when configured.
function isLive(): boolean {
  return process.env.INCREASE_ENVIRONMENT === 'production';
}

function getBaseUrl(): string {
  return isLive()
    ? (process.env.INCREASE_BASE_URL ?? 'https://api.increase.com')
    : 'https://sandbox.increase.com';
}

// Account/entity IDs — resolved per environment
export function getAccountId(): string {
  if (!isLive()) return process.env.INCREASE_SANDBOX_ACCOUNT_ID ?? '';
  return process.env.INCREASE_ACCOUNT_ID ?? '';
}

export function getProgramId(): string {
  if (!isLive()) return process.env.INCREASE_SANDBOX_PROGRAM_ID ?? '';
  return process.env.INCREASE_PROGRAM_ID ?? '';
}

async function increaseRequest<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const apiKey = process.env.INCREASE_API_KEY ?? '';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[Increase API Error]', res.status, path, JSON.stringify(data));
    throw new Error(
      data?.detail ?? data?.title ?? `Increase API error ${res.status}: ${path}`,
    );
  }

  return data as T;
}

export interface IncreaseAccount {
  id: string;
  name: string;
  status: string;
  currency: string;
  balance?: number;
  bank: string;
  interest_rate: string;
  program_id: string;
  entity_id: string;
  created_at: string;
}

export interface IncreaseTransaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  created_at: string;
  description: string;
  route_type?: string;
  type: string;
}

export interface IncreaseAccountNumber {
  id: string;
  account_id: string;
  account_number: string;
  routing_number: string;
  name: string;
  status: string;
  created_at: string;
}

export interface IncreasePendingTransaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  created_at: string;
  description: string;
  status: string;
  route_type?: string;
}

export interface IncreaseTransfer {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  description: string;
  network?: string;
}

export interface IncreaseCard {
  id: string;
  account_id: string;
  description: string;
  status: string;
  type: string;
  last4: string;
  expiration_month: number;
  expiration_year: number;
  created_at: string;
}

export interface IncreaseCardDetails {
  id: string;
  primary_account_number: string;
  expiration_month: number;
  expiration_year: number;
  verification_code: string;
}


export const IncreaseService = {
  async getAccount(accountId: string): Promise<IncreaseAccount> {
    return increaseRequest<IncreaseAccount>('GET', `/accounts/${accountId}`);
  },

  async listAccounts(): Promise<{ data: IncreaseAccount[] }> {
    return increaseRequest<{ data: IncreaseAccount[] }>('GET', '/accounts');
  },

  async getAccountBalance(accountId: string): Promise<{ available_balance: number; current_balance: number; currency: string }> {
    return increaseRequest('GET', `/accounts/${accountId}/balance`);
  },

  async getTransaction(transactionId: string): Promise<IncreaseTransaction & { route_id?: string; route_type?: string; description: string }> {
    return increaseRequest('GET', `/transactions/${transactionId}`);
  },

  async listTransactions(accountId: string, limit = 20): Promise<{ data: IncreaseTransaction[] }> {
    return increaseRequest<{ data: IncreaseTransaction[] }>(
      'GET',
      `/transactions?account_id=${accountId}&limit=${limit}`,
    );
  },

  async listPendingTransactions(accountId: string): Promise<{ data: IncreasePendingTransaction[] }> {
    return increaseRequest<{ data: IncreasePendingTransaction[] }>(
      'GET',
      `/pending_transactions?account_id=${accountId}`,
    );
  },

  async listAccountNumbers(accountId: string): Promise<{ data: IncreaseAccountNumber[] }> {
    return increaseRequest<{ data: IncreaseAccountNumber[] }>(
      'GET',
      `/account_numbers?account_id=${accountId}`,
    );
  },

  async createAccountNumber(params: {
    account_id: string;
    name: string;
    inbound_ach?: { debit_status: 'allowed' | 'blocked' };
    inbound_checks?: { status: 'allowed' | 'check_transfers_only' };
  }): Promise<IncreaseAccountNumber> {
    return increaseRequest<IncreaseAccountNumber>('POST', '/account_numbers', params);
  },

  async getAccountNumber(accountNumberId: string): Promise<IncreaseAccountNumber> {
    return increaseRequest<IncreaseAccountNumber>('GET', `/account_numbers/${accountNumberId}`);
  },

  async initiateAchTransfer(params: {
    account_id: string;
    account_number: string;
    routing_number: string;
    amount: number;
    statement_descriptor: string;
    company_name?: string;
    effective_date?: string;
  }, idempotencyKey?: string): Promise<IncreaseTransfer> {
    return increaseRequest<IncreaseTransfer>('POST', '/ach_transfers', params, idempotencyKey);
  },

  async initiateWireTransfer(params: {
    account_id: string;
    account_number: string;
    routing_number: string;
    amount: number;
    message_to_recipient: string;
    beneficiary_name?: string;
    beneficiary_address_line1?: string;
    beneficiary_address_line2?: string;
    beneficiary_address_line3?: string;
    originator_name?: string;
    originator_address_line1?: string;
  }, idempotencyKey?: string): Promise<IncreaseTransfer> {
    return increaseRequest<IncreaseTransfer>('POST', '/wire_transfers', params, idempotencyKey);
  },

  async listAchTransfers(accountId: string, limit = 20): Promise<{ data: IncreaseTransfer[] }> {
    return increaseRequest<{ data: IncreaseTransfer[] }>(
      'GET',
      `/ach_transfers?account_id=${accountId}&limit=${limit}`,
    );
  },

  async getAchTransfer(transferId: string): Promise<IncreaseTransfer> {
    return increaseRequest<IncreaseTransfer>('GET', `/ach_transfers/${transferId}`);
  },

  async listWireTransfers(accountId: string, limit = 20): Promise<{ data: IncreaseTransfer[] }> {
    return increaseRequest<{ data: IncreaseTransfer[] }>(
      'GET',
      `/wire_transfers?account_id=${accountId}&limit=${limit}`,
    );
  },

  async getWireTransfer(transferId: string): Promise<IncreaseTransfer> {
    return increaseRequest<IncreaseTransfer>('GET', `/wire_transfers/${transferId}`);
  },

  // Creates a dedicated virtual account number (sub-account) for a participant.
  // All sub-accounts route into the shared Axiom Nexus Account — no per-participant entity needed.
  async createParticipantVirtualAccount(params: {
    account_id: string;
    participant_ref: string;
    full_name: string;
  }): Promise<IncreaseAccountNumber> {
    return increaseRequest<IncreaseAccountNumber>('POST', '/account_numbers', {
      account_id: params.account_id,
      name: `${params.full_name} — ${params.participant_ref}`,
      inbound_ach: { debit_status: 'blocked' },
      inbound_checks: { status: 'allowed' },
    });
  },

  // Cards
  async issueVirtualCard(params: {
    account_id: string;
    description: string;
  }): Promise<IncreaseCard> {
    return increaseRequest<IncreaseCard>('POST', '/cards', {
      account_id: params.account_id,
      description: params.description,
      billing_address: {
        line1: '1 Axiom Protocol',
        city: 'Atlanta',
        state: 'GA',
        postal_code: '30301',
        country: 'US',
      },
    });
  },

  async listCards(accountId: string): Promise<{ data: IncreaseCard[] }> {
    return increaseRequest<{ data: IncreaseCard[] }>(
      'GET',
      `/cards?account_id=${accountId}`,
    );
  },

  async getCard(cardId: string): Promise<IncreaseCard> {
    return increaseRequest<IncreaseCard>('GET', `/cards/${cardId}`);
  },

  async getCardDetails(cardId: string): Promise<IncreaseCardDetails> {
    return increaseRequest<IncreaseCardDetails>('GET', `/cards/${cardId}/details`);
  },

  async getInboundAchTransfer(transferId: string): Promise<{
    id: string;
    account_id: string;
    account_number_id: string;
    amount: number;
    currency: string;
    status: string;
    company_name: string | null;
    company_entry_description: string | null;
    company_descriptive_date: string | null;
    originator_company_id: string | null;
    originator_routing_number: string | null;
    transfer_return: unknown | null;
    created_at: string;
  }> {
    return increaseRequest('GET', `/inbound_ach_transfers/${transferId}`);
  },

  formatAmount(cents: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  },
};
