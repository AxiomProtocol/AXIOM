import { useDexStats } from '../../lib/hooks/useDex';

export default function DexStats() {
  const { stats, loading, error, refetch } = useDexStats();

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-red-600 mb-3">{error || 'Failed to load stats'}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const formatNumber = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Value Locked"
        value={formatNumber(stats.totalTVL)}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        }
        color="yellow"
      />
      <StatCard
        label="24h Volume"
        value={formatNumber(stats.totalVolume24h)}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
        color="green"
      />
      <StatCard
        label="24h Fees"
        value={formatNumber(stats.totalFees24h)}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
        color="purple"
      />
      <StatCard
        label="Active Pools"
        value={stats.totalPools.toString()}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
        color="blue"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'yellow' | 'green' | 'purple' | 'blue';
}) {
  const colorClasses = {
    yellow: 'text-amber-600 bg-amber-100',
    green: 'text-teal-600 bg-teal-100',
    purple: 'text-purple-600 bg-purple-100',
    blue: 'text-blue-600 bg-blue-100'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>
        {value}
      </div>
    </div>
  );
}
