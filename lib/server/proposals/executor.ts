import { eq, and, sql } from 'drizzle-orm';
import { db, pool } from '../../../server/db';
import {
  adminProposals,
  adminProposalEvents,
  adminAuditLog,
  payoutStateHistory,
  transactionReversals,
  userRoles,
} from '../../../shared/schema';
import { ActorContext, AdminRole } from '../adminAuth';
import {
  allowedApproverRoles,
  isValidActionType,
  ActionType,
} from '../adminPolicy';
import { supabaseAdmin, disableAuthUser, createAuthUser } from '../supabaseAdmin';

export interface ExecutionResult {
  success: boolean;
  proposalId: string;
  action: string;
  executedAt: string;
  executedBy: string;
  requestId?: string;
  result?: Record<string, unknown>;
  error?: string;
  dryRun?: boolean;
  dryRunDetails?: {
    wouldExecute: boolean;
    validationPassed: boolean;
    beforeState: Record<string, unknown> | null;
    simulatedAfterState: Record<string, unknown> | null;
    warnings: string[];
  };
}

export interface ExecuteOptions {
  dryRun?: boolean;
}

export interface ProposalRecord {
  id: string;
  actionType: string;
  targetType: string;
  targetId: string;
  amount: string | null;
  payload: Record<string, unknown>;
  status: string;
  reason: string;
  approvalReason: string | null;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  executedBy: string | null;
  executedAt: Date | null;
  requestId: string;
  uniqueKey: string;
  executionResult: Record<string, unknown> | null;
}

