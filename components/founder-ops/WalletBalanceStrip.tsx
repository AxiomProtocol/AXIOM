export interface WalletBalance {
  available_cents: number;
  pending_cents: number;
  available_usd: number;
  pending_usd: number;
  lifetime_deposited_cents: number;
  updated_at: string;
}

interface Props {
  adminKey: string;
  balance: WalletBalance | null;
  loading: boolean;
  topupLoading: boolean;
  onRefresh: () => void;
  onTopUp: (amountCents: number) => void;
}

const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const TOP_UP_AMOUNTS = [25, 100, 250, 500];

export default function WalletBalanceStrip({ adminKey, balance, loading, topupLoading, onRefresh, onTopUp }: Props) {
  if (!adminKey) {
    return (
      <div className="border border-dl-border bg-dl-bg-alt px-5 py-3 mb-6">
        <p className="font-dl-mono text-xs uppercase tracking-widest text-dl-gray">
          Internal Wallet — Enter admin key to view balance
        </p>
      </div>
    );
  }

  const lifetimeUsd = balance ? balance.lifetime_deposited_cents / 100 : null;

  return (
    <div className="border border-dl-navy bg-white mb-6">
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-dl-navy bg-dl-navy flex items-center justify-between gap-4 flex-wrap">
        <p className="font-dl-mono text-xs uppercase tracking-widest text-white font-bold">
          Internal Wallet
        </p>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="font-dl-mono text-xs uppercase tracking-wider text-dl-gold border border-dl-gold px-3 py-1 hover:bg-dl-gold hover:text-dl-navy disabled:opacity-50 transition-colors"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {/* Balance + top-up row */}
      <div className="px-5 py-4 flex flex-wrap gap-6 items-start justify-between">
        {/* Metrics */}
        <div className="flex flex-wrap gap-6 items-start">
          {/* Available */}
          <div>
            <p className="font-dl-mono text-xs uppercase tracking-widest text-dl-gray mb-1">Available</p>
            <p className="font-dl-mono text-2xl font-bold text-dl-navy">
              {loading ? '—' : balance != null ? fmtUsd(balance.available_usd) : '$0.00'}
            </p>
            {balance && balance.pending_cents > 0 && (
              <p className="font-dl-mono text-xs text-dl-gray mt-1">
                {fmtUsd(balance.pending_usd)} pending
              </p>
            )}
          </div>

          {/* Lifetime deposited */}
          <div className="border-l border-dl-border pl-6">
            <p className="font-dl-mono text-xs uppercase tracking-widest text-dl-gray mb-1">Lifetime Deposited</p>
            <p className="font-dl-mono text-2xl font-bold text-dl-navy">
              {loading ? '—' : lifetimeUsd != null ? fmtUsd(lifetimeUsd) : '$0.00'}
            </p>
          </div>

          {/* Last updated */}
          {balance && (
            <div className="border-l border-dl-border pl-6">
              <p className="font-dl-mono text-xs uppercase tracking-widest text-dl-gray mb-1">Updated</p>
              <p className="font-dl-mono text-sm text-dl-navy">
                {new Date(balance.updated_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Top-up buttons — each directly triggers Stripe checkout */}
        <div className="flex flex-col gap-2 shrink-0">
          <p className="font-dl-mono text-xs uppercase tracking-widest text-dl-gray">Top Up via Debit Card</p>
          <div className="flex gap-2 flex-wrap">
            {TOP_UP_AMOUNTS.map(d => (
              <button
                key={d}
                disabled={topupLoading}
                onClick={() => onTopUp(d * 100)}
                className="font-dl-mono text-xs font-semibold border border-dl-navy text-dl-navy px-4 py-2 uppercase tracking-wider hover:bg-dl-navy hover:text-white disabled:opacity-50 transition-colors"
              >
                +${d}
              </button>
            ))}
          </div>
          {topupLoading && (
            <p className="font-dl-mono text-xs text-dl-gray">Opening Stripe checkout…</p>
          )}
        </div>
      </div>
    </div>
  );
}
