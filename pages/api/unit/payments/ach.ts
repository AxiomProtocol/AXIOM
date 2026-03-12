import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { unitCustomerService } from '../../../../lib/services/UnitCustomerService';
import { unitAccountService } from '../../../../lib/services/UnitAccountService';
import { getUnitClient, isUnitConfigured } from '../../../../lib/unit/client';
import { generateIdempotencyKey } from '../../../../lib/unit/helpers';
import { db } from '../../../../server/db';
import { unitPayments } from '../../../../shared/unitSchema';
import { rateLimitStrict } from '../../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!rateLimitStrict(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });

  if (!isUnitConfigured()) return res.status(503).json({ error: 'Banking service is not configured.' });

  const customer = await unitCustomerService.getCustomer(session.address);
  if (!customer?.isApproved) return res.status(403).json({ error: 'Identity verification required.' });

  const client = getUnitClient();
  if (!client) return res.status(503).json({ error: 'Banking service unavailable.' });

  const { unitAccountId, counterpartyId, amountCents, direction, description } = req.body ?? {};

  if (!unitAccountId || !counterpartyId) return res.status(400).json({ error: 'Account and counterparty required.' });
  if (!amountCents || typeof amountCents !== 'number' || amountCents < 100) {
    return res.status(400).json({ error: 'Minimum amount is $1.00.' });
  }
  if (direction !== 'Debit' && direction !== 'Credit') {
    return res.status(400).json({ error: 'Direction must be Debit (fund) or Credit (send).' });
  }

  const account = await unitAccountService.getAccountWithBalance(unitAccountId);
  if (!account || account.walletAddress.toLowerCase() !== session.address.toLowerCase()) {
    return res.status(403).json({ error: 'You do not own this account.' });
  }
  if (direction === 'Credit' && account.availableBalanceCents !== undefined && account.availableBalanceCents < amountCents) {
    return res.status(400).json({ error: 'Insufficient available balance.' });
  }

  const desc = String(description ?? 'AXIOM').slice(0, 10).toUpperCase();
  const idempotencyKey = generateIdempotencyKey('ach-pay');

  try {
    const response = await client.payments.create({
      type: 'achPayment',
      attributes: {
        amount: amountCents,
        description: desc,
        direction,
        idempotencyKey,
      },
      relationships: {
        account: { data: { type: 'depositAccount', id: account.unitAccountId } },
        counterparty: { data: { type: 'counterparty', id: counterpartyId } },
      },
    } as Parameters<typeof client.payments.create>[0]);

    const payment = response.data;
    const attrs = payment.attributes as { status?: string };

    await db.insert(unitPayments).values({
      walletAddress: session.address.toLowerCase(),
      unitPaymentId: payment.id,
      idempotencyKey,
      paymentType: direction === 'Debit' ? 'ach_debit' : 'ach_credit',
      status: (attrs.status ?? 'Pending') as 'Pending' | 'Sent' | 'Clearing' | 'Returned' | 'Rejected' | 'Canceled' | 'Cleared',
      amountCents,
      description: desc,
      toAccountId: account.unitAccountId,
    }).onConflictDoNothing();

    return res.status(200).json({ success: true, paymentId: payment.id, status: attrs.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[unit/payments/ach]', msg);
    return res.status(500).json({ error: 'ACH payment failed. Please try again.' });
  }
}
