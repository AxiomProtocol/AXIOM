import type { EligibilityEntry, CsvValidationResult, CsvValidationError } from '../types';

// =============================================================================
// validateEligibilityCsv — Parses and validates an eligibility CSV.
//
// CSV schema (header required):
//   address,amount,campaign_label
//
// Validation rules:
//   - No duplicate wallet addresses (case-insensitive)
//   - Valid Sui address format (0x + 64 hex chars = 32 bytes)
//   - Amount must be a positive integer > 0
//   - Amount must not be negative or zero
//   - Amount must not exceed u64 max (18446744073709551615)
//   - campaign_label must be non-empty
//
// TESTNET ONLY. No monetary value.
// =============================================================================

const SUI_ADDRESS_REGEX = /^0x[0-9a-fA-F]{64}$/;
const U64_MAX = BigInt('18446744073709551615');

function isValidSuiAddress(address: string): boolean {
  return SUI_ADDRESS_REGEX.test(address);
}

function isValidAmount(amount: string): { valid: boolean; reason?: string } {
  const trimmed = amount.trim();
  if (!trimmed || trimmed === '') {
    return { valid: false, reason: 'Amount is empty' };
  }

  let parsed: bigint;
  try {
    parsed = BigInt(trimmed);
  } catch {
    return { valid: false, reason: `Amount "${trimmed}" is not a valid integer` };
  }

  if (parsed <= BigInt(0)) {
    return { valid: false, reason: `Amount must be > 0, got ${parsed}` };
  }

  if (parsed > U64_MAX) {
    return { valid: false, reason: `Amount ${parsed} exceeds u64 max` };
  }

  return { valid: true };
}

export function validateEligibilityCsv(csvText: string): CsvValidationResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    return { valid: [], errors: [{ row: 0, field: 'file', message: 'CSV is empty' }], duplicates: [] };
  }

  const headerLine = lines[0].toLowerCase();
  if (!headerLine.includes('address') || !headerLine.includes('amount') || !headerLine.includes('campaign_label')) {
    return {
      valid: [],
      errors: [{ row: 1, field: 'header', message: 'Missing required columns: address, amount, campaign_label' }],
      duplicates: [],
    };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const addrIdx = headers.indexOf('address');
  const amtIdx = headers.indexOf('amount');
  const labelIdx = headers.indexOf('campaign_label');

  const valid: EligibilityEntry[] = [];
  const errors: CsvValidationError[] = [];
  const seen = new Map<string, number>();
  const duplicates: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = i + 1;
    const cols = lines[i].split(',').map((c) => c.trim());

    const address = cols[addrIdx] ?? '';
    const amount = cols[amtIdx] ?? '';
    const campaignLabel = cols[labelIdx] ?? '';

    // Address validation
    if (!address) {
      errors.push({ row, field: 'address', message: 'Address is empty' });
      continue;
    }
    if (!isValidSuiAddress(address)) {
      errors.push({ row, field: 'address', message: `Invalid Sui address format: "${address}"` });
      continue;
    }

    // Duplicate check (case-insensitive)
    const addrKey = address.toLowerCase();
    if (seen.has(addrKey)) {
      duplicates.push(address);
      errors.push({ row, field: 'address', message: `Duplicate address (first seen at row ${seen.get(addrKey)})` });
      continue;
    }
    seen.set(addrKey, row);

    // Amount validation
    const amtCheck = isValidAmount(amount);
    if (!amtCheck.valid) {
      errors.push({ row, field: 'amount', message: amtCheck.reason! });
      continue;
    }

    // Label validation
    if (!campaignLabel) {
      errors.push({ row, field: 'campaign_label', message: 'campaign_label is empty' });
      continue;
    }

    valid.push({ address, amount, campaignLabel });
  }

  return { valid, errors, duplicates };
}
