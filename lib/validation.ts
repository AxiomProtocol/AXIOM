const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MAX_AMOUNT_CENTS = IS_PRODUCTION ? 5_000_000 : 1_000_000;
const MIN_AMOUNT_CENTS = 1;

export function validateDollarAmount(cents: unknown): string | null {
  const n = Number(cents);
  if (!Number.isFinite(n) || n < MIN_AMOUNT_CENTS) {
    return 'Amount must be a positive dollar value.';
  }
  if (n > MAX_AMOUNT_CENTS) {
    return `Amount exceeds the maximum allowed ($${MAX_AMOUNT_CENTS / 100}).`;
  }
  return null;
}

export function validateEthAddress(address: unknown): string | null {
  if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return 'Invalid Ethereum address.';
  }
  return null;
}

export function validateSsn(ssn: unknown): string | null {
  if (typeof ssn !== 'string' || !/^\d{3}-?\d{2}-?\d{4}$/.test(ssn)) {
    return 'SSN must be in format XXX-XX-XXXX.';
  }
  return null;
}

export function validateCryptoAmount(amountStr: unknown): string | null {
  const n = parseFloat(String(amountStr));
  if (!Number.isFinite(n) || n <= 0) {
    return 'Crypto amount must be a positive number.';
  }
  if (n > 1_000_000) {
    return 'Crypto amount exceeds the maximum allowed.';
  }
  return null;
}

export function validateUnitId(id: unknown): string | null {
  if (typeof id !== 'string' || id.length < 1 || id.length > 200) {
    return 'Invalid account or payment ID.';
  }
  return null;
}

export function validateRequiredString(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${field} is required.`;
  }
  return null;
}
