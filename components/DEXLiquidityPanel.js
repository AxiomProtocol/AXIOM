import { useState, useEffect } from 'react';

export default function DEXLiquidityPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDexData();
  }, []);

  const fetchDexData = async () => {
    try {
      const response = await fetch('/api/dex/liquidity');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching DEX data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
          <span className="text-gray-400">Loading DEX data...</span>
        </div>
      </div>
    );
  }

  if (!data || !data.success) {
    return null;
  }

  const { dex, pools } = data;
  const hasLiquidity = parseFloat(dex.totalLiquidity) > 0 || parseFloat(dex.axmInDex) > 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">DEX Liquidity</h3>
        <span className="text-sm text-gray-400">Axiom Exchange Hub</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Liquidity</div>
          <div className="text-xl font-bold text-yellow-400">
            {parseFloat(dex.totalLiquidity).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Active Pools</div>
          <div className="text-xl font-bold text-blue-400">{dex.poolCount}</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">24h Volume</div>
          <div className="text-xl font-bold text-green-400">
            {parseFloat(dex.volume24h).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">AXM in DEX</div>
          <div className="text-xl font-bold text-purple-400">
            {parseFloat(dex.axmInDex).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
          </div>
        </div>
      </div>

      {pools.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Liquidity Pools</h4>
          {pools.map((pool) => (
            <div 
              key={pool.id}
              className="bg-gray-900/30 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center text-black font-bold text-sm">
                  {pool.id}
                </div>
                <div>
                  <div className="font-semibold text-white">{pool.name}</div>
                  <div className="text-sm text-gray-400">Fee: {pool.fee}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">
                  TVL: {parseFloat(pool.tvl).toLocaleString(undefined, { maximumFractionDigits: 0 })} AXM
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pools.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No active liquidity pools detected from contract
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700">
        <a 
          href={`https://arbitrum.blockscout.com/address/${data.contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
        >
          View on Blockscout
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
