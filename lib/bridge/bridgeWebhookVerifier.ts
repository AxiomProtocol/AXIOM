/**
 * Bridge.xyz Webhook Signature Verifier
 *
 * Bridge signs webhook payloads with HMAC-SHA256 using the BRIDGE_WEBHOOK_SECRET.
 * The signature is delivered in the `Bridge-Signature` header as a hex digest.
 *
 * Usage:
 *   const ok = verifyBridgeWebhook(rawBody, req.headers['bridge-signature']);
 *   if (!ok) return res.status(401).json({ error: 'Invalid signature' });
 *
 * If BRIDGE_WEBHOOK_SECRET is not yet configured the verifier logs a warning
 * and returns true so the route stays available during initial setup.
 */

import crypto from 'crypto';

export function verifyBridgeWebhook(
  rawBody: string | Buffer,
  signatureHeader: string | string[] | undefined
): boolean {
  const secret = process.env.BRIDGE_WEBHOOK_SECRET;

  if (!secret) {
    console.warn(
      '[BridgeWebhook] BRIDGE_WEBHOOK_SECRET not set — skipping signature verification. ' +
        'Add the secret in Replit Secrets to enable full webhook security.'
    );
    return true;
  }

  if (!signatureHeader) {
    console.warn('[BridgeWebhook] Missing Bridge-Signature header');
    return false;
  }

  const sig = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  const hmac = crypto
    .createHmac('sha256', secret)
    .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}
