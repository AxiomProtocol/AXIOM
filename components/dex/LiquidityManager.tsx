import { useState } from 'react';
import { useUserLiquidity, useDexPools } from '../../client/src/hooks/useDex';
import { useWallet } from '../../lib/web3/useWallet';

export default function LiquidityManager() {
  const { isConnected, address } = useWallet();
  const { positions, loading: positionsLoading, refetch } = useUserLiquidity(address);
  const { pools } = useDexPools();
  const [activeTab, setActiveTab] = useState<'positions' | 'add'>('positions');
  const [selectedPool, setSelectedPool] = useState<number | null>(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');

  if (!isConnected) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Connect Wallet</h3>
        <p className="text-gray-400 text-sm">Connect your wallet to manage liquidity positions.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('positions')}
          className={`flex-1 py-4 px-6 text-sm font-semibold transition-colors ${
            activeTab === 'positions'
              ? 'text-yellow-400 border-b-2 border-yellow-400 bg-gray-900/30'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Your Positions
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-4 px-6 text-sm font-semibold transition-colors ${
            activeTab === 'add'
              ? 'text-yellow-400 border-b-2 border-yellow-400 bg-gray-900/30'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Add Liquidity
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'positions' && (
          <div>
            {positionsLoading ? (
              <div className="flex items-center gap-3 justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
                <span className="text-gray-400">Loading positions...</span>
              </div>
            ) : positions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No liquidity positions found</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="mt-4 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg text-sm font-semibold transition-colors"
                >
                  Add Liquidity
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((pos) => (
                  <div
                    key={pos.poolId}
                    className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 bg-yellow-500/20 border-2 border-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-yellow-400">A</span>
                        </div>
                        <div className="w-8 h-8 bg-blue-500/20 border-2 border-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-400">B</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Pool #{pos.poolId}</div>
                        <div className="text-xs text-gray-400">{pos.sharePercent.toFixed(4)}% share</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-yellow-400">
                        {parseFloat(pos.liquidity).toFixed(4)} LP
                      </div>
                      <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select Pool</label>
              <select
                value={selectedPool || ''}
                onChange={(e) => setSelectedPool(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-yellow-500"
              >
                <option value="">Choose a pool...</option>
                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    Pool #{pool.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Token A Amount</label>
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Token B Amount</label>
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <button
              disabled={!selectedPool || !amountA || !amountB}
              className={`w-full py-4 rounded-xl font-bold transition-all ${
                selectedPool && amountA && amountB
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 hover:from-yellow-400 hover:to-yellow-500'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Add Liquidity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
