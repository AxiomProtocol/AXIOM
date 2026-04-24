/**
 * Capital Infrastructure — Plaid envelope-encryption helper.
 *
 * AES-256-GCM symmetric encryption for the application-layer envelope
 * documented in the Plaid Security Questionnaire (Q5/Q11) and the Data
 * Retention Policy §7. Plaid `access_token` and Plaid-Auth-derived
 * routing/account numbers are encrypted with this helper before they
 * are persisted.
 *
 * Key source: PLAID_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 *   - Production: env var MUST be set; absence throws.
 *   - Development: deterministic dev key fallback so local smoke runs
 *     keep working without operator intervention.
 *
 * Why a separate key from BANK_ENCRYPTION_KEY?
 *   The retention policy §7 requires "the envelope key for the
 *   encrypted token rotated out of active use" when a Plaid item is
 *   disconnected. Rotating the Plaid envelope key MUST NOT affect any
 *   other bank-field ciphertext in the system, so the two key spaces
 *   are deliberately disjoint.
 *
 * Format: `<iv_hex>:<authTag_hex>:<ciphertext_hex>` — same shape as
 * `bankEncryption.ts` so an operator inspecting a row can recognise
 * the envelope without needing to know which subsystem produced it.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.PLAID_ENCRYPTION_KEY;
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      '[plaidEncryption] PLAID_ENCRYPTION_KEY must be set in production — a 64-hex-char (32-byte) key is required. ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  // Deterministic dev key — never used in production (guarded above).
  // Distinct from the bankEncryption dev key so the two subsystems
  // cannot trivially decrypt each other's ciphertext even in dev.
  return Buffer.from(
    '6178696f6d70726f746f636f6c706c61696465617273746f72653030303030303031',
    'hex',
  ).subarray(0, 32);
}

export function encryptPlaidField(plaintext: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('[plaidEncryption] cannot encrypt empty plaintext');
  }
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPlaidField(encoded: string): string {
  const [ivHex, authTagHex, cipherHex] = encoded.split(':');
  if (!ivHex || !authTagHex || !cipherHex) {
    throw new Error('[plaidEncryption] invalid encrypted field format');
  }
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}

/**
 * Mask an account or routing number for display in operator UI / audit
 * payloads. Per Data Retention Policy §3, only the last 4 digits may
 * persist on the audit trail after the originating ACH transfer reaches
 * a terminal state.
 */
export function maskLast4(value: string): string {
  if (!value || value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}
