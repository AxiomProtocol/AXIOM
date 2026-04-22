/**
 * Loss Coverage Reserve claim service.
 *
 * Phase 1 (manual adjudication) per
 * `documents/trust/loss-coverage-reserve-policy.md`.
 *
 * Claim lifecycle:
 *   SUBMITTED → UNDER_REVIEW → APPROVED → PAID
 *                            → DENIED
 *                            → WITHDRAWN
 *
 * Public actors can submit a claim and view their own claim by id.
 * Operators (super-admin via x-admin-key) can list all claims and
 * mutate status.
 *
 * Every status change emits a row into `cap_loss_coverage_claim_events`
 * (append-only) and an audit event into `cap_audit_events`.
 */

import { db } from '../../../server/db';
import {
  capLossCoverageClaims,
  capLossCoverageClaimEvents,
  capAuditEvents,
  type CapLossCoverageClaim,
  type CapLossCoverageClaimEvent,
  type NewCapLossCoverageClaim,
  type NewCapLossCoverageClaimEvent,
  type NewCapAuditEvent,
} from '../../../shared/capInfraSchema';
import { eq, desc, and } from 'drizzle-orm';
import { generateId } from '../ids';

export type ClaimStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'DENIED'
  | 'PAID'
  | 'WITHDRAWN';

const VALID_STATUSES: ReadonlyArray<ClaimStatus> = [
  'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'PAID', 'WITHDRAWN',
];

export type EligibilityCategory =
  | 'SMART_CONTRACT_CONTROL_FAILURE'
  | 'ORACLE_FAILURE'
  | 'CUSTODY_PARTNER_FAILURE'
  | 'OTHER';

const VALID_CATEGORIES: ReadonlyArray<EligibilityCategory> = [
  'SMART_CONTRACT_CONTROL_FAILURE',
  'ORACLE_FAILURE',
  'CUSTODY_PARTNER_FAILURE',
  'OTHER',
];

const MIN_AMOUNT_CENTS = 100;
const MAX_AMOUNT_CENTS = 1_000_000_00; // $1m soft cap; reviewer may override

export interface SubmitClaimInput {
  claimantWallet: string;
  contactEmail?: string | null;
  positionRef?: string | null;
  txHashes?: string[] | null;
  description: string;
  amountRequestedCents: number;
  eligibilityCategory: EligibilityCategory;
  evidenceUrls?: Array<{ url: string; label?: string | null }> | null;
}

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}

function emitAudit(actor: string, action: string, refId: string, payload: Record<string, unknown>) {
  const evt: NewCapAuditEvent = {
    id: generateId('ae'),
    actorId: actor,
    actorType: 'OPERATOR',
    action,
    objectType: 'LOSS_COVERAGE_CLAIM',
    objectId: refId,
    payloadJson: payload,
  } as unknown as NewCapAuditEvent;
  return db.insert(capAuditEvents).values(evt);
}

async function recordClaimEvent(input: {
  claimId: string;
  eventType: string;
  actor?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
}) {
  const row: NewCapLossCoverageClaimEvent = {
    id: generateId('lce'),
    claimId: input.claimId,
    eventType: input.eventType,
    actor: input.actor ?? null,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    note: input.note ?? null,
  };
  await db.insert(capLossCoverageClaimEvents).values(row);
}

export async function submitClaim(input: SubmitClaimInput): Promise<CapLossCoverageClaim> {
  const wallet = input.claimantWallet.trim();
  if (!isAddress(wallet)) throw new Error('claimantWallet must be a 0x-prefixed 20-byte hex address');
  if (!input.description || input.description.trim().length === 0) {
    throw new Error('description is required');
  }
  if (input.description.length > 10000) throw new Error('description must be ≤ 10000 chars');
  if (
    !Number.isInteger(input.amountRequestedCents) ||
    input.amountRequestedCents < MIN_AMOUNT_CENTS ||
    input.amountRequestedCents > MAX_AMOUNT_CENTS
  ) {
    throw new Error(`amountRequestedCents must be an integer in [${MIN_AMOUNT_CENTS}, ${MAX_AMOUNT_CENTS}]`);
  }
  if (!VALID_CATEGORIES.includes(input.eligibilityCategory)) {
    throw new Error('eligibilityCategory invalid');
  }
  const id = generateId('lcc');
  const row: NewCapLossCoverageClaim = {
    id,
    claimantWallet: wallet,
    contactEmail: input.contactEmail?.trim() || null,
    positionRef: input.positionRef?.trim() || null,
    txHashesJson: input.txHashes && input.txHashes.length > 0 ? input.txHashes : null,
    description: input.description.trim(),
    amountRequestedCents: input.amountRequestedCents,
    eligibilityCategory: input.eligibilityCategory,
    status: 'SUBMITTED',
    evidenceUrlsJson: input.evidenceUrls && input.evidenceUrls.length > 0 ? input.evidenceUrls : null,
  };
  const [inserted] = await db.insert(capLossCoverageClaims).values(row).returning();
  await recordClaimEvent({
    claimId: id,
    eventType: 'SUBMITTED',
    actor: wallet,
    toStatus: 'SUBMITTED',
  });
  await emitAudit(wallet, 'LOSS_COVERAGE_CLAIM_SUBMITTED', id, {
    amountRequestedCents: input.amountRequestedCents,
    eligibilityCategory: input.eligibilityCategory,
  });
  return inserted;
}

