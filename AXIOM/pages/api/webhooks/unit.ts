import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAccountByUnitId,
  updateAccountBalance,
  updateCustomerKycStatus,
} from '../../../lib/server/integrations/bankingStore';

/**
 * Unit Finance webhook handler.
 *
 * Unit sends a POST to this endpoint with an `x-unit-token` header containing
 * the webhook token you configured in the Unit dashboard. Set the env var
 * UNIT_WEBHOOK_TOKEN to the same value to enable signature validation.
 *
 * Documentation: https://www.unit.co/docs/api/webhooks
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify shared webhook token
  const webhookToken = process.env.UNIT_WEBHOOK_TOKEN;
  if (webhookToken) {
    const provided = req.headers['x-unit-token'];
    if (provided !== webhookToken) {
      return res.status(401).json({ error: 'Invalid webhook token' });
    }
  }

  const { type, data } = req.body ?? {};
  if (!type || !data) {
    return res.status(400).json({ error: 'Missing type or data' });
  }

  try {
    await handleUnitEvent(type, data);
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[webhook/unit] error processing event:', type, error);
    // Return 200 to prevent Unit from retrying transient errors indefinitely.
    // Log the error for monitoring instead.
    return res.status(200).json({ received: true, warning: 'Handler error logged' });
  }
}

async function handleUnitEvent(type: string, data: any): Promise<void> {
  const attrs = data?.attributes ?? {};
  const id = data?.id ?? '';

  switch (type) {
    // -----------------------------------------------------------------------
    // Customer KYC
    // -----------------------------------------------------------------------
    case 'customer.verified': {
      const customerId = id;
      if (customerId) {
        await updateCustomerKycStatus(customerId, 'approved');
      }
      break;
    }

    case 'customer.denied': {
      const customerId = id;
      if (customerId) {
        await updateCustomerKycStatus(customerId, 'denied');
      }
      break;
    }

    // -----------------------------------------------------------------------
    // Account balance sync
    // -----------------------------------------------------------------------
    case 'account.opened':
    case 'account.updated': {
      const accountId = id;
      if (!accountId) break;
      const row = await getAccountByUnitId(accountId);
      if (!row) break;
      const balanceCents = Number(attrs.balance ?? row.balance_cents ?? 0);
      const availableCents = Number(attrs.available ?? row.available_balance_cents ?? 0);
      await updateAccountBalance(accountId, balanceCents, availableCents);
      break;
    }

    case 'account.closed': {
      const accountId = id;
      if (accountId) {
        await updateAccountBalance(accountId, 0, 0);
      }
      break;
    }

    // -----------------------------------------------------------------------
    // Payment settlement — apply balance changes on final state transitions
    // -----------------------------------------------------------------------
    case 'payment.cleared': {
      // Unit echoes account balance in the payment's attributes.account relationship.
      // Pull the account ID from relationships if available.
      const accountId = data?.relationships?.account?.data?.id;
      if (!accountId) break;
      const row = await getAccountByUnitId(accountId);
      if (!row) break;
      // Cleared payment: amount is sent out, decrease available
      const amount = Number(attrs.amount ?? 0);
      const direction = (attrs.direction ?? '') as 'Debit' | 'Credit';
      const delta = direction === 'Debit' ? -amount : amount;
      await updateAccountBalance(
        accountId,
        Math.max(0, row.balance_cents + delta),
        Math.max(0, row.available_balance_cents + delta)
      );
      break;
    }

    case 'payment.returned':
    case 'payment.rejected': {
      // Returned/rejected — reverse any provisional balance change.
      const accountId = data?.relationships?.account?.data?.id;
      if (!accountId) break;
      const row = await getAccountByUnitId(accountId);
      if (!row) break;
      const amount = Number(attrs.amount ?? 0);
      const direction = (attrs.direction ?? 'Debit') as 'Debit' | 'Credit';
      // Reverse the original direction
      const reversal = direction === 'Debit' ? amount : -amount;
      await updateAccountBalance(
        accountId,
        Math.max(0, row.balance_cents + reversal),
        Math.max(0, row.available_balance_cents + reversal)
      );
      break;
    }

    default:
      // Unknown event type — log and ignore
      console.info('[webhook/unit] unhandled event type:', type);
  }
}
