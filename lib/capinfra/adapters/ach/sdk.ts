/**
 * Capital Infrastructure — Increase (ACH/wire) SDK isolation boundary.
 *
 * THIS IS THE ONLY FILE INSIDE lib/capinfra/** PERMITTED TO MAKE
 * REQUESTS TO api.increase.com OR sandbox.increase.com. Every other
 * ACH-aware module in capinfra talks to the Increase API through the
 * small surface exported here.
 *
 * A grep for "increase.com" outside this file (within lib/capinfra) is
 * a regression and must be rejected in review.
 *
 * Phase 3B.2: read-only Increase API calls only (credential probe, transactions fetch).
 * Phase 3B.3: submitAchTransfer added for MANUAL_APPROVAL/LIVE_CANARY/LIVE modes.
 *   Real ACH transfers are submitted to the production Increase API.
 *   SUBMITTED status means the API accepted the transfer. NOT bank-final settlement.
 */

import { createHash } from 'node:crypto';
import { isIncreaseDisabled, IncreaseDisabledError } from '../../../services/IncreaseService';

export type IncreaseEnvironment = 'sandbox' | 'production';

const DISABLED_MESSAGE =
  'Increase provider disabled by operator (INCREASE_DISABLED=true). Account cancelled, replacement banking provider not yet selected.';

const BASE_URLS: Record<IncreaseEnvironment, string> = {
  sandbox: process.env.INCREASE_SANDBOX_BASE_URL || 'https://sandbox.increase.com',
  production: 'https://api.increase.com',
};

/**
 * Per-environment API key resolver.
 *
 * Sandbox calls prefer INCREASE_SANDBOX_API_KEY (issued from sandbox.increase.com)
 * and fall back to INCREASE_API_KEY only if the sandbox key is unset, so
 * a misconfigured sandbox row can never silently authenticate against
 * production. Production calls always read INCREASE_API_KEY.
 *
 * The cap_adapters row's environment field drives this — INCREASE_ENVIRONMENT
 * is read by legacy services only and is not consulted here.
 */
function apiKeyForEnvironment(environment: IncreaseEnvironment): string {
  if (environment === 'sandbox') {
    const sandboxKey = process.env.INCREASE_SANDBOX_API_KEY;
    if (sandboxKey) return sandboxKey;
    const prodKey = process.env.INCREASE_API_KEY;
    if (!prodKey) {
      throw new Error(
        'Increase sandbox lane requires INCREASE_SANDBOX_API_KEY (or INCREASE_API_KEY as fallback) but neither is set',
      );
    }
    return prodKey;
  }
  const prodKey = process.env.INCREASE_API_KEY;
  if (!prodKey) throw new Error('INCREASE_API_KEY environment variable is not set');
  return prodKey;
}

export interface IncreaseTransaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  created_at: string;
  description: string;
  route_type: string | null;
  source: {
    category: string;
    ach_transfer_id?: string | null;
    wire_transfer_id?: string | null;
    inbound_ach_transfer_id?: string | null;
    real_time_payments_transfer_id?: string | null;
  } | null;
}

export interface IncreaseTransactionsPage {
  data: IncreaseTransaction[];
  nextCursor: string | null;
}

export interface CredentialProbeResult {
  reachable: boolean;
  accountId: string;
  error: string | null;
  latencyMs: number | null;
}

/**
 * Fetch one page of transactions for the configured account.
 * Cursor-based pagination — pass the cursor from the previous page.
 */
export async function fetchIncreaseTransactionsPage(opts: {
  environment: IncreaseEnvironment;
  accountId: string;
  since: Date;
  until: Date;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
}): Promise<IncreaseTransactionsPage> {
  const base = BASE_URLS[opts.environment];
  // Increase uses dot-notation for nested query params (NOT bracket notation).
  // e.g. created_at.after=... NOT created_at[gte]=...
  const params = new URLSearchParams({
    account_id: opts.accountId,
    'created_at.after': opts.since.toISOString(),
    'created_at.before': opts.until.toISOString(),
    limit: String(Math.min(opts.limit ?? 100, 100)),
  });
  if (opts.cursor) params.set('cursor', opts.cursor);

  const ks = isIncreaseDisabled();
  if (ks.disabled) {
    throw new IncreaseDisabledError(ks.reason);
  }
  const apiKey = apiKeyForEnvironment(opts.environment);
  const res = await fetch(`${base}/transactions?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    signal: opts.signal,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as Record<string, unknown>;
      detail = String(body.detail ?? body.title ?? res.status);
    } catch {
      detail = String(res.status);
    }
    throw new Error(`Increase GET /transactions failed ${res.status}: ${detail}`);
  }

  const body = (await res.json()) as {
    data: IncreaseTransaction[];
    response_metadata?: { next_cursor?: string | null };
  };

  return {
    data: body.data ?? [],
    nextCursor: body.response_metadata?.next_cursor ?? null,
  };
}

/**
 * Probe the configured account to confirm credentials are valid.
 * Used by achHealth() to set reachable=true/false.
 * In DRY_RUN, a synthetic accountId will return reachable=false — this
 * is expected and must NOT propagate to the public /api/capinfra/health.
 */
export async function validateIncreaseCredentials(opts: {
  environment: IncreaseEnvironment;
  accountId: string;
  signal?: AbortSignal;
}): Promise<CredentialProbeResult> {
  const base = BASE_URLS[opts.environment];
  const started = Date.now();
  const ks = isIncreaseDisabled();
  if (ks.disabled) {
    return {
      reachable: false,
      accountId: opts.accountId,
      error: `BANKING_DISABLED: ${ks.reason}`,
      latencyMs: 0,
    };
  }
  const apiKey = apiKeyForEnvironment(opts.environment);
  try {
    const res = await fetch(`${base}/accounts/${opts.accountId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: opts.signal,
    });
    return {
      reachable: res.ok,
      accountId: opts.accountId,
      error: res.ok ? null : `HTTP ${res.status}`,
      latencyMs: Date.now() - started,
    };
  } catch (err: unknown) {
    return {
      reachable: false,
      accountId: opts.accountId,
      error: err instanceof Error ? err.message : 'unknown',
      latencyMs: Date.now() - started,
    };
  }
}

