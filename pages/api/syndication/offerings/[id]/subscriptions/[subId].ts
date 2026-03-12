import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, subId } = req.query;

  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const existing = await pool.query(
      `SELECT id, status, payment_currency, investor_wallet
       FROM syn_subscriptions WHERE id = $1 AND offering_id = $2`,
      [subId, id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const sub = existing.rows[0];
    const editableStatuses = ['draft', 'submitted'];
    if (!editableStatuses.includes(sub.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot update payment details on a subscription with status "${sub.status}". Only draft and submitted subscriptions can be edited.`,
      });
    }

    const { paymentCurrency, investorWallet } = req.body;

    const updates: string[] = ['updated_at = now()'];
    const params: any[] = [];

    if (paymentCurrency !== undefined) {
      const validCurrencies = ['USD', 'AXUSD'];
      if (!validCurrencies.includes(paymentCurrency)) {
        return res.status(400).json({ success: false, error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` });
      }
      params.push(paymentCurrency);
      updates.push(`payment_currency = $${params.length}`);
    }

    if (investorWallet !== undefined) {
      if (investorWallet && !/^0x[a-fA-F0-9]{40}$/.test(investorWallet)) {
        return res.status(400).json({ success: false, error: 'Invalid wallet address format. Must be a valid Ethereum address (0x...).' });
      }
      params.push(investorWallet || null);
      updates.push(`investor_wallet = $${params.length}`);
    }

    if (params.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update. Provide paymentCurrency and/or investorWallet.' });
    }

    params.push(subId);
    await pool.query(
      `UPDATE syn_subscriptions SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );

    return res.status(200).json({ success: true, message: 'Subscription payment details updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
