export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function formatUnitAmount(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(centsToDollars(cents));
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return '****' + accountNumber.slice(-4);
}

export function maskRoutingNumber(routingNumber: string): string {
  if (!routingNumber || routingNumber.length < 4) return '****';
  return '****' + routingNumber.slice(-4);
}

export type UnitApplicationStatus =
  | 'Approved'
  | 'Denied'
  | 'Pending'
  | 'PendingReview'
  | 'AwaitingDocuments'
  | 'Canceled';

export function mapApplicationStatus(status: string): UnitApplicationStatus {
  const map: Record<string, UnitApplicationStatus> = {
    Approved: 'Approved',
    Denied: 'Denied',
    Pending: 'Pending',
    PendingReview: 'PendingReview',
    AwaitingDocuments: 'AwaitingDocuments',
    Canceled: 'Canceled',
  };
  return map[status] ?? 'Pending';
}

export function unitHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/vnd.api+json',
    ...(extraHeaders ?? {}),
  };
}

export function generateIdempotencyKey(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

export function isValidSsnFormat(ssn: string): boolean {
  return /^\d{3}-\d{2}-\d{4}$/.test(ssn) || /^\d{9}$/.test(ssn);
}

export function normalizeSsn(ssn: string): string {
  return ssn.replace(/-/g, '');
}

export function maskSsn(ssn: string): string {
  const clean = normalizeSsn(ssn);
  if (clean.length !== 9) return '***-**-****';
  return `***-**-${clean.slice(-4)}`;
}

export function lastFourSsn(ssn: string): string {
  const clean = normalizeSsn(ssn);
  return clean.slice(-4);
}

export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}
