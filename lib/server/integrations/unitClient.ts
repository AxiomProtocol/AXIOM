import { getIntegrationConfig } from './config';

interface UnitCreateCustomerInput {
  walletAddress: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  ssn?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

interface UnitCreateCounterpartyInput {
  name: string;
  routingNumber: string;
  accountNumber: string;
  accountType: string;
  holderType: string;
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function liveRequest(path: string, method: string, body?: any): Promise<any> {
  const cfg = getIntegrationConfig();
  const response = await fetch(`${cfg.unitApiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.unitApiToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error || json?.message || `Unit API error (${response.status})`);
  }
  return json;
}

export async function unitCreateCustomer(input: UnitCreateCustomerInput): Promise<{ customerId: string; status: string }> {
  const cfg = getIntegrationConfig();
  if (cfg.mode === 'live') {
    const payload = {
      data: {
        type: 'customer',
        attributes: {
          tags: { walletAddress: input.walletAddress },
          fullName: [input.firstName, input.lastName].filter(Boolean).join(' ') || 'Axiom User',
          email: input.email,
          phone: input.phone,
        },
      },
    };
    const out = await liveRequest('/customers', 'POST', payload);
    return {
      customerId: out?.data?.id || randomId('unit_cus'),
      status: 'pending_review',
    };
  }

  return {
    customerId: randomId('unit_cus'),
    status: 'approved',
  };
}

export async function unitCreateAccount(customerId: string, accountType: 'member' | 'susu_pool' = 'member'): Promise<{ unitAccountId: string; routingNumber: string; accountLast4: string; maskedAccountNumber: string; status: string }> {
  const cfg = getIntegrationConfig();
  if (cfg.mode === 'live') {
    const payload = {
      data: {
        type: 'depositAccount',
        attributes: {
          depositProduct: 'checking',
          tags: { accountType },
        },
        relationships: {
          customer: {
            data: { type: 'customer', id: customerId },
          },
        },
      },
    };
    const out = await liveRequest('/accounts', 'POST', payload);
    const id = out?.data?.id || randomId('unit_acc');
    return {
      unitAccountId: id,
      routingNumber: '021000021',
      accountLast4: String(Math.floor(1000 + Math.random() * 9000)),
      maskedAccountNumber: '••••••••••••',
      status: 'Open',
    };
  }

  const last4 = String(Math.floor(1000 + Math.random() * 9000));
  return {
    unitAccountId: randomId('unit_acc'),
    routingNumber: '021000021',
    accountLast4: last4,
    maskedAccountNumber: `••••••••${last4}`,
    status: 'Open',
  };
}

export async function unitCreateCounterparty(input: UnitCreateCounterpartyInput): Promise<{ counterpartyId: string; maskedAccountNumber: string; status: string }> {
  const cfg = getIntegrationConfig();
  if (cfg.mode === 'live') {
    const payload = {
      data: {
        type: 'counterparty',
        attributes: {
          name: input.name,
          accountNumber: input.accountNumber,
          routingNumber: input.routingNumber,
          accountType: input.accountType,
        },
      },
    };
    const out = await liveRequest('/counterparties', 'POST', payload);
    return {
      counterpartyId: out?.data?.id || randomId('unit_cp'),
      maskedAccountNumber: `••••${input.accountNumber.slice(-4)}`,
      status: 'Active',
    };
  }

  return {
    counterpartyId: randomId('unit_cp'),
    maskedAccountNumber: `••••${input.accountNumber.slice(-4)}`,
    status: 'Active',
  };
}

export async function unitCreateAchPayment(params: {
  unitAccountId: string;
  counterpartyId: string;
  amountCents: number;
  direction: 'Debit' | 'Credit';
  description?: string;
}): Promise<{ paymentId: string; status: string }> {
  const cfg = getIntegrationConfig();
  if (cfg.mode === 'live') {
    const payload = {
      data: {
        type: 'payment',
        attributes: {
          amount: params.amountCents,
          description: params.description || 'AXIOM',
          direction: params.direction,
        },
        relationships: {
          account: { data: { type: 'account', id: params.unitAccountId } },
          counterparty: { data: { type: 'counterparty', id: params.counterpartyId } },
        },
      },
    };
    const out = await liveRequest('/payments', 'POST', payload);
    return { paymentId: out?.data?.id || randomId('unit_pmt'), status: 'Pending' };
  }

  return { paymentId: randomId('unit_pmt'), status: 'Pending' };
}

export async function unitGetAccount(unitAccountId: string): Promise<{ balanceCents: number; availableBalanceCents: number; status: string } | null> {
  const cfg = getIntegrationConfig();
  if (cfg.mode === 'live') {
    try {
      const out = await liveRequest(`/accounts/${unitAccountId}`, 'GET');
      const attrs = out?.data?.attributes || {};
      return {
        balanceCents: Number(attrs.balance ?? 0),
        availableBalanceCents: Number(attrs.available ?? 0),
        status: attrs.status || 'Open',
      };
    } catch {
      return null;
    }
  }
  return null;
}
