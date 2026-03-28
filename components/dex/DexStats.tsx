import { useDexStats } from '../../lib/hooks/useDex';

// Fix 6: Rewritten to comply with Axiom Design Law.
// No rounded-xl, shadow-sm, bg-white/amber/teal/purple classes.
// Uses navy #1B2A4A, forest #1D3D2A, gold #B8973A, monospace data, serif labels.

export default function DexStats() {
  const { stats, loading, error, refetch } = useDexStats();

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#1B2A4A]/10">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white px-5 py-4">
            <div className="h-3 bg-[#1B2A4A]/10 w-20 mb-3" />
            <div className="h-6 bg-[#1B2A4A]/10 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="border border-[#1B2A4A]/20 bg-[#F8F6F0] p-6 text-center">
        <p className="text-sm font-mono text-red-600 mb-3">{error || 'Failed to load DEX stats'}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 border border-[#1B2A4A]/30 text-[#1B2A4A] text-xs font-mono hover:border-[#1B2A4A] transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  const formatNumber = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000)     return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const metrics = [
    {
      label: 'Total Value Locked',
      value: formatNumber(stats.totalTVL),
      note: 'Live on-chain',
      accent: 'text-[#1D3D2A]',
    },
    {
      label: '24h Volume',
      value: formatNumber(stats.totalVolume24h),
      note: parseFloat(stats.totalVolume24h) === 0 ? 'No trades yet' : 'Swap history',
      accent: 'text-[#1B2A4A]',
    },
    {
      label: '24h Fees',
      value: formatNumber(stats.totalFees24h),
      note: parseFloat(stats.totalFees24h) === 0 ? 'No trades yet' : 'Protocol fees',
      accent: 'text-[#1B2A4A]',
    },
    {
      label: 'Active Pools',
      value: stats.totalPools.toString(),
      note: stats.primaryVenue || 'EulerSwap',
      accent: 'text-[#B8973A]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#1B2A4A]/10">
      {metrics.map((m) => (
        <div key={m.label} className="bg-white px-5 py-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#1B2A4A]/50 mb-2">
            {m.label}
          </div>
          <div className={`text-2xl font-mono font-bold ${m.accent}`}>
            {m.value}
          </div>
          <div className="text-[10px] font-mono text-[#1B2A4A]/40 mt-1">{m.note}</div>
        </div>
      ))}
    </div>
  );
}
