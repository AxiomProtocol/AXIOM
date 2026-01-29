import { useState, useEffect } from 'react';

interface EulerVaultStats {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  totalBorrows: string;
  availableLiquidity: string;
  utilization: string;
  supplyAPY: string;
  borrowAPY: string;
  supplyCap: string;
  borrowCap: string;
  eulerLink: string;
  collateral: Array<{
    symbol: string;
    vaultAddress: string;
    borrowLTV: number;
    liquidationLTV: number;
  }>;
}

interface EulerVaultCardProps {
  variant?: 'full' | 'compact' | 'widget';
  showCollateral?: boolean;
  className?: string;
}

export default function EulerVaultCard({ 
  variant = 'full', 
  showCollateral = true,
  className = '' 
}: EulerVaultCardProps) {
  const [stats, setStats] = useState<EulerVaultStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/euler/vault-stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.vault);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load vault stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-900 rounded-xl p-6 animate-pulse ${className}`}>
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={`bg-gray-900 rounded-xl p-6 ${className}`}>
        <p className="text-red-400">Error loading Euler vault: {error}</p>
      </div>
    );
  }

  if (variant === 'widget') {
    return (
      <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-yellow-500/20 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <span className="text-yellow-400 text-sm font-bold">E</span>
            </div>
            <span className="text-white font-medium">AXUSD Lending</span>
          </div>
          <span className="text-green-400 text-sm font-bold">{stats.supplyAPY}% APY</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">TVL</span>
          <span className="text-white">${stats.totalSupply}</span>
        </div>
        <a 
          href={stats.eulerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-center rounded-lg text-sm font-medium transition-colors"
        >
          Deposit on Euler
        </a>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 border border-yellow-500/20 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-yellow-400 font-bold">E</span>
          </div>
          <div>
            <h3 className="text-white font-semibold">AXUSD on Euler</h3>
            <p className="text-gray-400 text-sm">Arbitrum One</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-gray-400 text-xs mb-1">Supply APY</p>
            <p className="text-green-400 text-xl font-bold">{stats.supplyAPY}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Total Supplied</p>
            <p className="text-white text-xl font-bold">${stats.totalSupply}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <a 
            href={stats.eulerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-center rounded-lg font-medium transition-colors"
          >
            Lend AXUSD
          </a>
          <a 
            href={stats.eulerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-center rounded-lg font-medium transition-colors"
          >
            Borrow
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-yellow-500/20 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-yellow-400 text-xl font-bold">E</span>
          </div>
          <div>
            <h3 className="text-white text-xl font-bold">AXUSD Lending Vault</h3>
            <p className="text-gray-400 text-sm">Powered by Euler Finance</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
          Live
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Supply APY</p>
          <p className="text-green-400 text-2xl font-bold">{stats.supplyAPY}%</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Total Supplied</p>
          <p className="text-white text-2xl font-bold">${stats.totalSupply}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Borrow APY</p>
          <p className="text-orange-400 text-2xl font-bold">{stats.borrowAPY}%</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Utilization</p>
          <p className="text-white text-2xl font-bold">{stats.utilization}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Supply Cap</p>
          <p className="text-white font-medium">{stats.supplyCap} AXUSD</p>
        </div>
        <div className="bg-gray-800/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Borrow Cap</p>
          <p className="text-white font-medium">{stats.borrowCap} AXUSD</p>
        </div>
      </div>

      {showCollateral && (
        <div className="mb-6">
          <h4 className="text-white font-semibold mb-3">Accepted Collateral</h4>
          <div className="space-y-2">
            {stats.collateral.map((col) => (
              <div key={col.symbol} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                    {col.symbol.slice(0, 2)}
                  </div>
                  <span className="text-white">{col.symbol}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 text-sm">LTV: </span>
                  <span className="text-white text-sm">{col.borrowLTV}%</span>
                  <span className="text-gray-500 text-sm"> / {col.liquidationLTV}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <a 
          href={stats.eulerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black text-center rounded-xl font-semibold transition-colors"
        >
          Lend AXUSD
        </a>
        <a 
          href={stats.eulerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white text-center rounded-xl font-semibold transition-colors"
        >
          Borrow AXUSD
        </a>
      </div>

      <p className="text-center text-gray-500 text-xs mt-4">
        Vault: {stats.address.slice(0, 10)}...{stats.address.slice(-8)}
      </p>
    </div>
  );
}
