/**
 * Capital Infrastructure — Plaid service layer (task #242).
 *
 * Owns the application-side state for Plaid items and accounts:
 *   - Persisting envelope-encrypted access_token + ACH numbers.
 *   - Resolving a stored Plaid item back into in-memory routing+account
 *     for the ACH dispatcher (never persisting the cleartext).
 *   - Honouring the §7 /item/remove revocation path: calls Plaid then
 *     wipes the row contents (preserving a tombstone with removed_at)
 *     and emits an audit event.
 *
 * All Plaid HTTP calls go through ./sdk.ts. This file never touches
 * `plaid.com` directly.
 */

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../../../server/db';
import {
  capPlaidAccounts,
  capPlaidItems,
  type CapPlaidAccount,
  type CapPlaidItem,
  type NewCapPlaidAccount,
  type NewCapPlaidItem,
} from '../../../../shared/capInfraSchema';
import { generateId } from '../../ids';
import { emitAuditEvent, emitAuditEventStrict } from '../../audit';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import { decryptPlaidField, encryptPlaidField, maskLast4 } from '../../plaidEncryption';
import { plaidConfigured, requirePlaidConfig } from './config';
import {
  plaidAccountsBalanceGet,
  plaidAuthGet,
  plaidInstitutionsGetById,
  plaidItemPublicTokenExchange,
  plaidItemRemove,
  plaidLinkTokenCreate,
  plaidSandboxPublicTokenCreate,
  type PlaidAccount,
} from './sdk';

const DEFAULT_COUNTRY_CODES: ReadonlyArray<string> = ['US'];
const DEFAULT_LANGUAGE = 'en';

export { plaidConfigured };

// ─── Link token issuance ─────────────────────────────────────────────

export interface CreateLinkTokenInput {
  /** Stable per-user identifier (lower-cased SIWE wallet address). */
  userRef: string;
  /** Operator-controlled display name for the Plaid Link UI. */
  clientName?: string;
  /** Optional webhook URL for item-event callbacks. */
  webhook?: string;
  /** Optional OAuth redirect URI. */
  redirectUri?: string;
  /** Correlation id for audit trace. */
  correlationId?: string;
}

export interface CreateLinkTokenResult {
  linkToken: string;
  expiration: string;
  requestId: string;
}

/**
 * Issue a Plaid Link token scoped to Auth + Balance. Audited.
 */
export async function createLinkToken(
  input: CreateLinkTokenInput,
): Promise<CreateLinkTokenResult> {
  if (!input.userRef || input.userRef.length < 3) {
    throw new ValidationError('userRef is required to scope the Plaid Link token');
  }
  const cfg = requirePlaidConfig();
  const result = await plaidLinkTokenCreate(cfg, {
    clientUserId: input.userRef,
    clientName: input.clientName ?? 'Axiom Protocol',
    products: ['auth', 'balance'],
    countryCodes: DEFAULT_COUNTRY_CODES,
    language: DEFAULT_LANGUAGE,
    webhook: input.webhook,
    redirectUri: input.redirectUri,
  });

  await emitAuditEvent({
    eventType: 'plaid.link_token.created',
    aggregateType: 'plaid_link_session',
    aggregateId: result.request_id,
    userId: input.userRef,
    correlationId: input.correlationId ?? null,
    actor: input.userRef,
    payloadJson: {
      products: ['auth', 'balance'],
      environment: cfg.environment,
      expiration: result.expiration,
      plaidRequestId: result.request_id,
    },
  });

  return {
    linkToken: result.link_token,
    expiration: result.expiration,
    requestId: result.request_id,
  };
}

// ─── Public token exchange + Auth/Balance fetch ──────────────────────

export interface ExchangePublicTokenInput {
  userRef: string;
  publicToken: string;
  correlationId?: string;
}

export interface PlaidLinkedAccountSummary {
  id: string;
  plaidAccountId: string;
  name: string | null;
  mask: string | null;
  routingMask: string | null;
  type: string | null;
  subtype: string | null;
  /** Sufficiency flag only — the real balance is never returned. */
  balanceSufficiencyKnown: boolean;
}

