import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { ethers } from 'ethers';

const INSURANCE_POOL_HUB_ADDRESS = '0x1553b9B1Ebad0Cb52c6D457bEB2Ee6270A3b5d98';
const AXUSD_ADDRESS = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

interface InsurancePool {
  id: string;
  name: string;
  coverageType: string;
  description: string;
  totalCoverage: string;
  availableCoverage: string;
  premiumRate: number;
  minCoverage: number;
  maxCoverage: number;
  activePolicies: number;
  totalPremiumsPaid: string;
  claimsPaid: string;
  reserves: string;
}

interface UserPolicy {
  id: string;
  poolId: string;
  coverageAmount: string;
  premiumPaid: string;
  expiryDate: string;
  status: string;
}

const POOL_ICONS: Record<string, string> = {
  'smart-contract': '🔐',
  'stablecoin-depeg': '💵',
  'liquidation-protection': '🛡️',
  'oracle-failure': '📡'
};

export default function InsurancePoolsPage() {
  const { walletState, connectMetaMask } = useWallet();
  const [loading, setLoading] = useState(true);
  const [pools, setPools] = useState<InsurancePool[]>([]);
  const [userPolicies, setUserPolicies] = useState<UserPolicy[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedPool, setSelectedPool] = useState<InsurancePool | null>(null);
  const [coverageAmount, setCoverageAmount] = useState('');
  const [durationMonths, setDurationMonths] = useState(12);
  const [txPending, setTxPending] = useState(false);
  const [txMessage, setTxMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const url = walletState?.address 
        ? `/api/phase3/insurance-pools?address=${walletState.address}`
        : '/api/phase3/insurance-pools';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setPools(data.pools);
        setUserPolicies(data.userPolicies || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching insurance pools:', err);
    } finally {
      setLoading(false);
    }
  }, [walletState?.address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculatePremium = () => {
    if (!selectedPool || !coverageAmount) return '0.00';
    const coverage = parseFloat(coverageAmount);
    const annualPremium = coverage * (selectedPool.premiumRate / 100);
    const premium = annualPremium * (durationMonths / 12);
    return premium.toFixed(2);
  };

  const handlePurchase = async () => {
    if (!walletState?.address || !selectedPool || !coverageAmount) {
      setError('Please connect wallet and enter coverage amount');
      return;
    }

    setTxPending(true);
    setError('');
    setTxMessage('');

    try {
      const response = await fetch('/api/phase3/insurance-pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          poolId: selectedPool.id,
          coverageAmount,
          durationMonths,
          address: walletState.address
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.kycRequired) {
          setError('KYC verification required. Please complete verification before purchasing insurance.');
          return;
        }
        throw new Error(data.error || 'Transaction failed');
      }

      if (data.requiresApproval && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        
        const premium = calculatePremium();
        const premiumWei = ethers.parseEther(premium);
        
        const tokenContract = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(walletState.address, data.contractAddress);

        if (allowance < premiumWei) {
          setTxMessage('Approving AXUSD spend...');
          const approveTx = await tokenContract.approve(data.contractAddress, premiumWei);
          await approveTx.wait();
        }
      }

      setTxMessage('Insurance policy purchase prepared. Sign with your wallet to complete.');
      
      await fetchData();
      setCoverageAmount('');
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setTxPending(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Axiom Insurance Pools
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Protect your DeFi positions with community-backed insurance. 
              Coverage for smart contract risks, stablecoin depegs, liquidations, and oracle failures.
            </p>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Total Coverage</p>
                <p className="text-2xl font-bold text-blue-400">${(parseFloat(stats.totalCoverage) / 1000000).toFixed(1)}M</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Total Reserves</p>
                <p className="text-2xl font-bold text-green-400">${parseFloat(stats.totalReserves).toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Active Policies</p>
                <p className="text-2xl font-bold text-purple-400">{stats.activePolicies}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Claim Ratio</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.claimRatio}%</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Coverage Options</h2>
              <div className="space-y-4">
                {pools.map((pool) => (
                  <div
                    key={pool.id}
                    onClick={() => setSelectedPool(pool)}
                    className={`bg-gray-900 border rounded-xl p-5 cursor-pointer transition-all ${
                      selectedPool?.id === pool.id
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{POOL_ICONS[pool.id] || '🔒'}</span>
                        <div>
                          <h3 className="font-semibold text-lg">{pool.name}</h3>
                          <span className="text-sm text-blue-400">{pool.coverageType}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                        {pool.premiumRate}% APR
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{pool.description}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm border-t border-gray-800 pt-3">
                      <div>
                        <p className="text-gray-400">Available</p>
                        <p className="font-medium">${(parseFloat(pool.availableCoverage) / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Min Coverage</p>
                        <p className="font-medium">${pool.minCoverage.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Max Coverage</p>
                        <p className="font-medium">${pool.maxCoverage.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Purchase Coverage</h2>
              
              {!walletState?.address ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-400 mb-4">Connect your wallet to purchase insurance</p>
                  <button
                    onClick={connectMetaMask}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : selectedPool ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
                    <span className="text-3xl">{POOL_ICONS[selectedPool.id] || '🔒'}</span>
                    <div>
                      <h3 className="font-semibold">{selectedPool.name}</h3>
                      <p className="text-sm text-gray-400">{selectedPool.premiumRate}% annual premium</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Coverage Amount (AXUSD)</label>
                      <input
                        type="number"
                        value={coverageAmount}
                        onChange={(e) => setCoverageAmount(e.target.value)}
                        placeholder={`Min: $${selectedPool.minCoverage.toLocaleString()}`}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Coverage Duration</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[3, 6, 12, 24].map((months) => (
                          <button
                            key={months}
                            onClick={() => setDurationMonths(months)}
                            className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                              durationMonths === months
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            {months}mo
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Premium Cost</span>
                        <span className="text-2xl font-bold text-blue-400">${calculatePremium()} AXUSD</span>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                      </div>
                    )}

                    {txMessage && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                        {txMessage}
                      </div>
                    )}

                    <button
                      onClick={handlePurchase}
                      disabled={txPending || !coverageAmount}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors"
                    >
                      {txPending ? 'Processing...' : 'Purchase Coverage'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-400">Select a coverage type to purchase insurance</p>
                </div>
              )}

              {userPolicies.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Your Policies</h3>
                  <div className="space-y-3">
                    {userPolicies.map((policy) => (
                      <div key={policy.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium capitalize">{policy.poolId.replace('-', ' ')}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            policy.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {policy.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Coverage</p>
                            <p>${parseFloat(policy.coverageAmount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Expires</p>
                            <p>{policy.expiryDate}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Contract: {INSURANCE_POOL_HUB_ADDRESS}</p>
            <a 
              href={`https://arbitrum.blockscout.com/address/${INSURANCE_POOL_HUB_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              View on Blockscout
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