async function captureBeforeState(
  targetType: string,
  targetId: string
): Promise<Record<string, unknown> | null> {
  try {
    switch (targetType) {
      case 'user':
        const userResult = await pool.query(
          'SELECT * FROM user_roles WHERE user_id = $1',
          [targetId]
        );
        return userResult.rows[0] ?? null;
      case 'payout':
        const payoutResult = await pool.query(
          'SELECT * FROM keygrow_payments WHERE payment_id = $1',
          [targetId]
        );
        return payoutResult.rows[0] ?? null;
      case 'transaction':
        const txResult = await pool.query(
          'SELECT * FROM checking_transactions WHERE id = $1',
          [targetId]
        );
        return txResult.rows[0] ?? null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function simulateAfterState(
  proposal: ProposalRecord,
  beforeState: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!beforeState) return null;
  
  const payload = proposal.payload;
  const simulated = { ...beforeState };
  
  switch (proposal.actionType) {
    case 'transaction_reverse':
    case 'transaction_refund':
      simulated.status = 'reversed';
      simulated.simulated = true;
      break;
    case 'payout_reverse':
      simulated.status = 'reversed';
      simulated.simulated = true;
      break;
    case 'payout_override':
      if (payload && typeof payload === 'object' && 'newStatus' in payload) {
        simulated.status = (payload as { newStatus: string }).newStatus;
      }
      simulated.simulated = true;
      break;
    case 'role_escalation':
      if (payload && typeof payload === 'object' && 'newRole' in payload) {
        simulated.role = (payload as { newRole: string }).newRole;
      }
      simulated.simulated = true;
      break;
    case 'disable_privileged_user':
    case 'moderation_ban_privileged':
      simulated.disabled = true;
      simulated.simulated = true;
      break;
    case 'user_create_privileged':
      return {
        userId: '[SIMULATED_UUID]',
        email: (payload as { email?: string })?.email ?? 'unknown',
        role: (payload as { role?: string })?.role ?? 'unknown',
        simulated: true,
      };
    default:
      simulated.simulated = true;
  }
  
  return simulated;
}

async function executeTransactionReverse(
  proposal: ProposalRecord,
  actor: ActorContext,
  client: any
): Promise<Record<string, unknown>> {
  const payload = proposal.payload as {
    originalTransactionId: string;
    amount: number;
    accountId: number;
  };

  const reversalId = `REV-${proposal.id.substring(0, 8)}`;

  await client.query(
    `INSERT INTO checking_transactions 
     (account_id, transaction_type, amount, description, status, balance_after, initiated_by)
     VALUES ($1, 'REVERSAL', $2, $3, 'posted', 
       (SELECT balance_after FROM checking_transactions WHERE id = $1 ORDER BY created_at DESC LIMIT 1) + $2,
       $4)
     RETURNING id`,
    [
      payload.accountId,
      payload.amount,
      `Reversal of transaction ${payload.originalTransactionId}: ${proposal.reason}`,
      actor.userId,
    ]
  );

  await client.query(
    `INSERT INTO transaction_reversals 
     (original_transaction_id, reversal_transaction_id, created_by, proposal_id, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      payload.originalTransactionId,
      reversalId,
      actor.userId,
      proposal.id,
      proposal.reason,
    ]
  );

  return {
    originalTransactionId: payload.originalTransactionId,
    reversalId,
    amount: payload.amount,
    status: 'reversed',
  };
}

async function executeTransactionRefund(
  proposal: ProposalRecord,
  actor: ActorContext,
  client: any
): Promise<Record<string, unknown>> {
  const payload = proposal.payload as {
    originalTransactionId: string;
    amount: number;
    accountId: number;
    refundReason: string;
  };

  const refundResult = await client.query(
    `INSERT INTO checking_transactions 
     (account_id, transaction_type, amount, description, status, balance_after, initiated_by)
     VALUES ($1, 'REFUND', $2, $3, 'posted',
       (SELECT balance_after FROM checking_transactions WHERE id = $1 ORDER BY created_at DESC LIMIT 1) + $2,
       $4)
     RETURNING id`,
    [
      payload.accountId,
      payload.amount,
      `Refund: ${payload.refundReason}`,
      actor.userId,
    ]
  );

  return {
    originalTransactionId: payload.originalTransactionId,
    refundTransactionId: refundResult.rows[0].id,
    amount: payload.amount,
    status: 'refunded',
  };
}

async function executePayoutReverse(
  proposal: ProposalRecord,
  actor: ActorContext,
  client: any
): Promise<Record<string, unknown>> {
  const payload = proposal.payload as {
    payoutId: string;
    currentStatus: string;
  };

  await client.query(
    `UPDATE keygrow_payments SET status = 'refunded' WHERE payment_id = $1`,
    [payload.payoutId]
  );

  await client.query(
    `INSERT INTO payout_state_history 
     (payout_id, from_status, to_status, changed_by, proposal_id, reason)
     VALUES ($1, $2, 'reversed', $3, $4, $5)`,
    [
      payload.payoutId,
      payload.currentStatus,
      actor.userId,
      proposal.id,
      proposal.reason,
    ]
  );

  return {
    payoutId: payload.payoutId,
    fromStatus: payload.currentStatus,
    toStatus: 'reversed',
  };
}

async function executePayoutOverride(
  proposal: ProposalRecord,
  actor: ActorContext,
  client: any
): Promise<Record<string, unknown>> {
  const payload = proposal.payload as {
    payoutId: string;
    currentStatus: string;
    newStatus: string;
    overrideReason: string;
  };

  await client.query(
    `UPDATE keygrow_payments SET status = $1 WHERE payment_id = $2`,
    [payload.newStatus, payload.payoutId]
  );

  await client.query(
    `INSERT INTO payout_state_history 
     (payout_id, from_status, to_status, changed_by, proposal_id, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      payload.payoutId,
      payload.currentStatus,
      payload.newStatus,
      actor.userId,
      proposal.id,
      payload.overrideReason,
    ]
  );

  return {
    payoutId: payload.payoutId,
    fromStatus: payload.currentStatus,
    toStatus: payload.newStatus,
    override: true,
  };
}

async function executeRoleEscalation(
  proposal: ProposalRecord,
  actor: ActorContext,
  client: any
): Promise<Record<string, unknown>> {
  const payload = proposal.payload as {
    targetUserId: string;
    currentRole: string | null;
    newRole: AdminRole;
  };

  if (payload.currentRole) {
    await client.query(
      `UPDATE user_roles SET role = $1 WHERE user_id = $2`,
      [payload.newRole, payload.targetUserId]
    );
  } else {
    await client.query(
      `INSERT INTO user_roles (user_id, role, created_by_admin_id) VALUES ($1, $2, $3)`,
      [payload.targetUserId, payload.newRole, actor.userId]
    );
  }

  return {
    targetUserId: payload.targetUserId,
    previousRole: payload.currentRole,
    newRole: payload.newRole,
  };
}

async function executeDisablePrivilegedUser(
  proposal: ProposalRecord,
  actor: ActorContext,
  client: any
): Promise<Record<string, unknown>> {
  const payload = proposal.payload as {
    targetUserId: string;
    currentRole: AdminRole;
  };

  await disableAuthUser(payload.targetUserId);

  return {
    targetUserId: payload.targetUserId,
    role: payload.currentRole,
    disabled: true,
  };
}

async function executeUserCreatePrivileged(
  proposal: ProposalRecord,
  actor: ActorContext,
  client: any
): Promise<Record<string, unknown>> {
  const payload = proposal.payload as {
    email: string;
    password: string;
    role: AdminRole;
    metadata?: Record<string, unknown>;
  };

  const user = await createAuthUser(payload.email, payload.password, payload.metadata);

  await client.query(
    `INSERT INTO user_roles (user_id, role, created_by_admin_id) VALUES ($1, $2, $3)`,
    [user.id, payload.role, actor.userId]
  );

  return {
    userId: user.id,
    email: payload.email,
    role: payload.role,
  };
}

async function executeModerationBanPrivileged(
  proposal: ProposalRecord,
  actor: ActorContext,
  client: any
): Promise<Record<string, unknown>> {
  const payload = proposal.payload as {
    targetUserId: string;
    currentRole: AdminRole;
    banReason: string;
  };

  await disableAuthUser(payload.targetUserId);

  return {
    targetUserId: payload.targetUserId,
    role: payload.currentRole,
    banned: true,
    reason: payload.banReason,
  };
}

export async function executeProposal(
  proposalId: string,
  approverActor: ActorContext,
  approvalReason: string,
  options: ExecuteOptions = {}
): Promise<ExecutionResult> {
  const { dryRun = false } = options;
  const client = await pool.connect();
  const warnings: string[] = [];

  try {
    await client.query('BEGIN');

    const lockResult = await client.query(
      `SELECT * FROM admin_proposals WHERE id = $1 FOR UPDATE`,
      [proposalId]
    );

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        proposalId,
        action: 'unknown',
        executedAt: new Date().toISOString(),
        executedBy: approverActor.userId,
        error: 'Proposal not found',
        dryRun,
      };
    }

    const proposal = lockResult.rows[0] as ProposalRecord;

    if (proposal.status === 'executed' && proposal.executionResult) {
      await client.query('ROLLBACK');
      return {
        success: true,
        proposalId,
        action: proposal.actionType,
        executedAt: proposal.executedAt?.toISOString() ?? new Date().toISOString(),
        executedBy: proposal.executedBy ?? approverActor.userId,
        result: proposal.executionResult as Record<string, unknown>,
        dryRun,
      };
    }

    if (proposal.status !== 'pending') {
      await client.query('ROLLBACK');
      return {
        success: false,
        proposalId,
        action: proposal.actionType,
        executedAt: new Date().toISOString(),
        executedBy: approverActor.userId,
        error: `Proposal status is '${proposal.status}', expected 'pending'`,
        dryRun,
      };
    }

    if (proposal.expiresAt && new Date(proposal.expiresAt) < new Date()) {
      if (!dryRun) {
        await client.query(
          `UPDATE admin_proposals SET status = 'expired' WHERE id = $1`,
          [proposalId]
        );
        await client.query('COMMIT');
      } else {
        await client.query('ROLLBACK');
        warnings.push('Proposal would be marked as expired');
      }
      return {
        success: false,
        proposalId,
        action: proposal.actionType,
        executedAt: new Date().toISOString(),
        executedBy: approverActor.userId,
        error: 'Proposal has expired',
        dryRun,
      };
    }

    if (proposal.createdBy === approverActor.userId) {
      await client.query('ROLLBACK');
      return {
        success: false,
        proposalId,
        action: proposal.actionType,
        executedAt: new Date().toISOString(),
        executedBy: approverActor.userId,
        error: 'Approver must be a different user than the proposer',
        dryRun,
      };
    }

    if (!isValidActionType(proposal.actionType)) {
      await client.query('ROLLBACK');
      return {
        success: false,
        proposalId,
        action: proposal.actionType,
        executedAt: new Date().toISOString(),
        executedBy: approverActor.userId,
        error: `Invalid action type: ${proposal.actionType}`,
        dryRun,
      };
    }

    const amount = proposal.amount ? parseFloat(proposal.amount) : undefined;
    const allowedRoles = allowedApproverRoles(proposal.actionType as ActionType, amount);
    
    if (!allowedRoles.includes(approverActor.role)) {
      await client.query('ROLLBACK');
      return {
        success: false,
        proposalId,
        action: proposal.actionType,
        executedAt: new Date().toISOString(),
        executedBy: approverActor.userId,
        error: `Role '${approverActor.role}' cannot approve this action. Required: ${allowedRoles.join(', ')}`,
      };
    }

    const beforeState = await captureBeforeState(proposal.targetType, proposal.targetId);

    if (dryRun) {
      await client.query('ROLLBACK');
      
      const simulatedAfterState = simulateAfterState(proposal, beforeState);
      
      return {
        success: true,
        proposalId,
        action: proposal.actionType,
        executedAt: new Date().toISOString(),
        executedBy: approverActor.userId,
        requestId: proposal.requestId,
        dryRun: true,
        dryRunDetails: {
          wouldExecute: true,
          validationPassed: true,
          beforeState,
          simulatedAfterState,
          warnings,
        },
      };
    }

    let actionResult: Record<string, unknown>;

    switch (proposal.actionType as ActionType) {
      case 'transaction_reverse':
        actionResult = await executeTransactionReverse(proposal, approverActor, client);
        break;
      case 'transaction_refund':
        actionResult = await executeTransactionRefund(proposal, approverActor, client);
        break;
      case 'payout_reverse':
        actionResult = await executePayoutReverse(proposal, approverActor, client);
        break;
      case 'payout_override':
        actionResult = await executePayoutOverride(proposal, approverActor, client);
        break;
      case 'role_escalation':
        actionResult = await executeRoleEscalation(proposal, approverActor, client);
        break;
      case 'disable_privileged_user':
        actionResult = await executeDisablePrivilegedUser(proposal, approverActor, client);
        break;
      case 'user_create_privileged':
        actionResult = await executeUserCreatePrivileged(proposal, approverActor, client);
        break;
      case 'moderation_ban_privileged':
        actionResult = await executeModerationBanPrivileged(proposal, approverActor, client);
        break;
      default:
        await client.query('ROLLBACK');
        return {
          success: false,
          proposalId,
          action: proposal.actionType,
          executedAt: new Date().toISOString(),
          executedBy: approverActor.userId,
          error: `Unhandled action type: ${proposal.actionType}`,
          dryRun,
        };
    }

    const executedAt = new Date();
    const executionResult = {
      success: true,
      action: proposal.actionType,
      result: actionResult,
      executedAt: executedAt.toISOString(),
      executedBy: approverActor.userId,
    };

    await client.query(
      `UPDATE admin_proposals 
       SET status = 'executed', 
           approved_by = $1, 
           approved_at = $2, 
           executed_by = $1, 
           executed_at = $2,
           approval_reason = $3,
           execution_result = $4
       WHERE id = $5`,
      [approverActor.userId, executedAt, approvalReason, JSON.stringify(executionResult), proposalId]
    );

    await client.query(
      `INSERT INTO admin_proposal_events 
       (proposal_id, event_type, actor_user_id, actor_role, request_id, ip_address, user_agent, event_payload)
       VALUES ($1, 'approved', $2, $3, $4, $5, $6, $7)`,
      [
        proposalId,
        approverActor.userId,
        approverActor.role,
        approverActor.requestId,
        approverActor.ipAddress,
        approverActor.userAgent,
        JSON.stringify({ approval_reason: approvalReason }),
      ]
    );

    await client.query(
      `INSERT INTO admin_proposal_events 
       (proposal_id, event_type, actor_user_id, actor_role, request_id, ip_address, user_agent, event_payload)
       VALUES ($1, 'executed', $2, $3, $4, $5, $6, $7)`,
      [
        proposalId,
        approverActor.userId,
        approverActor.role,
        approverActor.requestId,
        approverActor.ipAddress,
        approverActor.userAgent,
        JSON.stringify(actionResult),
      ]
    );

    const afterState = await captureBeforeState(proposal.targetType, proposal.targetId);

    await client.query(
      `INSERT INTO admin_audit_log 
       (actor_user_id, actor_role, action, target_type, target_id, request_id, 
        ip_address, user_agent, before_state, after_state, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        approverActor.userId,
        approverActor.role,
        `proposal_executed:${proposal.actionType}`,
        proposal.targetType,
        proposal.targetId,
        approverActor.requestId,
        approverActor.ipAddress,
        approverActor.userAgent,
        JSON.stringify(beforeState),
        JSON.stringify(afterState),
        `Proposal: ${proposal.reason} | Approval: ${approvalReason}`,
      ]
    );

    await client.query('COMMIT');

    return {
      success: true,
      proposalId,
      action: proposal.actionType,
      executedAt: executedAt.toISOString(),
      executedBy: approverActor.userId,
      result: actionResult,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      proposalId,
      action: 'unknown',
      executedAt: new Date().toISOString(),
      executedBy: approverActor.userId,
      error: errorMessage,
    };
  } finally {
    client.release();
  }
}

export async function rejectProposal(
  proposalId: string,
  actor: ActorContext,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lockResult = await client.query(
      `SELECT * FROM admin_proposals WHERE id = $1 FOR UPDATE`,
      [proposalId]
    );

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Proposal not found' };
    }

    const proposal = lockResult.rows[0];

    if (proposal.status !== 'pending') {
      await client.query('ROLLBACK');
      return { success: false, error: `Proposal status is '${proposal.status}', expected 'pending'` };
    }

    if (proposal.created_by === actor.userId) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Rejector must be a different user than the proposer' };
    }

    await client.query(
      `UPDATE admin_proposals 
       SET status = 'rejected', 
           rejected_by = $1, 
           rejected_at = $2,
           approval_reason = $3
       WHERE id = $4`,
      [actor.userId, new Date(), rejectionReason, proposalId]
    );

    await client.query(
      `INSERT INTO admin_proposal_events 
       (proposal_id, event_type, actor_user_id, actor_role, request_id, ip_address, user_agent, event_payload)
       VALUES ($1, 'rejected', $2, $3, $4, $5, $6, $7)`,
      [
        proposalId,
        actor.userId,
        actor.role,
        actor.requestId,
        actor.ipAddress,
        actor.userAgent,
        JSON.stringify({ rejection_reason: rejectionReason }),
      ]
    );

    await client.query(
      `INSERT INTO admin_audit_log 
       (actor_user_id, actor_role, action, target_type, target_id, request_id, 
        ip_address, user_agent, reason)
       VALUES ($1, $2, 'proposal_rejected', $3, $4, $5, $6, $7, $8)`,
      [
        actor.userId,
        actor.role,
        proposal.target_type,
        proposal.target_id,
        actor.requestId,
        actor.ipAddress,
        actor.userAgent,
        rejectionReason,
      ]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  } finally {
    client.release();
  }
}

export async function cancelProposal(
  proposalId: string,
  actor: ActorContext,
  cancellationReason: string
): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lockResult = await client.query(
      `SELECT * FROM admin_proposals WHERE id = $1 FOR UPDATE`,
      [proposalId]
    );

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Proposal not found' };
    }

    const proposal = lockResult.rows[0];

    if (proposal.status !== 'pending') {
      await client.query('ROLLBACK');
      return { success: false, error: `Proposal status is '${proposal.status}', expected 'pending'` };
    }

    const isProposer = proposal.created_by === actor.userId;
    const isSuperadmin = actor.role === 'superadmin';

    if (!isProposer && !isSuperadmin) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Only the proposer or a superadmin can cancel a proposal' };
    }

    await client.query(
      `UPDATE admin_proposals 
       SET status = 'cancelled', 
           cancelled_by = $1, 
           cancelled_at = $2
       WHERE id = $3`,
      [actor.userId, new Date(), proposalId]
    );

    await client.query(
      `INSERT INTO admin_proposal_events 
       (proposal_id, event_type, actor_user_id, actor_role, request_id, ip_address, user_agent, event_payload)
       VALUES ($1, 'cancelled', $2, $3, $4, $5, $6, $7)`,
      [
        proposalId,
        actor.userId,
        actor.role,
        actor.requestId,
        actor.ipAddress,
        actor.userAgent,
        JSON.stringify({ cancellation_reason: cancellationReason }),
      ]
    );

    await client.query(
      `INSERT INTO admin_audit_log 
       (actor_user_id, actor_role, action, target_type, target_id, request_id, 
        ip_address, user_agent, reason)
       VALUES ($1, $2, 'proposal_cancelled', $3, $4, $5, $6, $7, $8)`,
      [
        actor.userId,
        actor.role,
        proposal.target_type,
        proposal.target_id,
        actor.requestId,
        actor.ipAddress,
        actor.userAgent,
        cancellationReason,
      ]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  } finally {
    client.release();
  }
}
