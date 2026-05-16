/**
 * Capital Infrastructure — ACH adapter SDK boundary.
 *
 * The ACH banking provider (account cancelled 2026-04-28) has been
 * decommissioned. All network-facing functions return a static
 * BANKING_DISABLED error. Utility exports (decimalStringToCents,
 * canonicalAchDryRunRef) and type definitions are preserved for the
 * capinfra settlement engine so the adapter layer compiles cleanly.
 *
 * When a replacement banking provider is integrated:
 *   1. Implement BankingProvider in lib/banking/providers/<name>.ts
 *   2. Re-wire the settlement adapter here
 *   3. Re-enable the relevant adapter mode (MANUAL_APPROVAL / LIVE_CANARY / LIVE)
 */

import { createHash } from 'node:crypto';

const ACH_UNAVAILABLE_REASON =
  'ACH rails unavailable. Banking provider decommissioned 2026-04-28. No replacement configured.';

export type AchEnvironment = 'sandbox' | 'production';

export interface AchTransaction {
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

export interface AchTransactionsPage {
  data: AchTransaction[];
  nextCursor: string | null;
}

export interface CredentialProbeResult {
  reachable: boolean;
  accountId: string;
  error: string | null;
  latencyMs: number | null;
}

export async function fetchAchTransactionsPage(_opts: {
  environment: AchEnvironment;
  accountId: string;
  since: Date;
  until: Date;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
}): Promise<AchTransactionsPage> {
  throw new Error(ACH_UNAVAILABLE_REASON);
}

export async function validateAchCredentials(opts: {
  environment: AchEnvironment;
  accountId: string;
  signal?: AbortSignal;
}): Promise<CredentialProbeResult> {
  return {
    reachable: false,
    accountId: opts.accountId,
    error: `BANKING_DISABLED: ${ACH_UNAVAILABLE_REASON}`,
    latencyMs: 0,
  };
}

/**
 * Deterministic DRY_RUN external reference for an ACH dispatch.
 * Stable across re-runs given the same inputs. The 'DRYRUN-ACH-' prefix
 * lets the reconciliation engine classify these as INFORMATIONAL drift.
 */
export function canonicalAchDryRunRef(opts: {
  instructionId: string;
  accountId: string;
  amount: string;
  environment: AchEnvironment;
}): string {
  const payload = [opts.instructionId, opts.accountId, opts.amount, opts.environment].join(':');
  const hash = createHash('sha256').update(payload).digest('hex').slice(0, 32);
  return `DRYRUN-ACH-${hash}`;
}

export type AchStandardEntryClassCode =
  | 'corporate_credit_or_debit'
  | 'corporate_trade_exchange'
  | 'prearranged_payments_and_deposit'
  | 'internet_initiated';

export interface AchTransferInput {
  environment: AchEnvironment;
  accountId: string;
  amountCents: number;
  routingNumber: string;
  accountNumber: string;
  standardEntryClassCode?: AchStandardEntryClassCode;
  statementDescriptor: string;
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

export async function submitAchTransfer(_input: AchTransferInput): Promise<AchTransferResult> {
  throw new Error(ACH_UNAVAILABLE_REASON);
}

/**
 * Convert a decimal amount string to integer cents without floating-point
 * arithmetic. "100.00" → 10000n, "0.01" → 1n, "99" → 9900n.
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
