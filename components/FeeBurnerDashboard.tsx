import { useState, useEffect } from 'react';

interface FeeBurnerStats {
  totalFeesCollected: string;
  totalAxmBurned: string;
  totalBuybacks: number;
  pendingFees: string;
  buybackThreshold: string;
  canExecuteBuyback: boolean;
}

export default function FeeBurnerDashboard() {
  const [stats, setStats] = useState<FeeBurnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setError(null);
    try {
      const res = await fetch('/api/v2/fee-burner-stats');
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setStats(data);
      } else {
        setError(data.error || 'Failed to load');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (val: string) => {
    const num = parseFloat(val);
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-red-500/30 rounded-xl p-6">
        <div className="text-center">
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={fetchStats} className="ml-2 text-yellow-500 hover:text-yellow-400 text-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">🔥</span> Fee Burner
        </h3>
        {stats?.canExecuteBuyback && (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
            Buyback Ready
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Total Fees Collected</p>
          <p className="text-xl font-bold text-white">{formatNumber(stats?.totalFeesCollected || '0')}</p>
          <p className="text-xs text-gray-500">USD equivalent</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">AXM Burned</p>
          <p className="text-xl font-bold text-orange-400">{formatNumber(stats?.totalAxmBurned || '0')}</p>
          <p className="text-xs text-gray-500">Permanently removed</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-400">{stats?.totalBuybacks || 0}</p>
          <p className="text-xs text-gray-400">Buybacks</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-400">{formatNumber(stats?.pendingFees || '0')}</p>
          <p className="text-xs text-gray-400">Pending</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-400">{formatNumber(stats?.buybackThreshold || '0')}</p>
          <p className="text-xs text-gray-400">Threshold</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2">How It Works</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• 0.5% fee on all banking products</li>
          <li>• 50% used to buy back AXM from DEX</li>
          <li>• Purchased AXM is burned (sent to 0xdead)</li>
          <li>• 50% distributed to veAXM holders</li>
        </ul>
      </div>
    </div>
  );
}
