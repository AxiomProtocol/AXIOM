import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { unitCustomerService } from '../../../lib/services/UnitCustomerService';
import { getUnitClient, isUnitConfigured } from '../../../lib/unit/client';
import { rateLimitDefault } from '../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  if (!isUnitConfigured()) {
    return res.status(503).json({ error: 'Banking service is not configured.' });
  }

  const customer = await unitCustomerService.getCustomer(session.address);
  if (!customer?.unitCustomerId) {
    return res.status(404).json({ error: 'Banking profile not found.' });
  }
  if (!customer.isApproved) {
    return res.status(403).json({ error: 'Identity verification must be approved first.' });
  }

  const client = getUnitClient();
  if (!client) return res.status(503).json({ error: 'Banking service unavailable.' });

  if (req.method === 'GET') {
    try {
      const response = await client.counterparties.list({ customerId: customer.unitCustomerId });
      return res.status(200).json({ counterparties: response.data ?? [] });
    } catch (err) {
      console.error('[unit/counterparty GET]', err);
      return res.status(500).json({ error: 'Failed to fetch linked accounts.' });
    }
  }

  if (req.method === 'POST') {
    const { routingNumber, accountNumber, accountType, name, holderType } = req.body as {
      routingNumber?: string;
      accountNumber?: string;
      accountType?: string;
      name?: string;
      holderType?: string;
    };

    if (!routingNumber || !/^\d{9}$/.test(routingNumber)) {
      return res.status(400).json({ error: 'Routing number must be exactly 9 digits.' });
    }
    if (!accountNumber || !/^\d{4,17}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'Account number must be 4–17 digits.' });
    }
    const validAccountTypes = ['Checking', 'Savings', 'Loan'] as const;
    type AccountType = typeof validAccountTypes[number];
    if (!accountType || !validAccountTypes.includes(accountType as AccountType)) {
      return res.status(400).json({ error: 'Account type must be Checking, Savings, or Loan.' });
    }
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Account holder name is required.' });
    }
    const validHolderTypes = ['Business', 'Person', 'Unknown'] as const;
    type HolderType = typeof validHolderTypes[number];
    const resolvedHolderType: HolderType =
      validHolderTypes.includes((holderType ?? 'Person') as HolderType)
        ? (holderType as HolderType)
        : 'Person';

    try {
      const response = await client.counterparties.create({
        type: 'achCounterparty',
        attributes: {
          routingNumber,
          accountNumber,
          accountType: accountType as AccountType,
          name: name.trim(),
          type: resolvedHolderType,
          permissions: 'CreditAndDebit',
        },
        relationships: {
          customer: { data: { type: 'customer', id: customer.unitCustomerId } },
        },
      });

      return res.status(200).json({ counterparty: response.data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[unit/counterparty POST]', msg);
      return res.status(500).json({ error: 'Failed to link bank account. Check routing and account numbers.' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query as { id?: string };
    if (!id) return res.status(400).json({ error: 'Counterparty id required.' });
    try {
      await client.counterparties.delete(id);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[unit/counterparty DELETE]', err);
      return res.status(500).json({ error: 'Failed to remove linked account.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
