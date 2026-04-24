import { pool } from '../../db';

const EVENT_SUBJECTS: Record<string, string> = {
  listing_activated: 'Your listing is now live',
  interest_submitted: 'Buyer interest received on your listing',
  bid_received: 'New bid received on your listing',
  bid_accepted: 'Your bid has been accepted',
  approval_granted: 'Transfer approved — settlement instructions ready',
  approval_rejected: 'Transfer approval rejected',
  settlement_funding_required: 'Action required: Fund your AXUSD settlement',
  settlement_completed: 'Settlement complete — ownership updated',
  settlement_failed: 'Settlement failed — please contact support',
  transfer_blocked: 'Transfer request blocked by compliance check',
};

export async function notifyParticipants(
  transferRequestId: string,
  eventType: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const trResult = await pool.query(
      `SELECT tr.seller_id, tr.buyer_id,
              si.email as seller_email, bi.email as buyer_email
       FROM sec_transfer_requests tr
       LEFT JOIN sec_investors si ON si.id = tr.seller_id
       LEFT JOIN sec_investors bi ON bi.id = tr.buyer_id
       WHERE tr.id = $1 LIMIT 1`,
      [transferRequestId]
    );
    if (!trResult.rows[0]) return;

    const { seller_id, buyer_id, seller_email, buyer_email } = trResult.rows[0];
    const subject = EVENT_SUBJECTS[eventType] || eventType;

    const participants = [
      { investorId: seller_id, email: seller_email },
      ...(buyer_id ? [{ investorId: buyer_id, email: buyer_email }] : []),
    ];

    for (const p of participants) {
      await pool.query(
        `INSERT INTO sec_notifications (investor_id, recipient_email, event_type, channel, subject, metadata)
         VALUES ($1, $2, $3, 'in_app', $4, $5)`,
        [p.investorId, p.email, eventType, subject, JSON.stringify(metadata || {})]
      );
    }
  } catch (err) {
    console.error('[sec:notifications] Notify failed:', err);
  }
}

export async function getUnreadNotifications(investorId: string) {
  const result = await pool.query(
    `SELECT * FROM sec_notifications WHERE investor_id = $1 AND read_at IS NULL
     ORDER BY created_at DESC LIMIT 50`,
    [investorId]
  );
  return result.rows;
}

export async function markNotificationsRead(investorId: string, ids?: string[]): Promise<void> {
  if (ids && ids.length > 0) {
    await pool.query(
      `UPDATE sec_notifications SET read_at = NOW() WHERE investor_id = $1 AND id = ANY($2)`,
      [investorId, ids]
    );
  } else {
    await pool.query(
      `UPDATE sec_notifications SET read_at = NOW() WHERE investor_id = $1 AND read_at IS NULL`,
      [investorId]
    );
  }
}
