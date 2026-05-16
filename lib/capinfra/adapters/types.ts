/**
 * Capital Infrastructure — Settlement Adapter contract.
 *
 * Adapters are pure dispatchers: given an authorized instruction they
 * either return a settled receipt or throw. They MUST NOT touch the
 * portfolio, ledger, audit log, or notifications. Side effects of
 * settlement live in `lib/capinfra/settlement.ts` and run only after
 * the adapter returns success.
 *
 * Phase 3B.1a adds:
 *   - `AdapterMode` (DRY_RUN | LIVE) — adapters opt in to LIVE per-kind.
 *   - Optional `health()` for admin-detail surfaces.
 *   - Optional `verifyWebhook()` so the generic webhook ingress pipeline
 *     can delegate signature/envelope verification per adapter without
 *     importing partner SDKs.
 *
 * Phase 3B.3 adds:
 *   - MANUAL_APPROVAL | LIVE_CANARY | LIVE | DISABLED modes.
 *   - `pendingApproval` flag on dispatch result → PENDING_OPERATOR_APPROVAL.
 *   - `submitted` flag on dispatch result → SUBMITTED (no portfolio write).
 *   - AdapterDisabledError for DISABLED mode.
 */

import type { CapAsset, CapSettlementInstruction } from '../../../shared/capInfraSchema';

export type AdapterMode =
  | 'DRY_RUN'
  | 'MANUAL_APPROVAL'
  | 'LIVE_CANARY'
  | 'LIVE'
  | 'DISABLED';

export interface AdapterDispatchInput {
  instruction: CapSettlementInstruction;
  asset: CapAsset;
}

export interface AdapterDispatchResult {
  externalRef: string;
  settledAt: Date;
  receiptJson?: Record<string, unknown>;
  /**
   * When true, settlement.ts must transition the instruction to
   * PENDING_OPERATOR_APPROVAL instead of EXECUTING → SETTLED.
   * The ACH provider API was NOT called. Safe to auto-fail on rollback.
   */
  pendingApproval?: boolean;
  /**
   * When true, settlement.ts must transition the instruction to
   * SUBMITTED instead of EXECUTING → SETTLED.
   * The ACH provider production API was called and accepted the transfer.
   * SUBMITTED ≠ bank-final. Portfolio writes must NOT happen.
   * No workflow may infer economic completion, reserve credit, treasury
   * availability, or bank-final settlement from SUBMITTED status alone.
   */
  submitted?: boolean;
}

export interface AdapterHealth {
  kind: string;
  mode: AdapterMode;
  configVersion: number;
  reachable: boolean;
  details: Record<string, unknown>;
  lastDispatchAt: Date | null;
  lastWebhookAt: Date | null;
  lastWebhookVerifiedAt: Date | null;
  quarantinedCount24h: number;
  /** MANUAL_APPROVAL mode only: count of PENDING_OPERATOR_APPROVAL instructions. */
  pendingApprovalCount?: number;
  /** MANUAL_APPROVAL mode only: hours since oldest pending approval (null if none). */
  oldestPendingApprovalAgeHours?: number | null;
}

export interface AdapterWebhookVerifyInput {
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface AdapterWebhookVerifyResult {
  /** True only when the signature/envelope verifies. */
  verified: boolean;
  /** Stable reason code; populated even on success ('OK'). */
  reasonCode: string;
  /** Provider-supplied event id, used for idempotency. */
  externalEventId: string | null;
  /** Provider event type, surfaced for operator triage. */
  eventType: string | null;
  /** Parsed payload (used only when verified). */
  parsedPayload?: Record<string, unknown>;
  /**
   * When set, the ingress pipeline writes this row as QUARANTINED even
   * when `verified` is true. Used for events that pass signature checks
   * but are not eligible for settlement in the current phase (e.g.
   * inbound ACH transfers in Phase 3B.2). The value becomes the stable
   * `lastError` reason code on the cap_webhook_events row.
   */
  quarantineReason?: string;
}

export interface SettlementAdapter {
  /** Stable identifier matching the `kind` column on `cap_adapters`. */
  readonly kind: string;
  /** Human-readable name for diagnostics. */
  readonly name: string;
  dispatch(input: AdapterDispatchInput): Promise<AdapterDispatchResult>;
  /**
   * Optional approval-time dispatch path.
   * Used for dual-actor flows that must bypass pendingApproval staging and
   * perform a real external submission exactly once.
   */
  dispatchAfterApproval?(input: AdapterDispatchInput): Promise<AdapterDispatchResult>;
  /** Optional admin-detail health probe. */
  health?(): Promise<AdapterHealth>;
  /** Optional per-adapter webhook verifier (pure function over body+headers). */
  verifyWebhook?(input: AdapterWebhookVerifyInput): Promise<AdapterWebhookVerifyResult>;
}

export class NotImplementedAdapterError extends Error {
  code = 'ADAPTER_NOT_IMPLEMENTED';
  constructor(kind: string) {
    super(`adapter ${kind} is registered but not implemented in Phase 2`);
  }
}

/**
 * Thrown when an adapter is configured for LIVE but the slice does not
 * yet permit LIVE dispatch. Maps to HTTP 422.
 */
export class AdapterModeNotPermittedError extends Error {
  code = 'ADAPTER_MODE_NOT_PERMITTED';
  status = 422;
  constructor(kind: string, mode: AdapterMode) {
    super(`adapter ${kind} mode=${mode} is not permitted in this build`);
  }
}

/**
 * Thrown when an adapter rejects an instruction during validation.
 * Settlement state is preserved (instruction stays AUTHORIZED).
 */
export class AdapterValidationError extends Error {
  code = 'ADAPTER_VALIDATION_FAILED';
  status = 422;
  reasonCode: string;
  constructor(reasonCode: string, message: string) {
    super(message);
    this.reasonCode = reasonCode;
  }
}

/**
 * Thrown when the adapter is in DISABLED mode.
 * Settlement.ts catches this and parks the instruction to FAILED.
 */
export class AdapterDisabledError extends Error {
  code = 'ADAPTER_DISABLED';
  status = 503;
  constructor(kind: string) {
    super(`adapter ${kind} is DISABLED — operator action required to re-enable`);
  }
}
