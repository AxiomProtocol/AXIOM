import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../../server/db';
import { recordCapitalIntelligenceEvent } from '../../../../../../lib/capitalIntelligence';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';')
      .map(cookie => {
        const [key, ...val] = cookie.trim().split('=');
        return [key, decodeURIComponent(val.join('='))];
      })
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
  const { id: offeringId, callId } = req.query;

  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: 'status is required.' });
  }

  const validStatuses = ['acknowledged', 'funded', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const existing = await pool.query(
      `SELECT cc.id, cc.status, o.created_by
       FROM syn_capital_calls cc
       JOIN syn_offerings o ON o.id = cc.offering_id
       WHERE cc.id = $1 AND cc.offering_id = $2`,
      [callId, offeringId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Capital call not found.' });
    }

    const call = existing.rows[0];
    const isOperator = call.created_by && call.created_by.toLowerCase() === wallet.toLowerCase();
    if (!isOperator) {
      return res.status(403).json({ success: false, error: 'Only the offering operator can update capital call status.' });
    }

    const statusOrder: Record<string, number> = { sent: 0, acknowledged: 1, funded: 2, cancelled: 3 };
    const currentOrder = statusOrder[call.status] ?? 0;
    const newOrder = statusOrder[status] ?? 0;

    if (status !== 'cancelled' && newOrder <= currentOrder) {
      return res.status(400).json({ success: false, error: `Cannot transition from "${call.status}" to "${status}". Status must move forward.` });
    }

    if (status === 'cancelled' && call.status === 'funded') {
      return res.status(400).json({ success: false, error: 'Cannot cancel a funded capital call.' });
    }

    await pool.query(
      `UPDATE syn_capital_calls SET status = $1, updated_at = now() WHERE id = $2 AND offering_id = $3`,
      [status, callId, offeringId]
    );

    if (status === 'funded') {
      await recordCapitalIntelligenceEvent({
        offeringId: offeringId as string,
        eventType: 'capital_call_paid',
        capitalSourceType: 'capital_call',
        payload: {
          callId,
          previousStatus: call.status,
          markedFundedBy: wallet,
        },
      });
    }

    return res.status(200).json({ success: true, message: `Capital call status updated to "${status}".` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
