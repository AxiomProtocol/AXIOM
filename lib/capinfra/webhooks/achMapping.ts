/**
 * Capital Infrastructure — ACH webhook payload mapper.
 *
 * Pure function: verified ACH webhook payload → typed
 * SettlementTransitionIntent (or null when no settlement action applies).
 *
 * No database I/O. No imports beyond types.
 *
 * ACH webhook envelope shape:
 *   {
 *     id:                    "<event-uuid>",        ← externalEventId
 *     created_at:            "<ISO-8601>",
 *     category:              "<event.category>",    ← eventType
 *     associated_object_id:  "<obj-id>",
 *     associated_object_type:"<type>",
 *     <category_key>:        { ... }                ← nested object
 *   }
 *
 * ExternalRef derivation (used to match cap_settlement_instructions):
 *   transaction.created (ach route)  → transaction.source.ach_transfer_id
 *   transaction.created (wire route) → transaction.source.wire_transfer_id
 *   ach_transfer.returned            → ach_transfer.id
 *   wire_transfer.reversed           → wire_transfer.id
 *   declined_transaction.created     → declined_transaction.id
 *
 * Categories that are NO_OP (advisory, in-flight, or unsupported):
 *   ach_transfer.submitted, wire_transfer.submitted, and everything else
 *   not explicitly mapped above.
 *
 * UNSUPPORTED_INBOUND_EVENT categories are quarantined by the webhook
 * verifier before they reach the mapper; this function will not receive
 * them in normal operation.
 */

import type { SettlementTransitionIntent } from './stellarMapping';
import { centsToDecimalString as _centsToDecimalString } from '../money';

/**
 * Re-export of the canonical helper. Kept here for backward
 * compatibility — the implementation lives in `../money` so that every
 * settlement-layer call site is funneled through the same branded
 * `UsdDecimalString` type guard.
 */
export const centsToDecimalString = _centsToDecimalString;

export type IncreaseEventCategory =
  | 'transaction.created'
  | 'ach_transfer.returned'
  | 'wire_transfer.reversed'
  | 'declined_transaction.created'
  | 'ach_transfer.submitted'
  | 'wire_transfer.submitted'
  | string;

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function nested(payload: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const v = payload[key];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function parseOccurredAt(raw: unknown): Date {
  if (typeof raw === 'string') {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Map a verified ACH webhook payload to a settlement transition
 * intent. Returns null when the event type is advisory-only or when
 * the required externalRef (the transfer/transaction ID) cannot be
 * derived from the payload.
 */
export function mapAchEvent(
  rawPayloadJson: Record<string, unknown>,
): SettlementTransitionIntent | null {
  const category = str(rawPayloadJson['category']) ?? '';
  const occurredAt = parseOccurredAt(rawPayloadJson['created_at']);

  switch (category as IncreaseEventCategory) {
    case 'transaction.created': {
      const tx = nested(rawPayloadJson, 'transaction');
      if (!tx) return null;
      const source = nested(tx, 'source');
      const routeType = str(tx['route_type']);
      let txRef: string | null = null;
      if (routeType === 'ach') {
        txRef = str(source?.['ach_transfer_id'] ?? null);
      } else if (routeType === 'wire') {
        txRef = str(source?.['wire_transfer_id'] ?? null);
      } else {
        // RTP or other — no externalRef derivable for this slice.
        return null;
      }
      if (!txRef) return null;
      const amountCents = typeof tx['amount'] === 'number' ? tx['amount'] : null;
      const amountStr = amountCents !== null ? centsToDecimalString(amountCents) : null;
      return {
        eventType: category,
        txHash: txRef,
        opId: str(tx['id']),
        observedAmount: amountStr,
        observedAsset: str(tx['currency']),
        observedAssetIssuer: null,
        sourceAccount: null,
        destinationAccount: str(tx['account_id']),
        memo: str(tx['description']),
        occurredAt: parseOccurredAt(tx['created_at']) ?? occurredAt,
        action: 'SETTLE',
      };
    }

    case 'ach_transfer.returned': {
      const transfer = nested(rawPayloadJson, 'ach_transfer');
      if (!transfer) return null;
      const txRef = str(transfer['id']);
      if (!txRef) return null;
      return {
        eventType: category,
        txHash: txRef,
        opId: null,
        observedAmount: null,
        observedAsset: null,
        observedAssetIssuer: null,
        sourceAccount: null,
        destinationAccount: null,
        memo: str(transfer['statement_descriptor']),
        occurredAt,
        action: 'FAIL',
      };
    }

    case 'wire_transfer.reversed': {
      const transfer = nested(rawPayloadJson, 'wire_transfer');
      if (!transfer) return null;
      const txRef = str(transfer['id']);
      if (!txRef) return null;
      return {
        eventType: category,
        txHash: txRef,
        opId: null,
        observedAmount: null,
        observedAsset: null,
        observedAssetIssuer: null,
        sourceAccount: null,
        destinationAccount: null,
        memo: str(transfer['message_to_recipient']),
        occurredAt,
        action: 'FAIL',
      };
    }

    case 'declined_transaction.created': {
      const dt = nested(rawPayloadJson, 'declined_transaction');
      if (!dt) return null;
      const txRef = str(dt['id']);
      if (!txRef) return null;
      return {
        eventType: category,
        txHash: txRef,
        opId: null,
        observedAmount: null,
        observedAsset: null,
        observedAssetIssuer: null,
        sourceAccount: null,
        destinationAccount: null,
        memo: str(dt['description']),
        occurredAt,
        action: 'FAIL',
      };
    }

    default:
      // Advisory, in-flight, or unmapped — no settlement transition.
      return null;
  }
}
