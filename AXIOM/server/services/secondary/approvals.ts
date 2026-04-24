import { pool } from '../../db';
import { auditLog } from './audit';
import { notifyParticipants } from './notifications';

export async function createApprovalRequests(
  transferRequestId: string,
  matchedTradeId: string | null,
  seriesId: string
): Promise<void> {
  const policies = await pool.query(
    `SELECT * FROM sec_approval_policies WHERE series_id = $1 AND is_required = TRUE`,
    [seriesId]
  );

  for (const policy of policies.rows) {
    const expiresAt = new Date(Date.now() + policy.timeout_hours * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO sec_approval_requests (transfer_request_id, matched_trade_id, approval_type, status, expires_at)
       VALUES ($1, $2, $3::sec_approval_type, 'pending', $4)`,
      [transferRequestId, matchedTradeId, policy.approval_type, expiresAt]
    );
  }
}

export async function getPendingApprovals(actorRole: string) {
  let typeFilter = '';
  if (actorRole === 'issuer') typeFilter = `AND ar.approval_type = 'issuer_approval'`;
  if (actorRole === 'compliance_officer') typeFilter = `AND ar.approval_type = 'compliance_approval'`;
  if (actorRole === 'admin') typeFilter = '';

  const result = await pool.query(
    `SELECT ar.*,
            tr.series_id, tr.seller_id, tr.buyer_id, tr.units_requested, tr.agreed_price_per_unit,
            s.name as series_name, s.asset_class,
            mt.gross_amount, mt.fees_amount, mt.net_seller_proceeds
     FROM sec_approval_requests ar
     JOIN sec_transfer_requests tr ON tr.id = ar.transfer_request_id
     JOIN sec_series s ON s.id = tr.series_id
     LEFT JOIN sec_matched_trades mt ON mt.id = ar.matched_trade_id
     WHERE ar.status = 'pending' ${typeFilter}
     ORDER BY ar.requested_at ASC
     LIMIT 50`
  );
  return result.rows;
}

export async function resolveApproval(
  approvalRequestId: string,
  actorId: string,
  actorType: string,
  decision: 'approved' | 'rejected',
  reason?: string,
  isOverride?: boolean
): Promise<void> {
  const apResult = await pool.query(
    `SELECT * FROM sec_approval_requests WHERE id = $1 LIMIT 1`,
    [approvalRequestId]
  );
  if (!apResult.rows[0]) throw new Error('Approval request not found');
  const ap = apResult.rows[0];

  if (ap.status !== 'pending') throw new Error('Approval already resolved');

  const finalDecision = isOverride ? 'overridden' : decision;

  await pool.query(
    `UPDATE sec_approval_requests
     SET status = $2::sec_approval_status, resolved_at = NOW(), resolved_by = $3,
         override_reason = $4
     WHERE id = $1`,
    [approvalRequestId, finalDecision, actorId, isOverride ? reason : null]
  );

  await pool.query(
    `INSERT INTO sec_approval_decisions (approval_request_id, actor_id, actor_type, decision, reason)
     VALUES ($1, $2, $3::sec_actor_type, $4::sec_approval_status, $5)`,
    [approvalRequestId, actorId, actorType, finalDecision, reason || null]
  );

  await auditLog({
    actorId,
    actorType: actorType as any,
    objectType: 'approval_request',
    objectId: approvalRequestId,
    action: `approval_${decision}`,
    metadata: { reason, isOverride },
  });

  if (isOverride) {
    await pool.query(
      `INSERT INTO sec_admin_actions (admin_id, action_type, target_object_type, target_object_id, reason, new_value)
       VALUES ($1, 'approval_override', 'approval_request', $2, $3, $4)`,
      [actorId, approvalRequestId, reason || 'No reason provided', JSON.stringify({ decision })]
    );
  }

  // Check if all approvals for this transfer are resolved
  const pendingCount = await pool.query(
    `SELECT COUNT(*) FROM sec_approval_requests
     WHERE transfer_request_id = $1 AND status = 'pending'`,
    [ap.transfer_request_id]
  );

  if (parseInt(pendingCount.rows[0].count) === 0) {
    const anyRejected = await pool.query(
      `SELECT COUNT(*) FROM sec_approval_requests
       WHERE transfer_request_id = $1 AND status = 'rejected'`,
      [ap.transfer_request_id]
    );

    if (parseInt(anyRejected.rows[0].count) > 0) {
      await pool.query(
        `UPDATE sec_transfer_requests SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
        [ap.transfer_request_id]
      );
      if (ap.matched_trade_id) {
        await pool.query(
          `UPDATE sec_matched_trades SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
          [ap.matched_trade_id]
        );
      }
    } else {
      await pool.query(
        `UPDATE sec_transfer_requests SET status = 'settlement_pending', updated_at = NOW() WHERE id = $1`,
        [ap.transfer_request_id]
      );
      if (ap.matched_trade_id) {
        await pool.query(
          `UPDATE sec_matched_trades SET status = 'approved', updated_at = NOW() WHERE id = $1`,
          [ap.matched_trade_id]
        );
      }
    }
  }

  await notifyParticipants(ap.transfer_request_id, `approval_${decision}`, { approvalRequestId, reason });
}

export async function getApprovalHistory(transferRequestId: string) {
  const result = await pool.query(
    `SELECT ar.*, ad.actor_id, ad.actor_type, ad.decision, ad.reason, ad.decided_at
     FROM sec_approval_requests ar
     LEFT JOIN sec_approval_decisions ad ON ad.approval_request_id = ar.id
     WHERE ar.transfer_request_id = $1
     ORDER BY ar.requested_at ASC`,
    [transferRequestId]
  );
  return result.rows;
}
