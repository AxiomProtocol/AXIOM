import { EligibleEntry } from './buildMerkleTree';

export interface ValidationResult {
  valid: boolean;
  entries: EligibleEntry[];
  errors: string[];
  warnings: string[];
  totalAmount: bigint;
}

const SUI_ADDRESS_REGEX = /^0x[0-9a-fA-F]{1,64}$/;

function normalizeSuiAddress(addr: string): string {
  const hex = addr.replace(/^0x/, '').toLowerCase();
  return '0x' + hex.padStart(64, '0');
}

function isValidSuiAddress(addr: string): boolean {
  return SUI_ADDRESS_REGEX.test(addr);
}

export function validateEligibilityCsv(csvContent: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const entries: EligibleEntry[] = [];
  const seenAddresses = new Set<string>();

  const lines = csvContent
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return { valid: false, entries: [], errors: ['CSV is empty'], warnings: [], totalAmount: 0n };
  }

  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const addrIdx = header.indexOf('address');
  const amountIdx = header.indexOf('amount');

  if (addrIdx === -1 || amountIdx === -1) {
    return {
      valid: false,
      entries: [],
      errors: ['CSV must have "address" and "amount" columns in header'],
      warnings: [],
      totalAmount: 0n,
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    const cols = lines[i].split(',').map(c => c.trim());

    if (cols.length < Math.max(addrIdx, amountIdx) + 1) {
      errors.push(`Line ${lineNum}: not enough columns`);
      continue;
    }

    const rawAddr = cols[addrIdx];
    const rawAmount = cols[amountIdx];

    if (!isValidSuiAddress(rawAddr)) {
      errors.push(`Line ${lineNum}: invalid Sui address format: "${rawAddr}"`);
      continue;
    }

    const normalized = normalizeSuiAddress(rawAddr);

    if (seenAddresses.has(normalized)) {
      errors.push(`Line ${lineNum}: duplicate address ${normalized}`);
      continue;
    }

    let amount: bigint;
    try {
      amount = BigInt(rawAmount);
      if (amount <= 0n) {
        errors.push(`Line ${lineNum}: amount must be > 0, got ${rawAmount}`);
        continue;
      }
      if (amount > 1_000_000_000_000_000n) {
        warnings.push(`Line ${lineNum}: amount ${rawAmount} exceeds MAX_SUPPLY — will fail if minting`);
      }
    } catch {
      errors.push(`Line ${lineNum}: invalid amount "${rawAmount}" — must be a positive integer`);
      continue;
    }

    seenAddresses.add(normalized);
    entries.push({ address: normalized, amount });
  }

  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0n);

  if (entries.length === 0 && errors.length === 0) {
    errors.push('No valid entries found in CSV');
  }

  return {
    valid: errors.length === 0,
    entries,
    errors,
    warnings,
    totalAmount,
  };
}

export function parseCsvRow(line: string): string[] {
  return line.split(',').map(c => c.trim());
}
