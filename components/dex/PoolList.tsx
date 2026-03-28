// Fix 3 (pool mapping) + Fix 8 (Design Law)
// - reserveA/reserveB now populated from fixed useDexPools hook (real on-chain values)
// - Removed bg-teal-500/20, text-teal-600, text-blue-400 token badge colours
// - Removed rounded-xl, shadow-sm, animate-spin with border-teal-500
// - No border-radius, consistent Design Law palette (navy/forest/muted gold)

import { useDexPools, Pool } from '../../lib/hooks/useDex';

const DL_NAVY = '#1B2A4A';
const DL_FOREST = '#1D3D2A';
const DL_BORDER = '#D4CFC5';
const DL_BG = '#FAFAF8';
const DL_MUTED = '#6B7280';

export default function PoolList() {
  const { pools, loading, error, refetch } = useDexPools();

  if (loading) {
    return (
      <div style={{ border: `1px solid ${DL_BORDER}`, background: DL_BG }} className="p-6">
        <p style={{ color: DL_MUTED }} className="font-mono text-sm">Loading pools…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ border: `1px solid ${DL_BORDER}`, background: DL_BG }} className="p-6">
        <p style={{ color: '#8B1A1A' }} className="font-mono text-sm">{error}</p>
        <button
          onClick={refetch}
          style={{ border: `1px solid ${DL_BORDER}`, color: DL_NAVY }}
          className="mt-3 px-4 py-2 font-mono text-xs hover:opacity-70"
        >
          Retry
        </button>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div style={{ border: `1px solid ${DL_BORDER}`, background: DL_BG }} className="p-8 text-center">
        <p style={{ color: DL_NAVY }} className="font-serif text-base mb-1">No Pools</p>
        <p style={{ color: DL_MUTED }} className="font-mono text-sm">
          Liquidity pools will appear here once deployed and active.
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${DL_BORDER}`, background: DL_BG }}>
      {/* Header row */}
      <div
        style={{ borderBottom: `1px solid ${DL_BORDER}` }}
        className="px-4 py-3 flex items-center justify-between"
      >
        <h3 style={{ color: DL_NAVY }} className="font-serif text-base font-semibold tracking-wide">
          Liquidity Pools
        </h3>
        <button
          onClick={refetch}
          style={{ color: DL_NAVY }}
          className="opacity-50 hover:opacity-100 p-1"
          aria-label="Refresh pools"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Column headers — desktop only */}
      <div
        style={{ borderBottom: `1px solid ${DL_BORDER}`, color: DL_MUTED, background: '#F0EDE6' }}
        className="hidden md:grid grid-cols-6 gap-4 px-4 py-2 font-mono text-xs tracking-widest uppercase"
      >
        <div className="col-span-2">Pool</div>
        <div className="text-right">TVL</div>
        <div className="text-right">Reserve A</div>
        <div className="text-right">Reserve B</div>
        <div className="text-right">Fee</div>
      </div>

      <div>
        {pools.map((pool) => (
          <PoolRow key={pool.id} pool={pool} />
        ))}
      </div>
    </div>
  );
}

function PoolRow({ pool }: { pool: Pool }) {
  const fmtAmount = (amount: string) => {
    const n = parseFloat(amount);
    if (!isFinite(n) || n === 0) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    return n.toFixed(2);
  };

  const fmtUSD = (amount: string) => {
    const n = parseFloat(amount);
    if (!isFinite(n) || n === 0) return '—';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  const truncAddr = (addr: string) =>
    addr && addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

  const initials = (sym: string | undefined) => (sym || 'X').slice(0, 2).toUpperCase();

  return (
    <div
      style={{ borderBottom: `1px solid ${DL_BORDER}` }}
      className="grid grid-cols-2 md:grid-cols-6 gap-4 px-4 py-4 hover:bg-gray-50/60"
    >
      {/* Pool identity */}
      <div className="col-span-2 flex items-center gap-3">
        {/* Token badges — Design Law: flat squares, navy + forest, no teal/blue */}
        <div className="flex -space-x-1.5">
          <div
            style={{ background: DL_NAVY, color: '#FAFAF8', width: 28, height: 28 }}
            className="flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
          >
            {initials(pool.tokenASymbol)}
          </div>
          <div
            style={{ background: DL_FOREST, color: '#FAFAF8', width: 28, height: 28, outline: '2px solid #FAFAF8' }}
            className="flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
          >
            {initials(pool.tokenBSymbol)}
          </div>
        </div>

        <div>
          <div style={{ color: DL_NAVY }} className="font-mono text-sm font-semibold">
            {pool.tokenASymbol && pool.tokenBSymbol
              ? `${pool.tokenASymbol} / ${pool.tokenBSymbol}`
              : `Pool #${pool.id}`}
          </div>
          <div style={{ color: DL_MUTED }} className="font-mono text-xs">
            {pool.protocol ?? 'EulerSwap'}
            {pool.pairAddress ? ` · ${truncAddr(pool.pairAddress)}` : ''}
          </div>
        </div>
      </div>

      {/* TVL */}
      <div className="hidden md:flex flex-col items-end justify-center">
        <span style={{ color: DL_NAVY }} className="font-mono text-sm font-semibold">
          {fmtUSD(pool.totalLiquidity)}
        </span>
        <span style={{ color: DL_MUTED }} className="font-mono text-xs">TVL</span>
      </div>

      {/* Reserve A */}
      <div className="hidden md:flex flex-col items-end justify-center">
        <span style={{ color: DL_NAVY }} className="font-mono text-sm">
          {fmtAmount(pool.reserveA)}
        </span>
        <span style={{ color: DL_MUTED }} className="font-mono text-xs">{pool.tokenASymbol ?? 'A'}</span>
      </div>

      {/* Reserve B */}
      <div className="hidden md:flex flex-col items-end justify-center">
        <span style={{ color: DL_NAVY }} className="font-mono text-sm">
          {fmtAmount(pool.reserveB)}
        </span>
        <span style={{ color: DL_MUTED }} className="font-mono text-xs">{pool.tokenBSymbol ?? 'B'}</span>
      </div>

      {/* Fee */}
      <div className="flex flex-col items-end justify-center">
        <span style={{ color: DL_FOREST }} className="font-mono text-sm font-semibold">
          {(pool.swapFee / 100).toFixed(2)}%
        </span>
        <span style={{ color: DL_MUTED }} className="font-mono text-xs md:hidden">
          {fmtUSD(pool.totalLiquidity)} TVL
        </span>
      </div>
    </div>
  );
}
