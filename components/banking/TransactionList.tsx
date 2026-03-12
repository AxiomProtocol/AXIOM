import React from 'react';

interface Transaction {
  id: string;
  date?: string | Date;
  description?: string;
  label?: string;
  amount?: number | string;
  amountCents?: number;
  amountStr?: string;
  direction?: 'credit' | 'debit' | 'send' | 'receive';
  status?: string;
  txHash?: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  emptyMessage?: string;
  coinSymbol?: string;
}

function formatAmount(tx: Transaction, coinSymbol?: string): { display: string; isCredit: boolean } {
  if (tx.amountCents !== undefined) {
    const dollars = (tx.amountCents / 100).toFixed(2);
    const isCredit = tx.direction === 'credit';
    return { display: `${isCredit ? '+' : '-'}$${dollars}`, isCredit };
  }
  if (tx.amountStr !== undefined) {
    const isCredit = tx.direction === 'receive';
    const sym = coinSymbol ?? '';
    return { display: `${isCredit ? '+' : '-'}${tx.amountStr} ${sym}`.trim(), isCredit };
  }
  if (typeof tx.amount === 'number') {
    const isCredit = tx.direction === 'credit' || tx.direction === 'receive';
    return { display: `${isCredit ? '+' : '-'}${tx.amount}`, isCredit };
  }
  return { display: '—', isCredit: false };
}

export function TransactionList({ transactions, loading, emptyMessage, coinSymbol }: TransactionListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-dl-border">
            <div className="space-y-1">
              <div className="h-3 bg-dl-border w-40 animate-pulse" />
              <div className="h-2 bg-dl-border w-24 animate-pulse" />
            </div>
            <div className="h-3 bg-dl-border w-16 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <p className="text-sm text-dl-muted font-dl-mono py-4">
        {emptyMessage ?? 'No transactions yet.'}
      </p>
    );
  }

  return (
    <div className="divide-y divide-dl-border">
      {transactions.map((tx) => {
        const { display, isCredit } = formatAmount(tx, coinSymbol);
        const date = tx.date ? new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
        const desc = tx.description ?? tx.label ?? 'Transaction';

        return (
          <div key={tx.id} className="flex justify-between items-center py-3">
            <div>
              <p className="text-sm text-dl-navy font-dl-sans">{desc}</p>
              <p className="text-xs text-dl-muted font-dl-mono mt-0.5">{date}</p>
              {tx.status && (
                <span className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide">{tx.status}</span>
              )}
            </div>
            <span className={`text-sm font-dl-mono font-semibold ${isCredit ? 'text-dl-forest' : 'text-dl-navy'}`}>
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
}
