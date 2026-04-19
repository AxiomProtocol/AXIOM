/**
 * Capital Infrastructure — Identity Projection service.
 *
 * Phase 1 surface:
 *   - getProjection(userId) — returns user, identity profile, claims,
 *     wallets, and a `legacy` slice that joins onto pre-existing
 *     identity tables (`kyc_verifications`, `compliance_claims`) by
 *     wallet address. The projection is what the policy evaluator
 *     consumes.
 *   - getClaims(userId) — claims-only slice.
 *   - linkWallet — admin-authed wallet attachment.
 *
 * Identity *ingestion* (KYC providers, claim issuance) writes directly
 * to either the legacy tables (operated by external KYC pipelines) or
 * the canonical `cap_*` tables (operated by Axiom services). This
 * projection service only reads, and unifies both views so the
 * evaluator does not need to know where a claim originated.
 */

import { db } from '../../server/db';
import {
  capUsers,
  capIdentityProfiles,
  capClaims,
  capWallets,
  type CapUser,
  type CapIdentityProfile,
  type CapClaim,
  type CapWallet,
  type NewCapWallet,
} from '../../shared/capInfraSchema';
import { and, eq, sql } from 'drizzle-orm';
import { generateId } from './ids';
import { ConflictError, NotFoundError } from './errors';
import { emitAuditEventStrict } from './audit';

export interface LegacyKycVerification {
  walletAddress: string;
  provider: string | null;
  verificationId: string | null;
  status: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
}

export interface LegacyComplianceClaim {
  claimantAddress: string;
  claimType: string | null;
  status: string | null;
  evidenceCid: string | null;
  createdAt: string | null;
}

export interface LegacyIdentitySlice {
  kycVerifications: LegacyKycVerification[];
  complianceClaims: LegacyComplianceClaim[];
}

export interface IdentityProjection {
  user: CapUser;
  profile: CapIdentityProfile | null;
  claims: CapClaim[];
  wallets: CapWallet[];
  legacy: LegacyIdentitySlice;
}

interface LegacyKycRow {
  user_address: string;
  provider: string | null;
  verification_id: string | null;
  status: string | null;
  verified_at: Date | null;
  expires_at: Date | null;
}

interface LegacyClaimRow {
  claimant_address: string;
  claim_type: string | null;
  status: string | null;
  evidence_cid: string | null;
  created_at: Date | null;
}

async function loadLegacySlice(walletAddresses: string[]): Promise<LegacyIdentitySlice> {
  if (walletAddresses.length === 0) {
    return { kycVerifications: [], complianceClaims: [] };
  }
  const lower = walletAddresses.map((a) => a.toLowerCase());
  const kycResult = await db.execute(sql`
    SELECT user_address, provider, verification_id, status, verified_at, expires_at
    FROM kyc_verifications
    WHERE LOWER(user_address) = ANY(${lower}::text[])
  `);
  const claimsResult = await db.execute(sql`
    SELECT claimant_address, claim_type, status, evidence_cid, created_at
    FROM compliance_claims
    WHERE LOWER(claimant_address) = ANY(${lower}::text[])
  `);
  const kycRows = (kycResult.rows ?? []) as LegacyKycRow[];
  const claimRows = (claimsResult.rows ?? []) as LegacyClaimRow[];
  return {
    kycVerifications: kycRows.map((r) => ({
      walletAddress: r.user_address,
      provider: r.provider,
      verificationId: r.verification_id,
      status: r.status,
      verifiedAt: r.verified_at ? r.verified_at.toISOString() : null,
      expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
    })),
    complianceClaims: claimRows.map((r) => ({
      claimantAddress: r.claimant_address,
      claimType: r.claim_type,
      status: r.status,
      evidenceCid: r.evidence_cid,
      createdAt: r.created_at ? r.created_at.toISOString() : null,
    })),
  };
}

export async function getProjection(userId: string): Promise<IdentityProjection> {
  const [user] = await db.select().from(capUsers).where(eq(capUsers.id, userId)).limit(1);
  if (!user) throw new NotFoundError(`user ${userId} not found`);
  const [profile] = await db
    .select()
    .from(capIdentityProfiles)
    .where(eq(capIdentityProfiles.userId, userId))
    .limit(1);
  const claims = await db.select().from(capClaims).where(eq(capClaims.userId, userId));
  const wallets = await db.select().from(capWallets).where(eq(capWallets.userId, userId));
  const legacy = await loadLegacySlice(wallets.map((w) => w.address));
  return { user, profile: profile ?? null, claims, wallets, legacy };
}

/**
 * Returns only the claims slice of the projection (used by
 * GET /identity/users/:userId/claims). Validates the user exists so a
 * missing user surfaces 404 rather than an empty list.
 */
export async function getClaims(userId: string): Promise<CapClaim[]> {
  const [user] = await db.select().from(capUsers).where(eq(capUsers.id, userId)).limit(1);
  if (!user) throw new NotFoundError(`user ${userId} not found`);
  return db.select().from(capClaims).where(eq(capClaims.userId, userId));
}

export interface LinkWalletInput {
  userId: string;
  chain: string;
  chainId?: number;
  address: string;
  label?: string;
  isPrimary?: boolean;
  metadataJson?: Record<string, unknown>;
}

export async function linkWallet(
  input: LinkWalletInput,
  actor: string,
  correlationId?: string,
): Promise<CapWallet> {
  const [user] = await db.select().from(capUsers).where(eq(capUsers.id, input.userId)).limit(1);
  if (!user) throw new NotFoundError(`user ${input.userId} not found`);

  const dupe = await db
    .select()
    .from(capWallets)
    .where(and(eq(capWallets.chain, input.chain), eq(capWallets.address, input.address)))
    .limit(1);
  if (dupe[0]) {
    if (dupe[0].userId !== input.userId) {
      throw new ConflictError(
        `wallet ${input.address} on ${input.chain} is already linked to a different user`,
      );
    }
    return dupe[0];
  }

  const id = generateId('wal');
  const row: NewCapWallet = {
    id,
    userId: input.userId,
    chain: input.chain,
    chainId: input.chainId ?? null,
    address: input.address,
    label: input.label ?? null,
    isPrimary: input.isPrimary ?? false,
    status: 'ACTIVE',
    metadataJson: (input.metadataJson ?? null) as Record<string, unknown> | null,
  };
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx.insert(capWallets).values(row).returning();
      await emitAuditEventStrict(
        {
          eventType: 'identity.wallet_linked',
          aggregateType: 'user',
          aggregateId: input.userId,
          userId: input.userId,
          actor,
          correlationId,
          payloadJson: { walletId: id, chain: input.chain, address: input.address },
        },
        tx,
      );
      return created;
    });
  } catch (err) {
    // Lost the race against a concurrent link. Re-fetch and either
    // return the existing row (same user) or surface a 409.
    const pgCode =
      err && typeof err === 'object' && 'code' in err
        ? (err as { code?: unknown }).code
        : undefined;
    if (pgCode === '23505') {
      const [winner] = await db
        .select()
        .from(capWallets)
        .where(and(eq(capWallets.chain, input.chain), eq(capWallets.address, input.address)))
        .limit(1);
      if (winner && winner.userId === input.userId) return winner;
      throw new ConflictError(
        `wallet ${input.address} on ${input.chain} is already linked to a different user`,
      );
    }
    throw err;
  }
}
