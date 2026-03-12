import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { unitPaymentService } from '../../../../lib/services/UnitPaymentService';
import { unitAccountService } from '../../../../lib/services/UnitAccountService';
import { rateLimitStrict } from '../../../../lib/rateLimit';
import { validateDollarAmount, validateUnitId } from '../../../../lib/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitStrict(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const { fromAccountId, toAccountId, amountCents, description } = req.body ?? {};

  const amountErr = validateDollarAmount(amountCents);
  if (amountErr) return res.status(400).json({ error: amountErr });
  const fromErr = validateUnitId(fromAccountId);
  if (fromErr) return res.status(400).json({ error: 'Invalid from account.' });
  const toErr = validateUnitId(toAccountId);
  if (toErr) return res.status(400).json({ error: 'Invalid to account.' });

  const fromAccount = await unitAccountService.getAccountWithBalance(fromAccountId);
  if (!fromAccount || fromAccount.walletAddress.toLowerCase() !== session.address.toLowerCase()) {
    return res.status(403).json({ error: 'You do not own this account.' });
  }

  const result = await unitPaymentService.createBookPayment({
    walletAddress: session.address,
    fromAccountId: fromAccount.unitAccountId,
    toAccountId,
    amountCents: Number(amountCents),
    description: String(description ?? 'Payment'),
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(200).json({ success: true, paymentId: result.paymentId, status: result.status });
}
