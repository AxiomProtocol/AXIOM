import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { unitPaymentService } from '../../../../lib/services/UnitPaymentService';
import { unitAccountService } from '../../../../lib/services/UnitAccountService';
import { rateLimitStrict } from '../../../../lib/rateLimit';
import { validateDollarAmount } from '../../../../lib/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!rateLimitStrict(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  if (req.method === 'POST') {
    const { fromAccountId, toAccountId, amountCents, description, frequency, numberOfPayments, susuGroupId } = req.body ?? {};

    const amountErr = validateDollarAmount(amountCents);
    if (amountErr) return res.status(400).json({ error: amountErr });

    const fromAccount = await unitAccountService.getAccountWithBalance(fromAccountId);
    if (!fromAccount || fromAccount.walletAddress.toLowerCase() !== session.address.toLowerCase()) {
      return res.status(403).json({ error: 'You do not own this account.' });
    }

    const validFrequencies = ['Monthly', 'Weekly', 'Biweekly'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({ error: 'Frequency must be Monthly, Weekly, or Biweekly.' });
    }

    const result = await unitPaymentService.createRecurringPayment({
      walletAddress: session.address,
      fromAccountId: fromAccount.unitAccountId,
      toAccountId,
      amountCents: Number(amountCents),
      description: String(description ?? 'Automatic payment'),
      frequency,
      numberOfPayments: numberOfPayments ? Number(numberOfPayments) : undefined,
      susuGroupId,
    });

    if (!result.success) return res.status(400).json({ error: result.error });
    return res.status(200).json({ success: true, paymentId: result.paymentId });
  }

  if (req.method === 'DELETE') {
    const { recurringPaymentId } = req.body ?? {};
    if (!recurringPaymentId) return res.status(400).json({ error: 'recurringPaymentId is required.' });

    const result = await unitPaymentService.cancelRecurringPayment(String(recurringPaymentId));
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
