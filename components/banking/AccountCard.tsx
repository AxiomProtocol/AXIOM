import React, { useState } from 'react';

interface Account {
  id: string;
  unitAccountId: string;
  accountType: string;
  status: string;
  balanceCents: number;
  availableBalanceCents?: number;
  routingNumber?: string;
  maskedAccountNumber?: string;
}

interface AccountCardProps {
  account: Account;
  onFundAccount?: () => void;
}

export function AccountCard({ account, onFundAccount }: AccountCardProps) {
  const [showNumbers, setShowNumbers] = useState(false);

  const balance = (account.balanceCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const available = account.availableBalanceCents !== undefined
    ? (account.availableBalanceCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : null;

  return (
    <div className="border border-dl-border bg-dl-bg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-1">
            {account.accountType === 'susu_pool' ? 'Wealth Practice Pool' : 'Axiom Banking Account'}
          </p>
          <p className="text-3xl font-dl-serif text-dl-navy">{balance}</p>
          {available && (
            <p className="text-sm font-dl-mono text-dl-muted mt-1">
              {available} available
            </p>
          )}
        </div>
        <span className={`text-xs font-dl-mono uppercase px-2 py-1 border ${
          account.status === 'Open' ? 'border-dl-forest text-dl-forest' : 'border-dl-muted text-dl-muted'
        }`}>
          {account.status}
        </span>
      </div>

      <div className="border-t border-dl-border pt-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide">Routing Number</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-dl-mono text-dl-navy">
              {showNumbers ? (account.routingNumber ?? '—') : '•••••••••'}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide">Account Number</span>
          <span className="text-sm font-dl-mono text-dl-navy">
            {account.maskedAccountNumber ?? '••••••••••••'}
          </span>
        </div>
        <button
          onClick={() => setShowNumbers((v) => !v)}
          className="text-xs font-dl-mono text-dl-muted underline mt-1"
        >
          {showNumbers ? 'Hide' : 'Show'} routing number
        </button>
      </div>

      {onFundAccount && (
        <div className="mt-4 pt-4 border-t border-dl-border">
          <button
            onClick={onFundAccount}
            className="w-full border border-dl-navy text-dl-navy text-sm font-dl-mono py-2 hover:bg-dl-navy hover:text-white transition-colors"
          >
            Fund Account via ACH
          </button>
        </div>
      )}
    </div>
  );
}
