/**
 * Capital Infrastructure — ACH adapter dispatcher (3B.3).
 *
 * Mode contract:
 *
 *   DRY_RUN         : validate amount + probe credentials, return synthetic
 *                     DRYRUN-ACH-* ref. No Increase API mutation.
 *
 *   MANUAL_APPROVAL : validate amount only. Return pendingApproval=true.
 *                     settlement.ts transitions the instruction to
 *                     PENDING_OPERATOR_APPROVAL without calling Increase.
 *                     A human operator must approve before the transfer
 *                     is submitted.
 *
 *   LIVE_CANARY     : call Increase POST /ach_transfers (production).
 *   LIVE            : call Increase POST /ach_transfers (production).
 *                     Both return submitted=true so settlement.ts
 *                     transitions to SUBMITTED (NOT SETTLED).
 *                     SUBMITTED means Increase accepted the transfer.
 *                     It is NOT bank-final settlement.
 *
 *   DISABLED        : throw AdapterDisabledError immediately.
 *
 * Side-effect contract: dispatcher MUST NOT write to portfolio, reserve,
 * audit log, or notifications. settlement.ts owns all post-dispatch state.
 *
 * SUBMITTED semantics — enforced by this module's returned flags:
 *   No workflow may infer economic completion, reserve credit, treasury
 *   availability, or bank-final settlement from SUBMITTED status alone.
 *   SUBMITTED means externally submitted and API-accepted only.
 */

import {
  AdapterDisabledError,
  AdapterValidationError,
  type AdapterDispatchInput,
  type AdapterDispatchResult,
} from '../types';
import { requireAchConfig, modeOf, envOf } from './config';
import {
  canonicalAchDryRunRef,
  validateIncreaseCredentials,
  submitAchTransfer,
  decimalStringToCents,
} from './sdk';

const DISPATCH_TIMEOUT_MS = 10_000;

export async function dispatchAch(input: AdapterDispatchInput): Promise<AdapterDispatchResult> {
  const cfg = await requireAchConfig();
  const mode = modeOf(cfg);
  const { instruction } = input;

  if (mode === 'DISABLED') {
    throw new AdapterDisabledError('ACH');
  }

  // Amount must be a positive decimal string for all modes.
  if (!/^\d+(\.\d+)?$/.test(instruction.amount) || Number(instruction.amount) <= 0) {
    throw new AdapterValidationError(
      'AMOUNT_INVALID',
      `instruction amount "${instruction.amount}" is not a positive decimal`,
    );
  }

  // ── DRY_RUN ──────────────────────────────────────────────────────────
  if (mode === 'DRY_RUN') {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), DISPATCH_TIMEOUT_MS);
    let probe;
    try {
      probe = await validateIncreaseCredentials({
        environment: envOf(cfg),
        accountId: cfg.accountId,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const externalRef = canonicalAchDryRunRef({
      instructionId: instruction.id,
      accountId: cfg.accountId,
      amount: instruction.amount,
      environment: envOf(cfg),
    });

    return {
      externalRef,
      settledAt: new Date(),
      receiptJson: {
        mode: 'DRY_RUN',
        kind: 'ACH',
        environment: envOf(cfg),
        accountId: cfg.accountId,
        configVersion: cfg.configVersion,
        configRowId: cfg.rowId,
        credentialsReachable: probe.reachable,
        credentialProbeError: probe.error,
      },
    };
  }

  // ── MANUAL_APPROVAL ───────────────────────────────────────────────────
  if (mode === 'MANUAL_APPROVAL') {
    // No Increase API call. Settlement.ts will see pendingApproval=true
    // and transition the instruction to PENDING_OPERATOR_APPROVAL.
    // A human operator (dual-actor) must then approve before any real
    // transfer is submitted.
    return {
      externalRef: `PENDING-APPROVAL-${instruction.id}`,
      settledAt: new Date(),
      pendingApproval: true,
      receiptJson: {
        mode: 'MANUAL_APPROVAL',
        kind: 'ACH',
        environment: envOf(cfg),
        accountId: cfg.accountId,
        configVersion: cfg.configVersion,
        note: 'instruction held for operator approval — no Increase API call made',
      },
    };
  }

  // ── LIVE_CANARY / LIVE ───────────────────────────────────────────────
  if (mode === 'LIVE_CANARY' || mode === 'LIVE') {
    const payloadJson = instruction.payloadJson as Record<string, unknown> | null;
    const routingNumber = String(payloadJson?.routingNumber ?? '');
    const accountNumber = String(payloadJson?.accountNumber ?? '');

    if (!routingNumber || !accountNumber) {
      throw new AdapterValidationError(
        'ROUTING_OR_ACCOUNT_MISSING',
        'ACH dispatch requires payloadJson.routingNumber and payloadJson.accountNumber',
      );
    }

    const amountCents = Number(decimalStringToCents(instruction.amount));
    if (amountCents <= 0 || !Number.isFinite(amountCents)) {
      throw new AdapterValidationError('AMOUNT_INVALID', 'amount converts to non-positive cents');
    }

    const descriptor = String(payloadJson?.statementDescriptor ?? `AXIOM-${instruction.id.slice(-6)}`);
    const idempotencyKey = `ach-dispatch-${instruction.id}`;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), DISPATCH_TIMEOUT_MS);
    let transfer;
    try {
      transfer = await submitAchTransfer({
        environment: envOf(cfg),
        accountId: cfg.accountId,
        amountCents,
        routingNumber,
        accountNumber,
        statementDescriptor: descriptor,
        idempotencyKey,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // submitted=true signals settlement.ts to transition to SUBMITTED, NOT SETTLED.
    // No portfolio writes. No reserve credit.
    // SUBMITTED means Increase accepted. Not bank-final.
    return {
      externalRef: transfer.id,
      settledAt: new Date(),
      submitted: true,
      receiptJson: {
        mode,
        kind: 'ACH',
        environment: envOf(cfg),
        accountId: cfg.accountId,
        increaseTransferId: transfer.id,
        increaseStatus: transfer.status,
        configVersion: cfg.configVersion,
        submittedAt: new Date().toISOString(),
        note: 'SUBMITTED means Increase API accepted. Clearing confirmed by reconciliation only.',
      },
    };
  }

  // Unreachable if all modes are handled above — but TypeScript guard.
  throw new AdapterValidationError('UNKNOWN_MODE', `unhandled ACH adapter mode: ${mode}`);
}
