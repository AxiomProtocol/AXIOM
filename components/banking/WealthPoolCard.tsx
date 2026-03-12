import React from 'react';

interface PoolAccount {
  id: string;
  unitAccountId: string;
  balanceCents: number;
  susuGroupId?: string | null;
  status: string;
}

interface WealthPoolCardProps {
  pools: PoolAccount[];
  onContribute?: (accountId: string) => void;
  onAutoContribute?: (accountId: string) => void;
  loading?: boolean;
}

export function WealthPoolCard({ pools, onContribute, onAutoContribute, loading }: WealthPoolCardProps) {
  if (loading) {
    return (
      <div className="border border-dl-border p-6">
        <div className="h-4 bg-dl-border w-32 animate-pulse mb-4" />
        <div className="h-8 bg-dl-border w-48 animate-pulse" />
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="border border-dl-border p-6">
        <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-2">Wealth Practice Pool</p>
        <p className="text-sm font-dl-mono text-dl-muted">
          No active pool accounts. Join a Wealth Practice group to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pools.map((pool) => {
        const balance = (pool.balanceCents / 100).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        });

        return (
          <div key={pool.id} className="border border-dl-border p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-1">Wealth Practice Pool</p>
                <p className="text-2xl font-dl-serif text-dl-navy">{balance}</p>
                {pool.susuGroupId && (
                  <p className="text-xs font-dl-mono text-dl-muted mt-1">Group ID: {pool.susuGroupId.slice(0, 8)}...</p>
                )}
              </div>
              <span className={`text-xs font-dl-mono uppercase px-2 py-1 border ${
                pool.status === 'Open' ? 'border-dl-forest text-dl-forest' : 'border-dl-muted text-dl-muted'
              }`}>
                {pool.status}
              </span>
            </div>

            <div className="flex gap-2 pt-4 border-t border-dl-border">
              {onContribute && (
                <button
                  onClick={() => onContribute(pool.unitAccountId)}
                  className="flex-1 bg-dl-navy text-white text-xs font-dl-mono py-2 hover:opacity-90 transition-opacity"
                >
                  Contribute Now
                </button>
              )}
              {onAutoContribute && (
                <button
                  onClick={() => onAutoContribute(pool.unitAccountId)}
                  className="flex-1 border border-dl-navy text-dl-navy text-xs font-dl-mono py-2 hover:bg-dl-navy hover:text-white transition-colors"
                >
                  Auto-Contribute
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