export interface UpdateClaimStatusInput {
  claimId: string;
  toStatus: ClaimStatus;
  actor: string;
  reviewerNotes?: string | null;
  paidAmountCents?: number | null;
  paidTxHash?: string | null;
}

export async function updateClaimStatus(input: UpdateClaimStatusInput): Promise<CapLossCoverageClaim> {
  if (!VALID_STATUSES.includes(input.toStatus)) {
    throw new Error(`invalid status ${input.toStatus}`);
  }
  const [existing] = await db
    .select()
    .from(capLossCoverageClaims)
    .where(eq(capLossCoverageClaims.id, input.claimId))
    .limit(1);
  if (!existing) throw new Error('claim not found');

  const updates: Record<string, unknown> = {
    status: input.toStatus,
    updatedAt: new Date(),
  };
  if (input.reviewerNotes !== undefined && input.reviewerNotes !== null) {
    updates.reviewerNotes = input.reviewerNotes;
  }
  if (input.toStatus === 'APPROVED' || input.toStatus === 'DENIED') {
    updates.decidedAt = new Date();
    updates.decidedBy = input.actor;
  }
  if (input.toStatus === 'PAID') {
    if (!input.paidAmountCents || input.paidAmountCents <= 0) {
      throw new Error('paidAmountCents is required when transitioning to PAID');
    }
    if (!input.paidTxHash) {
      throw new Error('paidTxHash is required when transitioning to PAID');
    }
    updates.paidAmountCents = input.paidAmountCents;
    updates.paidTxHash = input.paidTxHash;
    updates.paidAt = new Date();
  }
  const [updated] = await db
    .update(capLossCoverageClaims)
    .set(updates)
    .where(eq(capLossCoverageClaims.id, input.claimId))
    .returning();
  await recordClaimEvent({
    claimId: input.claimId,
    eventType: 'STATUS_CHANGED',
    actor: input.actor,
    fromStatus: existing.status,
    toStatus: input.toStatus,
    note: input.reviewerNotes ?? null,
  });
  await emitAudit(input.actor, 'LOSS_COVERAGE_CLAIM_STATUS_CHANGED', input.claimId, {
    fromStatus: existing.status,
    toStatus: input.toStatus,
    paidAmountCents: input.paidAmountCents ?? null,
    paidTxHash: input.paidTxHash ?? null,
  });
  return updated;
}

export async function getClaim(id: string): Promise<CapLossCoverageClaim | null> {
  const [row] = await db
    .select()
    .from(capLossCoverageClaims)
    .where(eq(capLossCoverageClaims.id, id))
    .limit(1);
  return row ?? null;
}

export async function listClaims(opts?: { status?: ClaimStatus | null; limit?: number }) {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  const where = opts?.status ? and(eq(capLossCoverageClaims.status, opts.status)) : undefined;
  return where
    ? db.select().from(capLossCoverageClaims).where(where).orderBy(desc(capLossCoverageClaims.createdAt)).limit(limit)
    : db.select().from(capLossCoverageClaims).orderBy(desc(capLossCoverageClaims.createdAt)).limit(limit);
}

export async function listClaimEvents(claimId: string): Promise<CapLossCoverageClaimEvent[]> {
  return db
    .select()
    .from(capLossCoverageClaimEvents)
    .where(eq(capLossCoverageClaimEvents.claimId, claimId))
    .orderBy(desc(capLossCoverageClaimEvents.createdAt));
}

/**
 * Public projection — strips PII so the public listing can show
 * aggregate transparency without leaking claimant addresses or
 * contact emails.
 */
export interface PublicClaimRow {
  id: string;
  status: ClaimStatus;
  eligibilityCategory: string;
  amountRequestedCents: number;
  paidAmountCents: number | null;
  createdAt: string;
  decidedAt: string | null;
  paidAt: string | null;
  // Wallet shown as 0xABCD…1234 (first 6, last 4).
  claimantWalletShort: string;
}

export function toPublicRow(c: CapLossCoverageClaim): PublicClaimRow {
  const w = c.claimantWallet;
  return {
    id: c.id,
    status: c.status as ClaimStatus,
    eligibilityCategory: c.eligibilityCategory,
    amountRequestedCents: c.amountRequestedCents,
    paidAmountCents: c.paidAmountCents ?? null,
    createdAt: (c.createdAt as Date).toISOString(),
    decidedAt: c.decidedAt ? (c.decidedAt as Date).toISOString() : null,
    paidAt: c.paidAt ? (c.paidAt as Date).toISOString() : null,
    claimantWalletShort: w.length >= 10 ? `${w.slice(0, 6)}…${w.slice(-4)}` : w,
  };
}