export interface ExchangePublicTokenResult {
  itemId: string;
  plaidItemId: string;
  institutionId: string | null;
  institutionName: string | null;
  accounts: PlaidLinkedAccountSummary[];
}

/**
 * Exchange a Plaid Link public_token for an access_token, immediately
 * envelope-encrypt and persist it, then fetch Auth (routing + account)
 * and Balance for every exposed account. The cleartext access_token
 * is held only inside this function's scope.
 *
 * Per Data Retention Policy §2, balance values are NOT persisted —
 * only an audit event recording that the balance check ran is left
 * behind.
 */
export async function exchangePublicToken(
  input: ExchangePublicTokenInput,
): Promise<ExchangePublicTokenResult> {
  if (!input.userRef || input.userRef.length < 3) {
    throw new ValidationError('userRef is required to persist a Plaid item');
  }
  if (!input.publicToken || input.publicToken.length < 8) {
    throw new ValidationError('publicToken is required');
  }
  const cfg = requirePlaidConfig();

  const exchange = await plaidItemPublicTokenExchange(cfg, input.publicToken);
  const accessToken = exchange.access_token;
  const plaidItemId = exchange.item_id;

  // Pull Auth (routing+account) and Balance up front so we can fail
  // closed if Plaid does not return Auth numbers — without Auth, this
  // item cannot fund an ACH transfer and we should not retain it.
  const [authResp, balanceResp] = await Promise.all([
    plaidAuthGet(cfg, accessToken),
    plaidAccountsBalanceGet(cfg, accessToken).catch(() => null),
  ]);

  if (!authResp.numbers?.ach || authResp.numbers.ach.length === 0) {
    // Best-effort cleanup of the Plaid-side item so we don't leak it.
    await plaidItemRemove(cfg, accessToken).catch(() => undefined);
    throw new ValidationError(
      'Plaid Auth returned no ACH numbers for this item — Auth product is not authorised',
    );
  }

  // Resolve institution name (best-effort — non-fatal).
  let institutionName: string | null = null;
  if (authResp.item.institution_id) {
    try {
      const inst = await plaidInstitutionsGetById(
        cfg,
        authResp.item.institution_id,
        DEFAULT_COUNTRY_CODES,
      );
      institutionName = inst.institution.name;
    } catch {
      institutionName = null;
    }
  }

  const itemRowId = generateId('pi');
  const itemRow: NewCapPlaidItem = {
    id: itemRowId,
    userRef: input.userRef,
    plaidItemId,
    accessTokenEncrypted: encryptPlaidField(accessToken),
    institutionId: authResp.item.institution_id,
    institutionName,
    environment: cfg.environment,
  };

  const balanceMap = new Map<string, PlaidAccount>();
  if (balanceResp) {
    for (const acct of balanceResp.accounts) balanceMap.set(acct.account_id, acct);
  }
  const authAccountMap = new Map<string, PlaidAccount>();
  for (const acct of authResp.accounts) authAccountMap.set(acct.account_id, acct);

  const accountSummaries: PlaidLinkedAccountSummary[] = [];

  await db.transaction(async (tx) => {
    await tx
      .insert(capPlaidItems)
      .values(itemRow)
      .onConflictDoNothing({ target: capPlaidItems.plaidItemId });

    // The smoke and end-user paths each create exactly one item per
    // public_token, so on conflict the inserted row would already
    // claim plaidItemId. If the existing row's id differs from the
    // one we just generated, another principal already linked this
    // item — surface a clear conflict rather than silently aliasing.
    const reload = await tx
      .select()
      .from(capPlaidItems)
      .where(eq(capPlaidItems.plaidItemId, plaidItemId))
      .limit(1);
    if (reload.length === 0) {
      throw new Error('plaid item insert vanished — concurrent delete?');
    }
    if (reload[0].id !== itemRowId) {
      throw new ConflictError('plaid_item_already_linked', {
        plaidItemId,
        existingId: reload[0].id,
      });
    }

    for (const ach of authResp.numbers.ach) {
      const acct = authAccountMap.get(ach.account_id);
      const balanceAcct = balanceMap.get(ach.account_id);
      const accountRowId = generateId('pa');
      const accountRow: NewCapPlaidAccount = {
        id: accountRowId,
        itemId: itemRowId,
        plaidAccountId: ach.account_id,
        accountName: acct?.name ?? null,
        mask: acct?.mask ?? null,
        accountType: acct?.type ?? null,
        accountSubtype: acct?.subtype ?? null,
        routingNumberEncrypted: encryptPlaidField(ach.routing),
        accountNumberEncrypted: encryptPlaidField(ach.account),
        routingMask: maskLast4(ach.routing),
      };
      await tx
        .insert(capPlaidAccounts)
        .values(accountRow)
        .onConflictDoNothing({ target: capPlaidAccounts.plaidAccountId });
      accountSummaries.push({
        id: accountRowId,
        plaidAccountId: ach.account_id,
        name: acct?.name ?? null,
        mask: acct?.mask ?? null,
        routingMask: accountRow.routingMask ?? null,
        type: acct?.type ?? null,
        subtype: acct?.subtype ?? null,
        balanceSufficiencyKnown: balanceAcct?.balances?.available != null,
      });
    }

    await emitAuditEventStrict(
      {
        eventType: 'plaid.item.linked',
        aggregateType: 'plaid_item',
        aggregateId: itemRowId,
        userId: input.userRef,
        correlationId: input.correlationId ?? null,
        actor: input.userRef,
        payloadJson: {
          plaidItemId,
          environment: cfg.environment,
          institutionId: authResp.item.institution_id,
          institutionName,
          accountCount: accountSummaries.length,
          // Last 4 only — never the full routing/account numbers.
          accountMasks: accountSummaries.map((a) => ({
            mask: a.mask,
            routingMask: a.routingMask,
          })),
          authRequestId: authResp.request_id,
        },
      },
      tx,
    );

    if (balanceResp) {
      // Balance check audit — sufficiency flag only, never the value.
      await emitAuditEventStrict(
        {
          eventType: 'plaid.balance.checked',
          aggregateType: 'plaid_item',
          aggregateId: itemRowId,
          userId: input.userRef,
          correlationId: input.correlationId ?? null,
          actor: input.userRef,
          payloadJson: {
            plaidItemId,
            environment: cfg.environment,
            // Per retention policy §2: never persist the actual balance.
            sufficiencyKnown: accountSummaries.every((a) => a.balanceSufficiencyKnown),
            balanceRequestId: balanceResp.request_id,
          },
        },
        tx,
      );
    }
  });

  return {
    itemId: itemRowId,
    plaidItemId,
    institutionId: authResp.item.institution_id,
    institutionName,
    accounts: accountSummaries,
  };
}

