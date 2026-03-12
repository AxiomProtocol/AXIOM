import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { unitCustomerService } from '../../../../lib/services/UnitCustomerService';
import { unitAccountService } from '../../../../lib/services/UnitAccountService';
import { unitCardService } from '../../../../lib/services/UnitCardService';
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
    return res.status(403).json({ error: 'Identity verification required to issue a card.' });
  }

  const customer = await unitCustomerService.getCustomer(session.address);
  if (!customer?.unitCustomerId) {
    return res.status(400).json({ error: 'Customer record not found.' });
  }

  const { accountId, cardType, shippingAddress } = req.body ?? {};

  const account = await unitAccountService.getAccountWithBalance(accountId);
  if (!account || account.walletAddress.toLowerCase() !== session.address.toLowerCase()) {
    return res.status(403).json({ error: 'Account not found.' });
  }

  let result;
  if (cardType === 'physical' && shippingAddress) {
    result = await unitCardService.issuePhysicalCard(
      session.address,
      customer.unitCustomerId,
      account.unitAccountId,
      shippingAddress
    );
  } else {
    result = await unitCardService.issueVirtualCard(
      session.address,
      customer.unitCustomerId,
      account.unitAccountId
    );
  }

  if (!result.success) return res.status(400).json({ error: result.error });
  return res.status(200).json({ success: true, cardId: result.cardId, unitCardId: result.unitCardId });
}
