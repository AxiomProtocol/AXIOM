import { useState, useEffect, useCallback } from 'react';

export interface BankingAccount {
  id: number;
  unit_account_id: string;
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
  unit_customer_id: string | null;
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
 * Fetches the current wallet's Unit banking status from /api/unit/status.
 * Returns null while loading or when the user has no SIWE session.
 */
export function useBankingStatus(walletAddress?: string): UseBankingStatusResult {
  const [status, setStatus] = useState<BankingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!walletAddress) {
      setStatus(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/unit/status', { credentials: 'include' });

      if (res.status === 401) {
        // Not authenticated — normal state when wallet not connected
        setStatus(null);
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      setStatus({
        customer: json.customer ?? null,
        accounts: json.accounts ?? [],
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to load banking status');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}
