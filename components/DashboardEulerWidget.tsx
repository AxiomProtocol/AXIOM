import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EulerStats {
  totalSupply: string;
  supplyAPY: string;
  utilization: string;
  eulerLink: string;
}

export default function DashboardEulerWidget() {
  const [stats, setStats] = useState<EulerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/euler/vault-stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.vault);
      }
    } catch (err) {
      console.error('Error fetching Euler stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 rounded-xl p-4 animate-pulse border border-yellow-500/20">
        <div className="h-5 bg-gray-700 rounded w-2/3 mb-3"></div>
        <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 rounded-xl p-4 border border-yellow-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-yellow-400 text-sm font-bold">E</span>
          </div>
          <div>
            <p className="text-white font-medium text-sm">AXUSD Lending</p>
            <p className="text-gray-400 text-xs">Euler Finance</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-green-400 font-bold">{stats.supplyAPY}%</p>
          <p className="text-gray-400 text-xs">APY</p>
        </div>
      </div>

      <div className="flex justify-between text-sm mb-3">
        <div>
          <p className="text-gray-400 text-xs">Total Supplied</p>
          <p className="text-white font-medium">${stats.totalSupply}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">Utilization</p>
          <p className="text-white font-medium">{stats.utilization}%</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a 
          href={stats.eulerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-center rounded-lg text-sm font-medium transition-colors"
        >
          Deposit
        </a>
        <Link 
          href="/earn"
          className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-center rounded-lg text-sm font-medium transition-colors"
        >
          All Yields
        </Link>
      </div>
    </div>
  );
}