// ─── Item removal (data revocation §7) ───────────────────────────────

export interface RemoveItemInput {
  itemId: string;
  /**
   * The acting principal (lower-cased wallet address for end-user
   * disconnect; operator label for support-driven deletion). Used
   * both for the audit event and to reject cross-user disconnects
   * when invoked from the SIWE-authenticated route.
   */
  actor: string;
  /**
   * If true, the actor MUST equal the row's userRef (end-user path).
   * If false, allow operator-driven deletion (e.g. data subject
   * deletion request handled by support).
   */
  requireOwnership: boolean;
  correlationId?: string;
}

export interface RemoveItemResult {
  itemId: string;
  plaidItemId: string;
  alreadyRemoved: boolean;
  removedAt: string;
}

/**
 * Honour the §7 revocation path:
 *   1. Call Plaid /item/remove (terminates Plaid's authority).
 *   2. Wipe access_token + routing/account ciphertext from the active
 *      store. The row remains as a tombstone with removed_at set so
 *      the audit replay can still resolve aggregateId references.
 *   3. Emit a plaid.item.removed audit event with masked payload.
 *
 * Idempotent: removing an already-removed item is a no-op (returns
 * alreadyRemoved=true) so an end-user double-clicking the disconnect
 * button never sees an error.
 */
