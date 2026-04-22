/**
 * Bridge allow-list governance service.
 *
 * Operationalises the proposal flow described in the Collateral Risk
 * Policy (`documents/policies/collateral-risk-policy.md`) and on the
 * public `/trust/no-bridges` page. A proposal walks:
 *
 *   DRAFT
 *     → COMMENT (open for at least 14 days of public comment)
 *       → VOTE (governance voting window)
 *         → APPROVED → EXECUTED (validity adapter set on chain, asset
 *                                 admitted into CollateralRiskConfig)
 *         → REJECTED
 *     → WITHDRAWN
 *
 * Only operators (super-admin via x-admin-key) can mutate proposals.
 * Public actors can list proposals and post comments.
 */

import { db } from '../../../server/db';
import {
  capBridgeAllowlistProposals,
  capBridgeAllowlistProposalComments,
  capAuditEvents,
  type CapBridgeAllowlistProposal,
  type CapBridgeAllowlistProposalComment,
  type NewCapBridgeAllowlistProposal,
  type NewCapBridgeAllowlistProposalComment,
  type NewCapAuditEvent,
} from '../../../shared/capInfraSchema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { generateId } from '../ids';

export type ProposalStatus =
  | 'DRAFT'
  | 'COMMENT'
  | 'VOTE'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'WITHDRAWN';

const VALID_STATUSES: ReadonlyArray<ProposalStatus> = [
  'DRAFT', 'COMMENT', 'VOTE', 'APPROVED', 'REJECTED', 'EXECUTED', 'WITHDRAWN',
];

const MIN_COMMENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface CreateProposalInput {
  assetSymbol: string;
  bridgeProvenance: string;
  validityAdapterAddress?: string | null;
  perAssetCap?: string | null;
  commentWindowEndsAt?: Date | null;
  createdBy?: string | null;
  metadataJson?: Record<string, unknown> | null;
}

function emitAudit(actor: string, action: string, refId: string, payload: Record<string, unknown>) {
  const evt: NewCapAuditEvent = {
    id: generateId('ae'),
    actorId: actor,
    actorType: 'OPERATOR',
    action,
    objectType: 'BRIDGE_ALLOWLIST_PROPOSAL',
    objectId: refId,
    payloadJson: payload,
  } as unknown as NewCapAuditEvent;
  return db.insert(capAuditEvents).values(evt);
}

export async function createProposal(input: CreateProposalInput): Promise<CapBridgeAllowlistProposal> {
  const symbol = input.assetSymbol.trim().toUpperCase();
  if (symbol.length === 0 || symbol.length > 32) {
    throw new Error('assetSymbol must be 1..32 characters');
  }
  if (!input.bridgeProvenance || input.bridgeProvenance.trim().length === 0) {
    throw new Error('bridgeProvenance is required');
  }
  const now = Date.now();
  const commentEnd = input.commentWindowEndsAt
    ? new Date(input.commentWindowEndsAt)
    : new Date(now + MIN_COMMENT_WINDOW_MS);
  if (commentEnd.getTime() < now + MIN_COMMENT_WINDOW_MS) {
    throw new Error('commentWindowEndsAt must be at least 14 days from now');
  }
  const id = generateId('bap');
  const row: NewCapBridgeAllowlistProposal = {
    id,
    assetSymbol: symbol,
    bridgeProvenance: input.bridgeProvenance.trim(),
    validityAdapterAddress: input.validityAdapterAddress ?? null,
    perAssetCap: input.perAssetCap ?? null,
    commentWindowEndsAt: commentEnd,
    status: 'COMMENT',
    yesVotes: 0,
    noVotes: 0,
    createdBy: input.createdBy ?? null,
    metadataJson: input.metadataJson ?? null,
  };
  const [inserted] = await db.insert(capBridgeAllowlistProposals).values(row).returning();
  await emitAudit(input.createdBy ?? 'system', 'BRIDGE_ALLOWLIST_PROPOSAL_CREATED', id, {
    assetSymbol: symbol,
  });
  return inserted;
}

