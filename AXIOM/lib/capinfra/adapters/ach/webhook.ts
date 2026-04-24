/**
 * Capital Infrastructure — Increase webhook verifier (3B.2).
 *
 * Pure function over (rawBody, headers, configRow). No database I/O.
 * The generic ingress pipeline delegates here for signature verification.
 *
 * Increase webhook signature scheme (published):
 *   Header: Increase-Webhook-Signature
 *   Value:  t=<timestamp>,v1=<hex-hmac-sha256>
 *   Signed: HMAC-SHA256(webhookSigningSecret, "<t>.<rawBody>")
 *   Tolerance: |now - t| must be <= 300 seconds (replay guard).
 *
 * IMPORTANT — timestamp format:
 *   Increase production sends `t` as ISO 8601 (e.g. "2026-04-19T18:27:41Z").
 *   Published docs describe Unix seconds; both formats are handled.
 *   The `t` value is used verbatim in the HMAC signed string regardless
 *   of format — only the replay-window check requires numeric conversion.
 *
 * Reason codes on failure (stable, used as lastError in cap_webhook_events):
 *   SIGNATURE_MISSING          — header absent
 *   SIGNATURE_MALFORMED        — header present but unparseable
 *   SIGNATURE_REPLAY           — timestamp outside ±300s window
 *   SIGNATURE_INVALID          — HMAC mismatch
 *   BODY_NOT_JSON_AFTER_VERIFY — body not JSON despite valid signature
 *
 * Special case — UNSUPPORTED_INBOUND_EVENT:
 *   Increase `inbound_ach_transfer.created` events pass signature
 *   verification but are not eligible for settlement in Phase 3B.2.
 *   The verifier returns verified=true with quarantineReason set to
 *   'UNSUPPORTED_INBOUND_EVENT' so the ingress pipeline persists them
 *   as QUARANTINED with that stable reason code.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AdapterWebhookVerifyInput, AdapterWebhookVerifyResult } from '../types';
import type { AchAdapterConfig } from './config';

const REPLAY_TOLERANCE_SECONDS = 300;

const UNSUPPORTED_INBOUND_CATEGORIES = new Set([
  'inbound_ach_transfer.created',
  'inbound_wire_transfer.created',
  'inbound_real_time_payments_transfer.confirmation',
]);

function header(
  headers: AdapterWebhookVerifyInput['headers'],
  name: string,
): string | null {
  const raw = headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? null;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return null;
}

function constantTimeHexEqual(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
  } catch {
    return false;
  }
}

export async function verifyAchWebhook(
  input: AdapterWebhookVerifyInput,
  cfg: AchAdapterConfig,
): Promise<AdapterWebhookVerifyResult> {
  const sigHeader = header(input.headers, 'increase-webhook-signature');

  if (!sigHeader) {
    return {
      verified: false,
      reasonCode: 'SIGNATURE_MISSING',
      externalEventId: null,
      eventType: null,
    };
  }

  // Parse t=<ts>,v1=<hex>
  const parts = Object.fromEntries(
    sigHeader.split(',').map((part) => {
      const idx = part.indexOf('=');
      return [part.slice(0, idx), part.slice(idx + 1)];
    }),
  );
  const tsStr = parts['t'];
  const v1Hex = parts['v1'];

  if (!tsStr || !v1Hex) {
    return {
      verified: false,
      reasonCode: 'SIGNATURE_MALFORMED',
      externalEventId: null,
      eventType: null,
    };
  }

  // Parse timestamp: Increase production sends ISO 8601 ("2026-04-19T18:27:41Z");
  // docs describe Unix seconds. Handle both by trying numeric first, then ISO.
  // The raw tsStr is still used verbatim in the HMAC signed string (correct).
  let tsSeconds: number;
  if (/^\d+$/.test(tsStr)) {
    tsSeconds = parseInt(tsStr, 10);
  } else {
    const d = new Date(tsStr);
    tsSeconds = Math.floor(d.getTime() / 1000);
  }
  if (!Number.isFinite(tsSeconds)) {
    return {
      verified: false,
      reasonCode: 'SIGNATURE_MALFORMED',
      externalEventId: null,
      eventType: null,
    };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > REPLAY_TOLERANCE_SECONDS) {
    return {
      verified: false,
      reasonCode: 'SIGNATURE_REPLAY',
      externalEventId: null,
      eventType: null,
    };
  }

  const expected = createHmac('sha256', cfg.webhookSigningSecret)
    .update(`${tsStr}.${input.rawBody}`)
    .digest('hex');

  if (!constantTimeHexEqual(expected, v1Hex)) {
    return {
      verified: false,
      reasonCode: 'SIGNATURE_INVALID',
      externalEventId: null,
      eventType: null,
    };
  }

  // Parse payload only after signature passes.
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(input.rawBody) as Record<string, unknown>;
  } catch {
    return {
      verified: false,
      reasonCode: 'BODY_NOT_JSON_AFTER_VERIFY',
      externalEventId: null,
      eventType: null,
    };
  }

  const externalEventId = typeof parsed['id'] === 'string' ? parsed['id'] : null;
  const eventType = typeof parsed['category'] === 'string' ? parsed['category'] : null;

  // Inbound ACH/wire events pass signature verification but are not
  // eligible for settlement in Phase 3B.2. Signal the ingress pipeline
  // to persist them as QUARANTINED with the stable reason code so they
  // are visible to operators without being auto-processed.
  if (eventType && UNSUPPORTED_INBOUND_CATEGORIES.has(eventType)) {
    return {
      verified: true,
      reasonCode: 'OK',
      externalEventId,
      eventType,
      parsedPayload: parsed,
      quarantineReason: 'UNSUPPORTED_INBOUND_EVENT',
    };
  }

  return {
    verified: true,
    reasonCode: 'OK',
    externalEventId,
    eventType,
    parsedPayload: parsed,
  };
}