/**
 * Deterministic DRY_RUN external reference for an ACH dispatch.
 * Stable across re-runs given the same inputs. The 'DRYRUN-ACH-' prefix
 * lets the reconciliation engine classify these as INFORMATIONAL drift
 * (no Increase transaction expected for a dry run).
 */
export function canonicalAchDryRunRef(opts: {
  instructionId: string;
  accountId: string;
  amount: string;
  environment: IncreaseEnvironment;
}): string {
  const payload = [opts.instructionId, opts.accountId, opts.amount, opts.environment].join(':');
  const hash = createHash('sha256').update(payload).digest('hex').slice(0, 32);
  return `DRYRUN-ACH-${hash}`;
}

// ─── ACH Transfer Submission (Phase 3B.3) ─────────────────────────────

export type IncreaseStandardEntryClassCode =
  | 'corporate_credit_or_debit'
  | 'corporate_trade_exchange'
  | 'prearranged_payments_and_deposit'
  | 'internet_initiated';

export interface AchTransferInput {
  environment: IncreaseEnvironment;
  accountId: string;
  /** Amount in USD cents (positive integer). */
  amountCents: number;
  /** Routing number of the destination bank. */
  routingNumber: string;
  /** Destination account number. */
  accountNumber: string;
  /** Increase standard entry class code. Default: prearranged_payments_and_deposit (PPD). */
  standardEntryClassCode?: IncreaseStandardEntryClassCode;
  /** Statement descriptor. Max 15 chars. */
  statementDescriptor: string;
  /** Increase idempotency key. Must be unique per transfer attempt. */
  idempotencyKey: string;
  signal?: AbortSignal;
}

export interface AchTransferResult {
  id: string;
  status: string;
  amount: number;
  accountId: string;
  routingNumber: string;
  accountNumber: string;
  statementDescriptor: string;
  createdAt: string;
}

/**
 * Submit an ACH transfer to the Increase production API.
 *
 * This is the only function in capinfra that mutates Increase account
 * state. It is called exclusively by the ACH dispatcher in MANUAL_APPROVAL,
 * LIVE_CANARY, and LIVE modes — never by reconciliation, webhook handlers,
 * or portfolio services.
 *
 * The Increase idempotency key prevents duplicate submissions on retry.
 * SUBMITTED status means the API accepted the transfer (HTTP 200).
 * It does NOT mean the transfer has cleared at the receiving bank.
 */
export async function submitAchTransfer(input: AchTransferInput): Promise<AchTransferResult> {
  const ks = isIncreaseDisabled();
  if (ks.disabled) {
    throw new IncreaseDisabledError(ks.reason);
  }
  const base = BASE_URLS[input.environment];
  const apiKey = apiKeyForEnvironment(input.environment);
  const body = {
    account_id: input.accountId,
    amount: input.amountCents,
    routing_number: input.routingNumber,
    account_number: input.accountNumber,
    standard_entry_class_code: input.standardEntryClassCode ?? 'prearranged_payments_and_deposit',
    statement_descriptor: input.statementDescriptor.slice(0, 15),
  };
  const res = await fetch(`${base}/ach_transfers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify(body),
    signal: input.signal,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const errBody = (await res.json()) as Record<string, unknown>;
      detail = String(errBody.detail ?? errBody.title ?? errBody.message ?? res.status);
    } catch {
      detail = String(res.status);
    }
    throw new Error(`Increase POST /ach_transfers failed ${res.status}: ${detail}`);
  }
  return (await res.json()) as AchTransferResult;
}

// ─── Utility ───────────────────────────────────────────────────────────────

/**
 * Convert a decimal amount string to integer cents without floating-point
 * arithmetic. "100.00" → 10000n, "0.01" → 1n, "99" → 9900n.
 *
 * Exported here (SDK boundary) so every comparison in the diff engine
 * uses the same deterministic path.
 */
export function decimalStringToCents(decimal: string): bigint {
  const trimmed = decimal.trim();
  const negative = trimmed.startsWith('-');
  const abs = negative ? trimmed.slice(1) : trimmed;
  const dotIdx = abs.indexOf('.');
  let wholePart: string;
  let fracPart: string;
  if (dotIdx === -1) {
    wholePart = abs;
    fracPart = '00';
  } else {
    wholePart = abs.slice(0, dotIdx);
    fracPart = abs.slice(dotIdx + 1, dotIdx + 3).padEnd(2, '0');
  }
  const cents = BigInt(wholePart || '0') * 100n + BigInt(fracPart);
  return negative ? -cents : cents;
}
