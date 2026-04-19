/**
 * Capital Infrastructure — Stellar webhook verifier.
 *
 * Pure function over (rawBody, headers, configRow). Returns a verdict
 * structure; performs NO database I/O. The generic ingress pipeline
 * in `lib/capinfra/webhooks/ingress.ts` uses the verdict to decide
 * RECEIVED vs QUARANTINED.
 *
 * Signature scheme (3B.1a):
 *   header  : `x-stellar-signature`
 *   value   : hex(HMAC-SHA256(rawBody, configJson.webhookSigningSecret))
 *   header  : `x-stellar-event-id`     (idempotency key, optional)
 *   header  : `x-stellar-event-type`   (operator triage label, optional)
 *
 * 3B.1b will swap this for the partner's published verification scheme
 * once the live anchor's webhook contract is finalized; the verdict
 * shape stays stable so the ingress pipeline does not change.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  AdapterWebhookVerifyInput,
  AdapterWebhookVerifyResult,
} from '../types';
import type { StellarAdapterConfig } from './config';

function header(headers: AdapterWebhookVerifyInput['headers'], name: string): string | null {
  const raw = headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? null;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return null;
}

function constantTimeHexEqual(expectedHex: string, providedHex: string): boolean {
  if (expectedHex.length !== providedHex.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expectedHex, 'hex'), Buffer.from(providedHex, 'hex'));
  } catch {
    return false;
  }
}

export async function verifyStellarWebhook(
  input: AdapterWebhookVerifyInput,
  cfg: StellarAdapterConfig,
): Promise<AdapterWebhookVerifyResult> {
  const externalEventId = header(input.headers, 'x-stellar-event-id');
  const eventType = header(input.headers, 'x-stellar-event-type');
  const provided = header(input.headers, 'x-stellar-signature');

  if (!provided) {
    return {
      verified: false,
      reasonCode: 'SIGNATURE_MISSING',
      externalEventId,
      eventType,
    };
  }

  const expected = createHmac('sha256', cfg.webhookSigningSecret).update(input.rawBody).digest('hex');
  if (!constantTimeHexEqual(expected, provided)) {
    return {
      verified: false,
      reasonCode: 'SIGNATURE_INVALID',
      externalEventId,
      eventType,
    };
  }

  // Body parse only after signature passes — never trust pre-verify JSON.
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = JSON.parse(input.rawBody) as Record<string, unknown>;
  } catch {
    return {
      verified: false,
      reasonCode: 'BODY_NOT_JSON_AFTER_VERIFY',
      externalEventId,
      eventType,
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
