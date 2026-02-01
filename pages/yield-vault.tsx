import Head from 'next/head';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';
import EulerVaultCard from '../components/EulerVaultCard';

interface VaultInfo {
  totalDeposited: string;
  totalRewards: string;
  apy: string;
  nextCompound: number;
  userDeposit: string;
  userRewards: string;
  autoCompoundEnabled: boolean;
}

interface CompoundHistory {
  id: string;
  timestamp: number;
  amountCompounded: string;
  newTotal: string;
}

export default function YieldVaultPage() {
  const { walletState } = useWallet();
  const address = walletState.address;
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [history, setHistory] = useState<CompoundHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (address) {
      fetchVaultData();
    } else {
      setLoading(false);
    }
  }, [address]);

  const fetchVaultData = async () => {
    try {
      const res = await fetch(`/api/yield-vault?address=${address}`);
      const data = await res.json();
      if (data.success) {
        setVaultInfo(data.vault);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching vault data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/yield-vault/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount: depositAmount }),
      });
      const data = await res.json();
      if (data.success) {
        setDepositAmount('');
        fetchVaultData();
      }
    } catch (err) {
      console.error('Error depositing:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/yield-vault/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount: withdrawAmount }),
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawAmount('');
        fetchVaultData();
      }
    } catch (err) {
      console.error('Error withdrawing:', err);
    } finally {
      setProcessing(false);
    }
  };

  const toggleAutoCompound = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/yield-vault/toggle-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, enabled: !vaultInfo?.autoCompoundEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        fetchVaultData();
      }
    } catch (err) {
      console.error('Error toggling auto-compound:', err);
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return 'Now';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!walletState.isConnected) {
    return (
      <>
        <Head>
          <title>Yield Vault | Axiom Protocol</title>
        </Head>
        <Layout showWallet={true}>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🏦</div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
              <p className="text-gray-400">Connect to access the yield vault</p>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Yield Vault | Axiom Protocol</title>
        </Head>
        <Layout showWallet={true}>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="animate-spin w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full"></div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Yield Vault | Axiom Protocol</title>
      </Head>
      <Layout showWallet={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">
                Yield Vault
              </h1>
              <p className="text-gray-400">Auto-compounding AXM staking for maximum returns</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">Total Value Locked</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {parseFloat(vaultInfo?.totalDeposited || '0').toLocaleString()} AXM
                </p>
              </div>
              <div className="bg-gray-800 border border-green-500/30 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">Current APY</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{vaultInfo?.apy || '0'}%</p>
                <p className="text-xs text-gray-500 mt-1">Auto-compounded daily</p>
              </div>
              <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">Next Compound</p>
                <p className="text-3xl font-bold text-purple-400 mt-2">
                  {formatTime(vaultInfo?.nextCompound || 0)}
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Your Position</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-900/50 rounded-lg">
                      <span className="text-gray-400">Deposited</span>
                      <span className="text-xl font-bold text-white">
                        {parseFloat(vaultInfo?.userDeposit || '0').toLocaleString()} AXM
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-900/50 rounded-lg">
                      <span className="text-gray-400">Earned Rewards</span>
                      <span className="text-xl font-bold text-green-400">
                        +{parseFloat(vaultInfo?.userRewards || '0').toLocaleString()} AXM
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-900/50 rounded-lg">
                      <span className="text-gray-400">Auto-Compound</span>
                      <button
                        onClick={toggleAutoCompound}
                        disabled={processing}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          vaultInfo?.autoCompoundEnabled
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {vaultInfo?.autoCompoundEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setActiveTab('deposit')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'deposit'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => setActiveTab('withdraw')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'withdraw'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Withdraw
                    </button>
                  </div>

                  {activeTab === 'deposit' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Amount to Deposit</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">AXM</span>
                        </div>
                      </div>
                      <button
                        onClick={handleDeposit}
                        disabled={processing || !depositAmount}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-lg transition-all"
                      >
                        {processing ? 'Processing...' : 'Deposit'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Amount to Withdraw</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">AXM</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Available: {parseFloat(vaultInfo?.userDeposit || '0').toLocaleString()} AXM
                        </p>
                      </div>
                      <button
                        onClick={handleWithdraw}
                        disabled={processing || !withdrawAmount}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-lg transition-all"
                      >
                        {processing ? 'Processing...' : 'Withdraw'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Compound History</h3>
                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📈</div>
                    <p className="text-gray-400">No compound events yet</p>
                    <p className="text-gray-500 text-sm mt-1">Deposit to start earning</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {history.map((event) => (
                      <div key={event.id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-green-400 font-medium">+{event.amountCompounded} AXM</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">New Total</p>
                            <p className="text-white font-medium">{event.newTotal} AXM</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 p-4 bg-gray-900/50 rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-2">How Auto-Compound Works</h4>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Rewards are automatically reinvested daily</li>
                    <li>• Compound frequency optimized for gas efficiency</li>
                    <li>• No action required - fully automated</li>
                    <li>• Withdraw anytime with no lockup</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">External DeFi Yields</h2>
                <a href="/earn" className="text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                  View All →
                </a>
              </div>
              <EulerVaultCard variant="compact" showCollateral={false} />
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
