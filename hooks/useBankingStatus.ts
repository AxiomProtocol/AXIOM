import { useState, useEffect } from 'react';

export type BankingStage =
  | 'loading'
  | 'unauthenticated'
  | 'not_started'
  | 'pending'
  | 'denied'
  | 'approved_no_account'
  | 'active';

export interface BankingAccount {
  id: string;
  unitAccountId: string;
  accountType: string;
  status: string;
  balanceCents: number | null;
  availableBalanceCents: number | null;
  routingNumber: string | null;
  maskedAccountNumber: string | null;
}

export interface BankingStatus {
  stage: BankingStage;
  isLoading: boolean;
  hasActiveAccount: boolean;
  firstName: string | null;
  accounts: BankingAccount[];
}

const INITIAL: BankingStatus = {
  stage: 'loading',
  isLoading: true,
  hasActiveAccount: false,
  firstName: null,
  accounts: [],
};

export function useBankingStatus(): BankingStatus {
  const [status, setStatus] = useState<BankingStatus>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch('/api/unit/status', { credentials: 'include' });

        if (res.status === 401) {
          if (!cancelled) setStatus({ stage: 'unauthenticated', isLoading: false, hasActiveAccount: false, firstName: null, accounts: [] });
          return;
        }

        if (!res.ok) {
          if (!cancelled) setStatus({ stage: 'not_started', isLoading: false, hasActiveAccount: false, firstName: null, accounts: [] });
          return;
        }

        const data = await res.json();
        const accounts: BankingAccount[] = data.accounts || [];
        const hasActiveAccount = accounts.some((a) => a.status === 'Open');

        let stage: BankingStage;
        if (!data.hasCustomer) {
          stage = 'not_started';
        } else if (data.applicationStatus === 'Denied') {
          stage = 'denied';
        } else if (!data.isApproved) {
          stage = 'pending';
        } else if (!hasActiveAccount) {
          stage = 'approved_no_account';
        } else {
          stage = 'active';
        }

        if (!cancelled) {
          setStatus({
            stage,
            isLoading: false,
            hasActiveAccount,
            firstName: data.firstName || null,
            accounts,
          });
        }
      } catch {
        if (!cancelled) {
          setStatus({ stage: 'not_started', isLoading: false, hasActiveAccount: false, firstName: null, accounts: [] });
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return status;
}
