/**
 * Axiom Rail — Bank Account Field Encryption
 *
 * AES-256-GCM symmetric encryption for storing sensitive bank account details
 * (routing number, account number) at rest. Encrypted values are stored as
 * base64-encoded strings in the format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 *
 * Key source: BANK_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Falls back to a deterministic dev key when running in development.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.BANK_ENCRYPTION_KEY;
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      '[bankEncryption] BANK_ENCRYPTION_KEY must be set in production — a 64-hex-char (32-byte) key is required. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from('6178696f6d70726f746f636f6c62616e6b656e6372797074696f6e6b6579300a', 'hex');
}

export function encryptBankField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptBankField(encoded: string): string {
  const [ivHex, authTagHex, cipherHex] = encoded.split(':');
  if (!ivHex || !authTagHex || !cipherHex) throw new Error('Invalid encrypted field format');
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length <= 4) return '****';
  return `****${accountNumber.slice(-4)}`;
}
