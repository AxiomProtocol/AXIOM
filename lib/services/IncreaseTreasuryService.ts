// Banking provider retired 2026-04-28. This service stub exists to allow
// any stale import references to compile without error. All methods return
// a static unavailable result. Remove this file once all callers have been
// updated to reference lib/banking/registry.ts instead.

const UNAVAILABLE = { success: false, reason: 'Banking provider not configured.' };

export const increaseTreasuryService = {
  async getCurrentBalance() {
    return { balanceUsd: null, trustSource: { source: 'unavailable' } };
  },
  async sync() {
    return { accounts: UNAVAILABLE };
  },
};
