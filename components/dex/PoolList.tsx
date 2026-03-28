import { useDexPools, Pool } from '../../lib/hooks/useDex';

export default function PoolList() {
  const { pools, loading, error, refetch } = useDexPools();

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full" />
          <span className="text-gray-500">Loading pools...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-red-400">{error}</div>
        <button
          onClick={refetch}
          className="mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-600 rounded-lg text-gray-900 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pools Yet</h3>
        <p className="text-gray-500 text-sm">Liquidity pools will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Liquidity Pools</h3>
          <button
            onClick={refetch}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-6 gap-4 px-4 py-3 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        <div className="col-span-2">Pool</div>
        <div className="text-right">Liquidity</div>
        <div className="text-right">Reserve A</div>
        <div className="text-right">Reserve B</div>
        <div className="text-right">Fee</div>
      </div>

      <div className="divide-y divide-gray-700">
        {pools.map((pool) => (
          <PoolRow key={pool.id} pool={pool} />
        ))}
      </div>
    </div>
  );
}

function PoolRow({ pool }: { pool: Pool }) {
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(4);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 px-4 py-4 hover:bg-gray-100/30 transition-colors">
      <div className="col-span-2 flex items-center gap-3">
        <div className="flex -space-x-2">
          <div className="w-8 h-8 bg-teal-500/20 border-2 border-gray-800 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-teal-600">{(pool.tokenASymbol || 'A').slice(0, 2)}</span>
          </div>
          <div className="w-8 h-8 bg-blue-500/20 border-2 border-gray-800 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-blue-400">{(pool.tokenBSymbol || 'B').slice(0, 2)}</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">
            {pool.tokenASymbol && pool.tokenBSymbol
              ? `${pool.tokenASymbol} / ${pool.tokenBSymbol}`
              : `Pool #${pool.id}`}
          </div>
          <div className="text-xs text-gray-500">
            {pool.protocol || 'DEX'}{pool.pairAddress ? ` · ${truncateAddress(pool.pairAddress)}` : ''}
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-col items-end justify-center">
        <span className="text-sm font-semibold text-teal-600">{formatAmount(pool.totalLiquidity)}</span>
        <span className="text-xs text-gray-500">Total LP</span>
      </div>

      <div className="hidden md:flex flex-col items-end justify-center">
        <span className="text-sm text-gray-900">{formatAmount(pool.reserveA)}</span>
      </div>

      <div className="hidden md:flex flex-col items-end justify-center">
        <span className="text-sm text-gray-900">{formatAmount(pool.reserveB)}</span>
      </div>

      <div className="flex flex-col items-end justify-center">
        <span className="text-sm font-medium text-green-400">{(pool.swapFee / 100).toFixed(2)}%</span>
        <span className="text-xs text-gray-500 md:hidden">{formatAmount(pool.totalLiquidity)} LP</span>
      </div>
    </div>
  );
}
