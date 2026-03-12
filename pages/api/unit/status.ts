import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { unitCustomerService } from '../../../lib/services/UnitCustomerService';
import { unitAccountService } from '../../../lib/services/UnitAccountService';
import { rateLimitDefault } from '../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const [customer, accounts] = await Promise.all([
    unitCustomerService.getCustomer(session.address),
    unitAccountService.getAccountsForWallet(session.address),
  ]);

  let applicationStatus = customer?.applicationStatus ?? null;
  if (customer && !customer.isApproved && customer.unitApplicationId) {
    const refreshed = await unitCustomerService.getApplicationStatus(session.address);
    applicationStatus = refreshed?.status ?? applicationStatus;
  }

  return res.status(200).json({
    hasCustomer: Boolean(customer),
    isApproved: customer?.isApproved ?? false,
    applicationStatus,
    customerId: customer?.unitCustomerId ?? null,
    firstName: customer?.firstName ?? null,
    lastName: customer?.lastName ?? null,
    accounts: accounts.map((a) => ({
      id: a.id,
      unitAccountId: a.unitAccountId,
      accountType: a.accountType,
      status: a.status,
      balanceCents: a.balanceCents,
      availableBalanceCents: a.availableBalanceCents,
      routingNumber: a.routingNumber,
      maskedAccountNumber: a.maskedAccountNumber,
      susuGroupId: a.susuGroupId ?? null,
    })),
  });
}
