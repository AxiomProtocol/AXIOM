import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { IncreaseService, getAccountId, IncreaseDisabledError } from '../../../lib/services/IncreaseService';

function checkAdminKey(req: NextApiRequest): boolean {
  return req.headers['x-admin-key'] === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const AXIOM_ACCOUNT_ID = getAccountId();

  const {
    type,
    account_number,
    routing_number,
    amount_dollars,
    description,
    beneficiary_name,
  } = req.body as {
    type?: 'ach' | 'wire';
    account_number?: string;
    routing_number?: string;
    amount_dollars?: number;
    description?: string;
    beneficiary_name?: string;
  };

  if (!type || !['ach', 'wire'].includes(type)) {
    return res.status(400).json({ error: 'type must be ach or wire' });
  }
  if (!account_number || !routing_number) {
    return res.status(400).json({ error: 'account_number and routing_number required' });
  }
  if (!amount_dollars || amount_dollars <= 0) {
    return res.status(400).json({ error: 'amount_dollars must be a positive number' });
  }
  if (!description) {
    return res.status(400).json({ error: 'description required' });
  }

  const amountCents = Math.round(amount_dollars * 100);
  const isoDate = new Date().toISOString().slice(0, 10);
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${AXIOM_ACCOUNT_ID}:${type}:${routing_number}:${account_number}:${amountCents}:${isoDate}`)
    .digest('hex');

  try {
    let result;
    if (type === 'ach') {
      result = await IncreaseService.initiateAchTransfer({
        account_id: AXIOM_ACCOUNT_ID,
        account_number,
        routing_number,
        amount: amountCents,
        statement_descriptor: description.slice(0, 22),
        company_name: 'Axiom Protocol',
      }, idempotencyKey);
    } else {
      result = await IncreaseService.initiateWireTransfer({
        account_id: AXIOM_ACCOUNT_ID,
        account_number,
        routing_number,
        amount: amountCents,
        message_to_recipient: description.slice(0, 35),
        beneficiary_name: beneficiary_name ?? 'Beneficiary',
        originator_name: 'Axiom Protocol',
      }, idempotencyKey);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: result.id,
        type,
        amount: amountCents,
        amountFormatted: IncreaseService.formatAmount(amountCents),
        status: result.status,
        createdAt: result.created_at,
      },
    });
  } catch (err: unknown) {
    if (err instanceof IncreaseDisabledError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
