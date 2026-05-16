import { useState, useEffect, useCallback } from 'react';

export interface BankingAccount {
  id: number;
  account_type: string;
  status: string;
  balance_cents: number;
  available_balance_cents: number;
  routing_number: string | null;
  account_number_last4: string | null;
  masked_account_number: string | null;
}

export interface BankingCustomer {
  wallet_address: string;
  kyc_status: 'pending' | 'approved' | 'denied' | string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface BankingStatus {
  customer: BankingCustomer | null;
  accounts: BankingAccount[];
}

interface UseBankingStatusResult {
  status: BankingStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Banking status hook. Returns null while loading or when no banking
 * provider is configured. The banking provider slot is open — this hook
 * will be wired to the replacement provider when one is integrated.
 */
export function useBankingStatus(_walletAddress?: string): UseBankingStatusResult {
  const [status] = useState<BankingStatus | null>(null);

  return {
    status,
    loading: false,
    error: null,
    refetch: () => {},
  };
}