export async function removeItem(input: RemoveItemInput): Promise<RemoveItemResult> {
  const [row] = await db
    .select()
    .from(capPlaidItems)
    .where(eq(capPlaidItems.id, input.itemId))
    .limit(1);
  if (!row) throw new NotFoundError(`plaid item ${input.itemId} not found`);

  if (input.requireOwnership && row.userRef.toLowerCase() !== input.actor.toLowerCase()) {
    throw new ValidationError(
      'plaid item belongs to a different user; disconnect denied',
    );
  }

  if (row.removedAt) {
    return {
      itemId: row.id,
      plaidItemId: row.plaidItemId,
      alreadyRemoved: true,
      removedAt: row.removedAt.toISOString(),
    };
  }

  const cfg = requirePlaidConfig();
  // Best-effort: if Plaid says the item is already gone we still
  // proceed with the local wipe. Any other Plaid error is surfaced.
  try {
    await plaidItemRemove(cfg, decryptPlaidField(row.accessTokenEncrypted));
  } catch (err: unknown) {
    const code = (err as { errorCode?: string | null })?.errorCode;
    if (code !== 'ITEM_NOT_FOUND' && code !== 'INVALID_ACCESS_TOKEN') {
      throw err;
    }
  }

  const removedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(capPlaidItems)
      .set({
        // Wipe ciphertext — the encrypted blob is not retained beyond
        // the disconnect per §7. Tombstone preserves the row id and
        // userRef so the audit replay can resolve aggregateId.
        accessTokenEncrypted: '',
        removedAt,
        updatedAt: removedAt,
      })
      .where(eq(capPlaidItems.id, row.id));

    await tx
      .update(capPlaidAccounts)
      .set({
        routingNumberEncrypted: null,
        accountNumberEncrypted: null,
        removedAt,
        updatedAt: removedAt,
      })
      .where(eq(capPlaidAccounts.itemId, row.id));

    await emitAuditEventStrict(
      {
        eventType: 'plaid.item.removed',
        aggregateType: 'plaid_item',
        aggregateId: row.id,
        userId: row.userRef,
        correlationId: input.correlationId ?? null,
        actor: input.actor,
        payloadJson: {
          plaidItemId: row.plaidItemId,
          environment: row.environment,
          institutionId: row.institutionId,
          institutionName: row.institutionName,
          // Per retention policy §3 — masked references only.
          revocationPath: 'plaid.item.remove',
        },
      },
      tx,
    );
  });

  return {
    itemId: row.id,
    plaidItemId: row.plaidItemId,
    alreadyRemoved: false,
    removedAt: removedAt.toISOString(),
  };
}

// ─── Resolution for ACH dispatcher ───────────────────────────────────

export interface PlaidAchNumbersResolved {
  itemId: string;
  plaidItemId: string;
  accountId: string;
  plaidAccountId: string;
  /** Cleartext routing — held in process memory only. */
  routingNumber: string;
  /** Cleartext account — held in process memory only. */
  accountNumber: string;
  routingMask: string;
  accountMask: string;
  institutionName: string | null;
}

/**
 * Resolve a stored Plaid item (and optionally a specific account
 * within it) into the cleartext routing+account numbers needed to
 * submit an ACH transfer to the banking provider. The cleartext is held in
 * process memory only and MUST NOT be written to instruction
 * payloadJson, audit payloads, or logs.
 *
 * If `plaidAccountId` is omitted, the first non-removed account on
 * the item is used. ACH funding usually links a single account, so
 * this is the common path.
 */
