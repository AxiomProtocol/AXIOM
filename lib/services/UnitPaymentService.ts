/**
 * UnitPaymentService — REMOVED.
 * Unit Finance ACH integration was removed. This stub exists to prevent build
 * failures from the dynamic import in the capital-calls API route.
 * ACH triggers will silently no-op; capital calls are still recorded in the DB.
 */

interface AchDebitParams {
  walletAddress: string;
  toAccountId: string;
  counterpartyId: string;
  amountCents: number;
  description: string;
  purpose: string;
}

interface AchDebitResult {
  success: boolean;
  unitPaymentId?: string;
  error?: string;
}

export class UnitPaymentService {
  async createAchDebit(_params: AchDebitParams): Promise<AchDebitResult> {
    console.warn('[UnitPaymentService] ACH integration removed — debit not triggered.');
    return { success: false, error: 'ACH integration pending reconnection.' };
  }

  async getPaymentStatus(_paymentId: string): Promise<{ status: string }> {
    return { status: 'unavailable' };
  }
}
