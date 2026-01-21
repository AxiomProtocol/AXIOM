import { useState, useEffect } from 'react';
import { useUserLiquidity, useDexPools, DEX_V2_CONTRACTS } from '../../lib/hooks/useDex';
import { useWallet } from '../../lib/web3/useWallet';
import { ethers } from 'ethers';

const TOKENS = [
  { symbol: 'AXUSD', address: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c', decimals: 18 },
  { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
  { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  { symbol: 'AXM', address: '0x53e79F3a8e60eB0a6bE88B60f3c95Bc7b22C5A54', decimals: 18 },
  { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
  { symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 },
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

const EXCHANGE_HUB_ABI = [
  'function createPool(address tokenA, address tokenB, uint256 swapFee) external returns (uint256)',
  'function addLiquidity(uint256 poolId, uint256 amountA, uint256 amountB, uint256 minLiquidity) external returns (uint256)',
  'function removeLiquidity(uint256 poolId, uint256 liquidity, uint256 minAmountA, uint256 minAmountB) external returns (uint256, uint256)',
  'function pools(uint256) external view returns (address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, uint256 totalLiquidity, uint256 swapFee, bool isActive)',
];

export default function LiquidityManager() {
  const { isConnected, address, signer } = useWallet();
  const { positions, loading: positionsLoading, refetch } = useUserLiquidity(address);
  const { pools, refetch: refetchPools } = useDexPools();
  const [activeTab, setActiveTab] = useState<'positions' | 'add' | 'create'>('positions');
  const [selectedPool, setSelectedPool] = useState<number | null>(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [tokenA, setTokenA] = useState(TOKENS[0]);
  const [tokenB, setTokenB] = useState(TOKENS[1]);
  const [swapFee, setSwapFee] = useState('30');
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [removeAmount, setRemoveAmount] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  const getTokenSymbol = (addr: string) => {
    const token = TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase());
    return token?.symbol || addr.slice(0, 6) + '...';
  };

  const handleCreatePool = async () => {
    if (!signer || !tokenA || !tokenB) return;
    
    try {
      setIsLoading(true);
      setTxStatus({ type: null, message: '' });

      const exchangeHub = new ethers.Contract(
        DEX_V2_CONTRACTS.EXCHANGE_HUB_V2,
        EXCHANGE_HUB_ABI,
        signer
      );

      const feeInBps = Math.floor(parseFloat(swapFee));
      const tx = await exchangeHub.createPool(tokenA.address, tokenB.address, feeInBps);
      
      setTxStatus({ type: null, message: 'Creating pool... Waiting for confirmation' });
      await tx.wait();
      
      setTxStatus({ type: 'success', message: `Pool ${tokenA.symbol}/${tokenB.symbol} created successfully!` });
      refetchPools();
      setActiveTab('add');
    } catch (error: any) {
      console.error('Create pool error:', error);
      setTxStatus({ type: 'error', message: error.reason || error.message || 'Failed to create pool' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!signer || selectedPool === null || !amountA || !amountB) return;

    try {
      setIsLoading(true);
      setTxStatus({ type: null, message: '' });

      const pool = pools.find(p => p.id === selectedPool);
      if (!pool) throw new Error('Pool not found');

      const tokenAData = TOKENS.find(t => t.address.toLowerCase() === pool.tokenA.toLowerCase());
      const tokenBData = TOKENS.find(t => t.address.toLowerCase() === pool.tokenB.toLowerCase());

      const amountAWei = ethers.parseUnits(amountA, tokenAData?.decimals || 18);
      const amountBWei = ethers.parseUnits(amountB, tokenBData?.decimals || 18);

      const tokenAContract = new ethers.Contract(pool.tokenA, ERC20_ABI, signer);
      const tokenBContract = new ethers.Contract(pool.tokenB, ERC20_ABI, signer);

      setTxStatus({ type: null, message: 'Checking allowances...' });

      const allowanceA = await tokenAContract.allowance(address, DEX_V2_CONTRACTS.EXCHANGE_HUB_V2);
      if (allowanceA < amountAWei) {
        setTxStatus({ type: null, message: `Approving ${tokenAData?.symbol || 'Token A'}...` });
        const approveTxA = await tokenAContract.approve(DEX_V2_CONTRACTS.EXCHANGE_HUB_V2, ethers.MaxUint256);
        await approveTxA.wait();
      }

      const allowanceB = await tokenBContract.allowance(address, DEX_V2_CONTRACTS.EXCHANGE_HUB_V2);
      if (allowanceB < amountBWei) {
        setTxStatus({ type: null, message: `Approving ${tokenBData?.symbol || 'Token B'}...` });
        const approveTxB = await tokenBContract.approve(DEX_V2_CONTRACTS.EXCHANGE_HUB_V2, ethers.MaxUint256);
        await approveTxB.wait();
      }

      const exchangeHub = new ethers.Contract(
        DEX_V2_CONTRACTS.EXCHANGE_HUB_V2,
        EXCHANGE_HUB_ABI,
        signer
      );

      setTxStatus({ type: null, message: 'Adding liquidity...' });
      const tx = await exchangeHub.addLiquidity(selectedPool, amountAWei, amountBWei, 0);
      await tx.wait();

      setTxStatus({ type: 'success', message: 'Liquidity added successfully!' });
      setAmountA('');
      setAmountB('');
      refetch();
      refetchPools();
    } catch (error: any) {
      console.error('Add liquidity error:', error);
      setTxStatus({ type: 'error', message: error.reason || error.message || 'Failed to add liquidity' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLiquidity = async (poolId: number, liquidity: string) => {
    if (!signer) return;

    try {
      setIsLoading(true);
      setTxStatus({ type: null, message: '' });

      const liquidityWei = ethers.parseEther(liquidity);

      const exchangeHub = new ethers.Contract(
        DEX_V2_CONTRACTS.EXCHANGE_HUB_V2,
        EXCHANGE_HUB_ABI,
        signer
      );

      setTxStatus({ type: null, message: 'Removing liquidity...' });
      const tx = await exchangeHub.removeLiquidity(poolId, liquidityWei, 0, 0);
      await tx.wait();

      setTxStatus({ type: 'success', message: 'Liquidity removed successfully!' });
      setSelectedPosition(null);
      setRemoveAmount('');
      refetch();
      refetchPools();
    } catch (error: any) {
      console.error('Remove liquidity error:', error);
      setTxStatus({ type: 'error', message: error.reason || error.message || 'Failed to remove liquidity' });
    } finally {
      setIsLoading(false);
    }
  };

  const WalletRequiredMessage = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Wallet</h3>
      <p className="text-gray-500 text-sm">Connect your wallet to use this feature.</p>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('positions')}
          className={`flex-1 py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'positions'
              ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50/50'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Your Positions
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'add'
              ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50/50'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'create'
              ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50/50'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Create Pool
        </button>
      </div>

      {txStatus.type && (
        <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${
          txStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {txStatus.message}
        </div>
      )}

      <div className="p-6">
        {activeTab === 'positions' && (
          <div>
            {!isConnected ? (
              <WalletRequiredMessage />
            ) : positionsLoading ? (
              <div className="flex items-center gap-3 justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full" />
                <span className="text-gray-500">Loading positions...</span>
              </div>
            ) : positions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No liquidity positions found</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="mt-4 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-gray-900 rounded-lg text-sm font-semibold transition-colors"
                >
                  Add Liquidity
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((pos) => {
                  const pool = pools.find(p => p.id === pos.poolId);
                  return (
                    <div
                      key={pos.poolId}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 bg-teal-500/20 border-2 border-gray-700 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-teal-600">
                                {pool ? getTokenSymbol(pool.tokenA).charAt(0) : 'A'}
                              </span>
                            </div>
                            <div className="w-8 h-8 bg-blue-500/20 border-2 border-gray-700 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-400">
                                {pool ? getTokenSymbol(pool.tokenB).charAt(0) : 'B'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {pool ? `${getTokenSymbol(pool.tokenA)} / ${getTokenSymbol(pool.tokenB)}` : `Pool #${pos.poolId}`}
                            </div>
                            <div className="text-xs text-gray-500">{pos.sharePercent.toFixed(4)}% share</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-teal-600">
                            {parseFloat(pos.liquidity).toFixed(4)} LP
                          </div>
                          {selectedPosition === pos.poolId ? (
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="number"
                                value={removeAmount}
                                onChange={(e) => setRemoveAmount(e.target.value)}
                                placeholder="Amount"
                                className="w-20 px-2 py-1 text-xs bg-gray-800 border border-gray-300 rounded text-gray-900"
                              />
                              <button
                                onClick={() => handleRemoveLiquidity(pos.poolId, removeAmount || pos.liquidity)}
                                disabled={isLoading}
                                className="text-xs px-2 py-1 bg-red-500 hover:bg-red-400 text-gray-900 rounded transition-colors disabled:opacity-50"
                              >
                                {isLoading ? '...' : 'Remove'}
                              </button>
                              <button
                                onClick={() => setSelectedPosition(null)}
                                className="text-xs text-gray-500 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedPosition(pos.poolId);
                                setRemoveAmount(pos.liquidity);
                              }}
                              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="space-y-4">
            {!isConnected ? (
              <WalletRequiredMessage />
            ) : (
            <>
            <div>
              <label className="block text-sm text-gray-500 mb-2">Select Pool</label>
              <select
                value={selectedPool || ''}
                onChange={(e) => setSelectedPool(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-teal-500"
              >
                <option value="">Choose a pool...</option>
                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {getTokenSymbol(pool.tokenA)} / {getTokenSymbol(pool.tokenB)} (Pool #{pool.id})
                  </option>
                ))}
              </select>
            </div>

            {selectedPool && pools.find(p => p.id === selectedPool) && (
              <>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">
                    {getTokenSymbol(pools.find(p => p.id === selectedPool)!.tokenA)} Amount
                  </label>
                  <input
                    type="number"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-2">
                    {getTokenSymbol(pools.find(p => p.id === selectedPool)!.tokenB)} Amount
                  </label>
                  <input
                    type="number"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </>
            )}

            {txStatus.message && !txStatus.type && (
              <div className="text-center text-sm text-teal-600">{txStatus.message}</div>
            )}

            <button
              onClick={handleAddLiquidity}
              disabled={!selectedPool || !amountA || !amountB || isLoading}
              className={`w-full py-4 rounded-xl font-bold transition-all ${
                selectedPool && amountA && amountB && !isLoading
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 hover:from-yellow-400 hover:to-yellow-500'
                  : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Processing...' : 'Add Liquidity'}
            </button>
            </>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="space-y-4">
            {!isConnected ? (
              <WalletRequiredMessage />
            ) : (
            <>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-4">
              <p className="text-sm text-gray-500">
                Create a new liquidity pool for any token pair. You'll need to add initial liquidity after creating the pool.
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-2">Token A</label>
              <select
                value={tokenA.address}
                onChange={(e) => setTokenA(TOKENS.find(t => t.address === e.target.value) || TOKENS[0])}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-teal-500"
              >
                {TOKENS.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-2">Token B</label>
              <select
                value={tokenB.address}
                onChange={(e) => setTokenB(TOKENS.find(t => t.address === e.target.value) || TOKENS[1])}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-teal-500"
              >
                {TOKENS.filter(t => t.address !== tokenA.address).map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-2">Swap Fee (basis points)</label>
              <div className="flex gap-2">
                {['10', '30', '50', '100'].map((fee) => (
                  <button
                    key={fee}
                    onClick={() => setSwapFee(fee)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      swapFee === fee
                        ? 'bg-teal-500 text-black'
                        : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {(parseFloat(fee) / 100).toFixed(2)}%
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Fee charged on each swap. 30 bps = 0.30%
              </p>
            </div>

            {txStatus.message && !txStatus.type && (
              <div className="text-center text-sm text-teal-600">{txStatus.message}</div>
            )}

            <button
              onClick={handleCreatePool}
              disabled={tokenA.address === tokenB.address || isLoading}
              className={`w-full py-4 rounded-xl font-bold transition-all ${
                tokenA.address !== tokenB.address && !isLoading
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 hover:from-yellow-400 hover:to-yellow-500'
                  : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Creating Pool...' : `Create ${tokenA.symbol}/${tokenB.symbol} Pool`}
            </button>
            </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
