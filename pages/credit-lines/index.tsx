import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../../components/web3/WalletButton';
import CreditLineModal from '../../components/web3/CreditLineModal';
import { useWallet } from '../../lib/web3/useWallet';

interface CreditLine {
  id: string;
  collateralType: string;
  collateralSymbol: string;
  maxLTV: number;
  interestRate: number;
  liquidationThreshold: number;
  minCollateral: number;
  available: boolean;
  totalBorrowed: string;
  totalCollateral: string;
}

interface UserPosition {
  id: string;
  collateralType: string;
  collateralAmount: string;
  borrowedAmount: string;
  healthFactor: number;
  liquidationPrice: string;
  interestAccrued: string;
}

interface Stats {
  totalValueLocked: string;
  totalBorrowed: string;
  utilizationRate: string;
  avgInterestRate: string;
  activePositions: number;
  healthyPositions: number;
}

export default function CreditLinesPage() {
  const { address, isConnected } = useWallet();
  const [creditLines, setCreditLines] = useState<CreditLine[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCreditLine, setSelectedCreditLine] = useState<CreditLine | null>(null);
  const [modalAction, setModalAction] = useState<'borrow' | 'repay' | 'add-collateral'>('borrow');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [address]);

  const fetchData = async () => {
    try {
      const url = address 
        ? `/api/phase3/credit-lines?address=${address}`
        : '/api/phase3/credit-lines';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setCreditLines(data.creditLines);
        setUserPositions(data.userPositions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch credit lines:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (creditLine: CreditLine, action: 'borrow' | 'repay' | 'add-collateral') => {
    setSelectedCreditLine(creditLine);
    setModalAction(action);
    setIsModalOpen(true);
  };

  const getHealthColor = (factor: number) => {
    if (factor >= 1.5) return 'text-green-400';
    if (factor >= 1.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <>
      <Head>
        <title>AXUSD Credit Lines | Axiom Protocol</title>
        <meta name="description" content="Borrow AXUSD against your Axiom assets without selling" />
      </Head>

      <div className="min-h-screen bg-gray-950">
        <div className="relative bg-gradient-to-b from-gray-900 to-gray-950 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-block bg-yellow-500/20 text-yellow-400 px-4 py-1 rounded-full text-sm mb-4">
              Phase 3 Product
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">AXUSD Credit Lines</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Borrow against your Axiom assets without selling. Access liquidity while maintaining exposure.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Total Value Locked</div>
                    <div className="text-2xl font-bold text-white">${parseFloat(stats.totalValueLocked).toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Total Borrowed</div>
                    <div className="text-2xl font-bold text-yellow-400">${parseFloat(stats.totalBorrowed).toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Utilization Rate</div>
                    <div className="text-2xl font-bold text-white">{stats.utilizationRate}%</div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Active Positions</div>
                    <div className="text-2xl font-bold text-white">{stats.activePositions}</div>
                  </div>
                </div>
              )}

              {isConnected && userPositions.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-6">Your Positions</h2>
                  <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Collateral</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Deposited</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Borrowed</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Health Factor</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userPositions.map((pos) => (
                          <tr key={pos.id} className="border-t border-gray-800">
                            <td className="px-6 py-4 text-white">{pos.collateralType}</td>
                            <td className="px-6 py-4 text-white">{parseFloat(pos.collateralAmount).toLocaleString()}</td>
                            <td className="px-6 py-4 text-white">${parseFloat(pos.borrowedAmount).toLocaleString()}</td>
                            <td className={`px-6 py-4 font-semibold ${getHealthColor(pos.healthFactor)}`}>
                              {pos.healthFactor.toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button className="text-yellow-400 hover:text-yellow-300 text-sm">
                                  Repay
                                </button>
                                <button className="text-green-400 hover:text-green-300 text-sm">
                                  Add Collateral
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <h2 className="text-2xl font-bold text-white mb-6">Available Credit Lines</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {creditLines.map((cl) => (
                  <div key={cl.id} className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-yellow-500/50 transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{cl.collateralType}</h3>
                        <span className="text-gray-400 text-sm">{cl.collateralSymbol}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${cl.available ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {cl.available ? 'Available' : 'Paused'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <div className="text-sm text-gray-400">Max LTV</div>
                        <div className="text-lg font-semibold text-white">{cl.maxLTV}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Interest Rate</div>
                        <div className="text-lg font-semibold text-yellow-400">{cl.interestRate}% APR</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Liquidation</div>
                        <div className="text-lg font-semibold text-white">{cl.liquidationThreshold}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Min Collateral</div>
                        <div className="text-lg font-semibold text-white">{cl.minCollateral} {cl.collateralSymbol}</div>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm text-gray-400 mb-4">
                      <span>TVL: ${parseFloat(cl.totalCollateral).toLocaleString()}</span>
                      <span>Borrowed: ${parseFloat(cl.totalBorrowed).toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => openModal(cl, 'borrow')}
                      disabled={!cl.available}
                      className={`w-full py-3 rounded-lg font-semibold transition ${
                        cl.available 
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Borrow AXUSD
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-12 bg-gray-900 rounded-xl border border-gray-800 p-8">
                <h2 className="text-2xl font-bold text-white mb-4">How Credit Lines Work</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl">1</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Deposit Collateral</h3>
                    <p className="text-gray-400">Lock your AXM, SEED, LP tokens, or Land Options as collateral in the protocol.</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl">2</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Borrow AXUSD</h3>
                    <p className="text-gray-400">Borrow up to your max LTV in AXUSD stablecoin. Use it anywhere in DeFi.</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl">3</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Repay & Unlock</h3>
                    <p className="text-gray-400">Repay your loan plus interest anytime to unlock your collateral.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <CreditLineModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchData();
        }}
        creditLine={selectedCreditLine}
        action={modalAction}
      />
    </>
  );
}
