import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { useWallet } from '../../components/WalletConnect/WalletContext';
import { V2_SOVEREIGN_BANKING_CONTRACTS } from '../../shared/contracts';

interface ContractStatus {
  name: string;
  address: string;
  status: 'active' | 'paused' | 'unknown';
  lastActivity?: string;
}

const V2_CONTRACTS: ContractStatus[] = [
  { name: 'AxiomScoreSBT', address: V2_SOVEREIGN_BANKING_CONTRACTS.AXIOM_SCORE_SBT, status: 'active' },
  { name: 'SusuInsuranceFund', address: V2_SOVEREIGN_BANKING_CONTRACTS.SUSU_INSURANCE_FUND, status: 'active' },
  { name: 'veAXM', address: V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM, status: 'active' },
  { name: 'AxiomFeeBurner', address: V2_SOVEREIGN_BANKING_CONTRACTS.AXIOM_FEE_BURNER, status: 'active' }
];

const ADMIN_ADDRESS = '0xDFf9e47eb007bF02e47477d577De9ffA99791528';

export default function V2ManagementPage() {
  const { walletState } = useWallet();
  const [contracts, setContracts] = useState<ContractStatus[]>(V2_CONTRACTS);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([]);

  useEffect(() => {
    if (walletState.address) {
      setIsAdmin(walletState.address.toLowerCase() === ADMIN_ADDRESS.toLowerCase());
    }
  }, [walletState.address]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActionLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const handlePauseContract = async (contractName: string) => {
    addLog(`Pause request for ${contractName} - requires multisig approval`);
  };

  const handleUpdateThreshold = async (contractName: string, newValue: string) => {
    addLog(`Threshold update for ${contractName}: ${newValue} - pending approval`);
  };

  if (!walletState.isConnected) {
    return (
      <Layout showWallet={true}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔐</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
            <p className="text-gray-400">Connect an authorized wallet to access V2 management</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout showWallet={true}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⛔</span>
            </div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
            <p className="text-gray-400">This wallet does not have admin privileges</p>
            <p className="text-gray-500 text-sm mt-2 font-mono">{walletState.address}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>V2 Contract Management | Axiom Admin</title>
      </Head>

      <Layout showWallet={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">V2 Contract Management</h1>
                <p className="text-gray-400">Admin panel for AIP-001 Sovereign Banking contracts</p>
              </div>
              <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                Admin Access
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {contracts.map(contract => (
                <div key={contract.name} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{contract.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      contract.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      contract.status === 'paused' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {contract.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-400 mb-1">Contract Address</p>
                    <code className="text-sm text-yellow-400 break-all">{contract.address}</code>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePauseContract(contract.name)}
                      className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all"
                    >
                      {contract.status === 'paused' ? 'Unpause' : 'Pause'}
                    </button>
                    <a
                      href={`https://arbiscan.io/address/${contract.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-all text-center"
                    >
                      View on Explorer
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Fee Burner Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Buyback Threshold (AXM)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        defaultValue="1000"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      />
                      <button
                        onClick={() => handleUpdateThreshold('AxiomFeeBurner', '1000')}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-medium"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Fee Rate (BPS)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        defaultValue="50"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      />
                      <button
                        onClick={() => handleUpdateThreshold('AxiomFeeBurner', '50 BPS')}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-medium"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Insurance Fund Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Diversion Rate (BPS)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        defaultValue="500"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      />
                      <button
                        onClick={() => handleUpdateThreshold('SusuInsuranceFund', '500 BPS')}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-medium"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Max Payout Per Claim (%)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        defaultValue="80"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      />
                      <button
                        onClick={() => handleUpdateThreshold('SusuInsuranceFund', '80%')}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-medium"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Action Log</h3>
              <div className="bg-gray-900 rounded-lg p-4 h-48 overflow-y-auto font-mono text-sm">
                {actionLog.length === 0 ? (
                  <p className="text-gray-500">No actions recorded yet</p>
                ) : (
                  actionLog.map((log, i) => (
                    <p key={i} className="text-gray-400 mb-1">{log}</p>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