export interface AdvanceStatusInput {
  proposalId: string;
  toStatus: ProposalStatus;
  actor: string;
  executedTxHash?: string | null;
  reason?: string | null;
}

export async function advanceStatus(input: AdvanceStatusInput): Promise<CapBridgeAllowlistProposal> {
  if (!VALID_STATUSES.includes(input.toStatus)) {
    throw new Error(`invalid status ${input.toStatus}`);
  }
  const [existing] = await db
    .select()
    .from(capBridgeAllowlistProposals)
    .where(eq(capBridgeAllowlistProposals.id, input.proposalId))
    .limit(1);
  if (!existing) throw new Error('proposal not found');
  const updates: Record<string, unknown> = {
    status: input.toStatus,
  };
  if (input.toStatus === 'EXECUTED') {
    updates.executedAt = new Date();
    if (input.executedTxHash) updates.executedTxHash = input.executedTxHash;
  }
  const [updated] = await db
    .update(capBridgeAllowlistProposals)
    .set(updates)
    .where(eq(capBridgeAllowlistProposals.id, input.proposalId))
    .returning();
  await emitAudit(input.actor, 'BRIDGE_ALLOWLIST_PROPOSAL_ADVANCED', input.proposalId, {
    fromStatus: existing.status,
    toStatus: input.toStatus,
    reason: input.reason ?? null,
    executedTxHash: input.executedTxHash ?? null,
  });
  return updated;
}

export async function listProposals(opts?: { status?: ProposalStatus | null; limit?: number }) {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  const where = opts?.status
    ? and(eq(capBridgeAllowlistProposals.status, opts.status))
    : undefined;
  const rows = where
    ? await db.select().from(capBridgeAllowlistProposals).where(where).orderBy(desc(capBridgeAllowlistProposals.createdAt)).limit(limit)
    : await db.select().from(capBridgeAllowlistProposals).orderBy(desc(capBridgeAllowlistProposals.createdAt)).limit(limit);
  return rows;
}

export async function getProposal(id: string): Promise<CapBridgeAllowlistProposal | null> {
  const [row] = await db
    .select()
    .from(capBridgeAllowlistProposals)
    .where(eq(capBridgeAllowlistProposals.id, id))
    .limit(1);
  return row ?? null;
}

export async function listComments(proposalId: string): Promise<CapBridgeAllowlistProposalComment[]> {
  return db
    .select()
    .from(capBridgeAllowlistProposalComments)
    .where(eq(capBridgeAllowlistProposalComments.proposalId, proposalId))
    .orderBy(desc(capBridgeAllowlistProposalComments.createdAt));
}

export async function addComment(input: { proposalId: string; commenter: string; body: string }) {
  const proposal = await getProposal(input.proposalId);
  if (!proposal) throw new Error('proposal not found');
  if (proposal.status !== 'COMMENT' && proposal.status !== 'DRAFT' && proposal.status !== 'VOTE') {
    throw new Error('comments are accepted only during DRAFT, COMMENT, or VOTE');
  }
  const commenter = input.commenter.trim();
  const body = input.body.trim();
  if (commenter.length === 0 || commenter.length > 200) throw new Error('commenter must be 1..200 chars');
  if (body.length === 0 || body.length > 10000) throw new Error('body must be 1..10000 chars');
  const row: NewCapBridgeAllowlistProposalComment = {
    id: generateId('bac'),
    proposalId: input.proposalId,
    commenter,
    body,
  };
  const [inserted] = await db
    .insert(capBridgeAllowlistProposalComments)
    .values(row)
    .returning();
  return inserted;
}

/**
 * Returns the current allow-list state — i.e. proposals in EXECUTED
 * status. The on-chain CollateralRiskConfig is the canonical state;
 * this returns the DB projection used to render the public page.
 */
export async function listExecutedAllowlistEntries() {
  const rows = await db
    .select()
    .from(capBridgeAllowlistProposals)
    .where(eq(capBridgeAllowlistProposals.status, 'EXECUTED'))
    .orderBy(desc(capBridgeAllowlistProposals.executedAt));
  return rows;
}
