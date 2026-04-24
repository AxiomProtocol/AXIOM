/**
 * Capital Infrastructure — Stellar webhook payload mapper (3B.1b).
 *
 * Pure function: (verified raw_payload_json + event-type header)
 * → a typed SettlementTransitionIntent (or null if the event type
 * is not one the processor acts on).
 *
 * No database I/O. No imports beyond types.
 */

export type StellarEventType =
  | 'payment.received'
  | 'payment.failed'
  | 'payment.reversed'
  | string; // catch-all for unknown types

export interface SettlementTransitionIntent {
  eventType: StellarEventType;
  txHash: string;
  opId: string | null;
  observedAmount: string | null;
  observedAsset: string | null;
  observedAssetIssuer: string | null;
  sourceAccount: string | null;
  destinationAccount: string | null;
  memo: string | null;
  occurredAt: Date;
  /**
   * What transition the processor should attempt:
   *   SETTLE — advance AUTHORIZED → SETTLED
   *   FAIL   — advance AUTHORIZED → FAILED (not yet exercised in DRY_RUN)
   *   NO_OP  — event is advisory; processor records it but does not
   *            mutate settlement state
   */
  action: 'SETTLE' | 'FAIL' | 'NO_OP';
}

/**
 * Map a verified Stellar anchor webhook payload to a settlement
 * transition intent. Returns null if the event type is unknown,
 * advisory-only, or if the required `tx_hash` field is missing.
 */
export function mapStellarEvent(
  rawPayloadJson: Record<string, unknown>,
  eventTypeHeader: string | null,
): SettlementTransitionIntent | null {
  const eventType: StellarEventType = String(
    rawPayloadJson['event_type'] ?? eventTypeHeader ?? '',
  );
  const txHash = typeof rawPayloadJson['tx_hash'] === 'string'
    ? rawPayloadJson['tx_hash']
    : typeof rawPayloadJson['transaction_hash'] === 'string'
      ? rawPayloadJson['transaction_hash']
      : null;

  // A tx_hash is mandatory — without it we cannot match a local instruction.
  if (!txHash) return null;

  const opId = typeof rawPayloadJson['op_id'] === 'string'
    ? rawPayloadJson['op_id']
    : typeof rawPayloadJson['operation_id'] === 'string'
      ? rawPayloadJson['operation_id']
      : null;

  const amount = typeof rawPayloadJson['amount'] === 'string'
    ? rawPayloadJson['amount']
    : null;
  const assetCode = typeof rawPayloadJson['asset_code'] === 'string'
    ? rawPayloadJson['asset_code']
    : null;
  const assetIssuer = typeof rawPayloadJson['asset_issuer'] === 'string'
    ? rawPayloadJson['asset_issuer']
    : null;
  const from = typeof rawPayloadJson['from'] === 'string'
    ? rawPayloadJson['from']
    : typeof rawPayloadJson['source_account'] === 'string'
      ? rawPayloadJson['source_account']
      : null;
  const to = typeof rawPayloadJson['to'] === 'string'
    ? rawPayloadJson['to']
    : typeof rawPayloadJson['destination_account'] === 'string'
      ? rawPayloadJson['destination_account']
      : null;
  const memo = typeof rawPayloadJson['memo'] === 'string'
    ? rawPayloadJson['memo']
    : null;

  let occurredAt: Date;
  try {
    const ts = rawPayloadJson['created_at'] ?? rawPayloadJson['timestamp'];
    occurredAt = typeof ts === 'string' ? new Date(ts) : new Date();
    if (isNaN(occurredAt.getTime())) occurredAt = new Date();
  } catch {
    occurredAt = new Date();
  }

  let action: SettlementTransitionIntent['action'];
  switch (eventType) {
    case 'payment.received':
      action = 'SETTLE';
      break;
    case 'payment.failed':
    case 'payment.reversed':
      action = 'FAIL';
      break;
    default:
      action = 'NO_OP';
  }

  return {
    eventType,
    txHash,
    opId,
    observedAmount: amount,
    observedAsset: assetCode,
    observedAssetIssuer: assetIssuer,
    sourceAccount: from,
    destinationAccount: to,
    memo,
    occurredAt,
    action,
  };
}
