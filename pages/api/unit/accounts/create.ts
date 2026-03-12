import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { unitCustomerService } from '../../../../lib/services/UnitCustomerService';
import { unitAccountService } from '../../../../lib/services/UnitAccountService';
import { rateLimitStrict } from '../../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitStrict(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const isApproved = await unitCustomerService.isApproved(session.address);
  if (!isApproved) {
    return res.status(403).json({ error: 'Identity verification must be completed before opening an account.' });
  }

  const customer = await unitCustomerService.getCustomer(session.address);
  if (!customer?.unitCustomerId) {
    return res.status(400).json({ error: 'Customer record not found.' });
  }

  const { accountType, susuGroupId } = req.body ?? {};

  let result;
  if (accountType === 'susu_pool' && susuGroupId) {
    result = await unitAccountService.createSusuPoolAccount({
      walletAddress: session.address,
      unitCustomerId: customer.unitCustomerId,
      susuGroupId,
    });
  } else {
    result = await unitAccountService.createMemberAccount({
      walletAddress: session.address,
      unitCustomerId: customer.unitCustomerId,
    });
  }

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(200).json({
    success: true,
    accountId: result.accountId,
    unitAccountId: result.unitAccountId,
  });
}
