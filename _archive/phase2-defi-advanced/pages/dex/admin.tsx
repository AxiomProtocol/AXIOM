import { useState, useEffect } from 'react';
import Head from 'next/head';
import { ethers } from 'ethers';
import { useWallet } from '../../lib/web3/useWallet';

const EXCHANGE_HUB_ADDRESS = '0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28';
const TREASURY_SAFE = '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d';

const TOKENS = [
  { symbol: 'AXUSD', address: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c', decimals: 18 },
  { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
  { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  { symbol: 'AXM', address: '0x53e79F3a8e60eB0a6bE88B60f3c95Bc7b22C5A54', decimals: 18 },
  { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
  { symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 },
];

const EXCHANGE_HUB_ABI = [
  'function createPool(address tokenA, address tokenB, uint256 swapFee) external returns (uint256)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
];

interface PoolInfo {
  id: number;
  tokenA: string;
  tokenB: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  reserveA: string;
  reserveB: string;
  totalLiquidity: string;
  swapFee: number;
  isActive: boolean;
}

interface ContractStatus {
  success: boolean;
  treasuryIsAdmin: boolean;
  nextPoolId: number;
  pools: PoolInfo[];
  message: string;
}

export default function DexAdminPage() {
  const { isConnected, address, signer } = useWallet();
  const [status, setStatus] = useState<ContractStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenA, setTokenA] = useState(TOKENS[0]);
  const [tokenB, setTokenB] = useState(TOKENS[1]);
  const [swapFee, setSwapFee] = useState('30');
  const [isCreating, setIsCreating] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (address) {
      checkIfAdmin();
    }
  }, [address]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/dex/admin/check-pools');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfAdmin = async () => {
    if (!address) return;
    const isTreasury = address.toLowerCase() === TREASURY_SAFE.toLowerCase();
    setIsAdmin(isTreasury);
  };

  const handleCreatePool = async () => {
    if (!signer) return;

    try {
      setIsCreating(true);
      setTxStatus({ type: null, message: 'Preparing transaction...' });

      const exchangeHub = new ethers.Contract(
        EXCHANGE_HUB_ADDRESS,
        EXCHANGE_HUB_ABI,
        signer
      );

      const feeInBps = Math.floor(parseFloat(swapFee));
      
      setTxStatus({ type: null, message: 'Please confirm the transaction in your wallet...' });
      const tx = await exchangeHub.createPool(tokenA.address, tokenB.address, feeInBps);
      
      setTxStatus({ type: null, message: 'Transaction submitted. Waiting for confirmation...' });
      await tx.wait();
      
      setTxStatus({ type: 'success', message: `Pool ${tokenA.symbol}/${tokenB.symbol} created successfully!` });
      fetchStatus();
    } catch (error: any) {
      console.error('Create pool error:', error);
      let errorMessage = 'Failed to create pool';
      
      if (error.code === 'CALL_EXCEPTION') {
        errorMessage = 'Transaction failed. You may not have permission to create pools.';
      } else if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was cancelled';
      } else if (error.reason) {
        errorMessage = error.reason;
      }
      
      setTxStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsCreating(false);
    }
  };

  const generateCalldata = () => {
    const iface = new ethers.Interface(EXCHANGE_HUB_ABI);
    const feeInBps = Math.floor(parseFloat(swapFee));
    return iface.encodeFunctionData('createPool', [tokenA.address, tokenB.address, feeInBps]);
  };

  return (
    <>
      <Head>
        <title>DEX Admin | Pool Management</title>
      </Head>

      <div className="min-h-screen bg-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DEX Admin Panel</h1>
          <p className="text-gray-600 mb-8">Manage liquidity pools on ExchangeHubV2</p>

          {loading ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading contract status...</p>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contract Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Exchange Hub</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{EXCHANGE_HUB_ADDRESS}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Treasury Safe (Admin)</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{TREASURY_SAFE}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Treasury Has Admin Role</p>
                    <p className={`font-semibold ${status?.treasuryIsAdmin ? 'text-green-600' : 'text-red-600'}`}>
                      {status?.treasuryIsAdmin ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Pools</p>
                    <p className="font-semibold text-gray-900">{status?.nextPoolId || 0}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">{status?.message}</p>
                </div>
              </div>

              {status?.pools && status.pools.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Existing Pools</h2>
                  <div className="space-y-3">
                    {status.pools.map((pool) => (
                      <div key={pool.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-gray-900">
                              {pool.tokenASymbol} / {pool.tokenBSymbol}
                            </span>
                            <span className="ml-2 text-sm text-gray-500">Pool #{pool.id}</span>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 text-xs rounded ${pool.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {pool.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          Fee: {pool.swapFee / 100}% | Liquidity: {parseFloat(pool.totalLiquidity).toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Pool</h2>
                
                {!isConnected && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800">Connect your wallet to create pools. Only the Treasury Safe can create pools.</p>
                  </div>
                )}

                {isConnected && !isAdmin && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800">
                      Your wallet ({address?.slice(0, 6)}...{address?.slice(-4)}) is not the Treasury Safe. 
                      Use the calldata below to create pools via the Safe.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token A</label>
                    <select
                      value={tokenA.address}
                      onChange={(e) => setTokenA(TOKENS.find(t => t.address === e.target.value) || TOKENS[0])}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-500"
                    >
                      {TOKENS.map((token) => (
                        <option key={token.address} value={token.address}>{token.symbol}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token B</label>
                    <select
                      value={tokenB.address}
                      onChange={(e) => setTokenB(TOKENS.find(t => t.address === e.target.value) || TOKENS[1])}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-teal-500"
                    >
                      {TOKENS.filter(t => t.address !== tokenA.address).map((token) => (
                        <option key={token.address} value={token.address}>{token.symbol}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Swap Fee (basis points)</label>
                  <div className="flex gap-2">
                    {['10', '30', '50', '100'].map((fee) => (
                      <button
                        key={fee}
                        onClick={() => setSwapFee(fee)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          swapFee === fee
                            ? 'bg-teal-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {(parseFloat(fee) / 100).toFixed(2)}%
                      </button>
                    ))}
                  </div>
                </div>

                {txStatus.type && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    txStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {txStatus.message}
                  </div>
                )}

                {isConnected && isAdmin && (
                  <button
                    onClick={handleCreatePool}
                    disabled={isCreating || tokenA.address === tokenB.address}
                    className={`w-full py-4 rounded-xl font-bold transition-colors ${
                      !isCreating && tokenA.address !== tokenB.address
                        ? 'bg-teal-500 hover:bg-teal-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isCreating ? 'Creating Pool...' : `Create ${tokenA.symbol}/${tokenB.symbol} Pool`}
                  </button>
                )}

                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Transaction Calldata (for Gnosis Safe)</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Copy this calldata and submit via your Gnosis Safe to create the pool:
                  </p>
                  <div className="bg-white p-3 rounded border border-gray-200 font-mono text-xs break-all text-gray-800">
                    <div className="mb-2">
                      <span className="text-gray-500">To:</span> {EXCHANGE_HUB_ADDRESS}
                    </div>
                    <div className="mb-2">
                      <span className="text-gray-500">Value:</span> 0
                    </div>
                    <div>
                      <span className="text-gray-500">Data:</span> {generateCalldata()}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