export async function resolvePlaidAchNumbers(opts: {
  itemId: string;
  plaidAccountId?: string;
}): Promise<PlaidAchNumbersResolved> {
  const [item] = await db
    .select()
    .from(capPlaidItems)
    .where(eq(capPlaidItems.id, opts.itemId))
    .limit(1);
  if (!item) throw new NotFoundError(`plaid item ${opts.itemId} not found`);
  if (item.removedAt) {
    throw new ValidationError(`plaid item ${opts.itemId} has been disconnected`);
  }

  const accounts: CapPlaidAccount[] = await db
    .select()
    .from(capPlaidAccounts)
    .where(
      and(
        eq(capPlaidAccounts.itemId, item.id),
        isNull(capPlaidAccounts.removedAt),
      ),
    );

  if (accounts.length === 0) {
    throw new ValidationError(
      `plaid item ${opts.itemId} has no accounts available for ACH`,
    );
  }

  let chosen: CapPlaidAccount | undefined;
  if (opts.plaidAccountId) {
    chosen = accounts.find((a) => a.plaidAccountId === opts.plaidAccountId);
    if (!chosen) {
      throw new ValidationError(
        `plaid account ${opts.plaidAccountId} not found on item ${opts.itemId}`,
      );
    }
  } else {
    chosen = accounts[0];
  }

  if (!chosen.routingNumberEncrypted || !chosen.accountNumberEncrypted) {
    throw new ValidationError(
      `plaid account ${chosen.plaidAccountId} has no Auth numbers (routing/account missing)`,
    );
  }

  const routingNumber = decryptPlaidField(chosen.routingNumberEncrypted);
  const accountNumber = decryptPlaidField(chosen.accountNumberEncrypted);
  return {
    itemId: item.id,
    plaidItemId: item.plaidItemId,
    accountId: chosen.id,
    plaidAccountId: chosen.plaidAccountId,
    routingNumber,
    accountNumber,
    routingMask: chosen.routingMask ?? maskLast4(routingNumber),
    accountMask: chosen.mask ?? maskLast4(accountNumber),
    institutionName: item.institutionName,
  };
}

// ─── Read API for the operator console / smoke harness ───────────────

export interface PlaidItemSummary {
  id: string;
  plaidItemId: string;
  userRef: string;
  institutionId: string | null;
  institutionName: string | null;
  environment: string;
  accounts: Array<{
    id: string;
    plaidAccountId: string;
    name: string | null;
    mask: string | null;
    routingMask: string | null;
    type: string | null;
    subtype: string | null;
  }>;
  removedAt: string | null;
  createdAt: string;
}

export async function getItemSummary(itemId: string): Promise<PlaidItemSummary | null> {
  const [item] = await db
    .select()
    .from(capPlaidItems)
    .where(eq(capPlaidItems.id, itemId))
    .limit(1);
  if (!item) return null;
  const accts = await db
    .select()
    .from(capPlaidAccounts)
    .where(eq(capPlaidAccounts.itemId, itemId));
  return {
    id: item.id,
    plaidItemId: item.plaidItemId,
    userRef: item.userRef,
    institutionId: item.institutionId,
    institutionName: item.institutionName,
    environment: item.environment,
    accounts: accts.map((a) => ({
      id: a.id,
      plaidAccountId: a.plaidAccountId,
      name: a.accountName,
      mask: a.mask,
      routingMask: a.routingMask,
      type: a.accountType,
      subtype: a.accountSubtype,
    })),
    removedAt: item.removedAt ? item.removedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
  };
}

// ─── Smoke-only: mint a sandbox public_token ─────────────────────────

export async function sandboxMintPublicToken(): Promise<string> {
  const cfg = requirePlaidConfig();
  if (cfg.environment !== 'sandbox') {
    throw new Error('sandboxMintPublicToken is only available in sandbox mode');
  }
  const r = await plaidSandboxPublicTokenCreate(cfg);
  return r.public_token;
}

/**
 * Helper for the smoke harness: a CapPlaidItem that has been wiped
 * by /item/remove keeps removed_at non-null. The smoke checks use this
 * to assert tombstone behaviour without re-fetching.
 */
export type PlaidItemRow = CapPlaidItem;
