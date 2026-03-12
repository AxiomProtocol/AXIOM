import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../../server/db';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';')
      .map(cookie => {
        const [key, ...val] = cookie.trim().split('=');
        const sanitizedKey = key.replace(/[^\w\-_.]/g, '');
        const sanitizedVal = val.join('=').replace(/[^\w\-_.=]/g, '');
        return [sanitizedKey, sanitizedVal];
      })
      .filter(([key]) => key.length > 0)
  );
}

async function getAuthenticatedWallet(req: NextApiRequest): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['siwe_session'];
  if (!sessionToken) return null;
  try {
    const result = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );
    return result.rows.length > 0 ? result.rows[0].wallet_address : null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, subId } = req.query;

  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required. Connect your wallet and sign in.' });
  }

  try {
    const existing = await pool.query(
      `SELECT s.id, s.status, s.payment_currency, s.investor_wallet, s.investor_profile_id,
              o.created_by
       FROM syn_subscriptions s
       JOIN syn_offerings o ON o.id = s.offering_id
       LEFT JOIN syn_investor_profiles ip ON ip.id = s.investor_profile_id
       WHERE s.id = $1 AND s.offering_id = $2`,
      [subId, id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const sub = existing.rows[0];

    const isOfferingOperator = sub.created_by && sub.created_by.toLowerCase() === wallet.toLowerCase();
    const isSubscriptionOwner = sub.investor_wallet && sub.investor_wallet.toLowerCase() === wallet.toLowerCase();

    if (!isOfferingOperator && !isSubscriptionOwner) {
      return res.status(403).json({ success: false, error: 'Not authorized to modify this subscription' });
    }

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
    params.push(id);
    await pool.query(
      `UPDATE syn_subscriptions SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND offering_id = $${params.length}`,
      params
    );

    return res.status(200).json({ success: true, message: 'Subscription payment details updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
