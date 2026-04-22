import { useState, useEffect } from 'react';
import { WalletConnectButton } from '../components/WalletConnect/WalletConnectButton';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { walletService } from '../lib/services/WalletService';
import { delegationService } from '../lib/services/DelegationService';
import { ethers } from 'ethers';

export default function WalletDemoPage() {
  const { walletState, connectMetaMask, connectInjected, disconnect } = useWallet();
  const [txHistory, setTxHistory] = useState([]);
  const [votingPower, setVotingPower] = useState(null);
  const [testMessage, setTestMessage] = useState('');
  const [signedMessage, setSignedMessage] = useState('');

  useEffect(() => {
    if (walletState.isConnected && walletState.address) {
      loadVotingPower();
    }
  }, [walletState.address, walletState.isConnected]);

  const loadVotingPower = async () => {
    if (!walletState.address) return;
    
    try {
      const power = await delegationService.getVotingPower(walletState.address);
      setVotingPower(power);
    } catch (error) {
      console.error('Failed to load voting power:', error);
    }
  };

  const handleSignMessage = async () => {
    if (!testMessage) {
      alert('Please enter a message to sign');
      return;
    }

    try {
      const signature = await walletService.signMessage(testMessage);
      setSignedMessage(signature);
      addToHistory('Message signed', signature.substring(0, 20) + '...');
    } catch (error) {
      console.error('Failed to sign message:', error);
      alert('Failed to sign message: ' + error.message);
    }
  };

  const handleSwitchToArbitrum = async () => {
    try {
      await walletService.switchToArbitrum();
      addToHistory('Switched to Arbitrum One', 'Chain ID: 42161');
    } catch (error) {
      console.error('Failed to switch network:', error);
      alert('Failed to switch network: ' + error.message);
    }
  };

  const addToHistory = (action, details) => {
    setTxHistory(prev => [
      { action, details, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9)
    ]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <header className="border-b border-yellow-500/30 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                🔧 WALLET SYSTEM DEMO
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Test all wallet features - Arbitrum One
              </p>
            </div>
            <WalletConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!walletState.isConnected ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🦊</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Connect Your Wallet to Start Testing
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              This demo page shows all wallet system features
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={connectMetaMask}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-yellow-500/50 transition-all"
              >
                🦊 Connect MetaMask
              </button>
              <button
                onClick={connectInjected}
                className="bg-white/10 text-white font-bold px-8 py-3 rounded-xl border border-white/30 hover:bg-white/20 transition-all"
              >
                🔗 Connect Other Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                  📊 Wallet State
                </h2>
                <div className="space-y-3">
                  <InfoRow label="Provider" value={walletState.provider || 'None'} />
                  <InfoRow label="Address" value={walletState.address || 'Not connected'} mono />
                  <InfoRow 
                    label="Chain ID" 
                    value={walletState.chainId === 42161 ? '42161 (Arbitrum One) ✅' : `${walletState.chainId} ⚠️`} 
                  />
                  <InfoRow label="Connected" value={walletState.isConnected ? 'Yes ✅' : 'No ❌'} />
                  <InfoRow label="ETH Balance" value={`${parseFloat(walletState.balance).toFixed(6)} ETH`} />
                  <InfoRow label="AXM Balance" value={`${parseFloat(walletState.axmBalance).toLocaleString()} AXM`} />
                </div>
              </div>

              {votingPower && (
                <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold text-purple-400 mb-4">
                    🗳️ Voting Power
                  </h2>
                  <div className="space-y-3">
                    <InfoRow label="Direct Power" value={`${votingPower.direct} AXM`} />
                    <InfoRow label="Delegated To You" value={`${votingPower.delegated} AXM`} />
                    <InfoRow 
                      label="Total Voting Power" 
                      value={`${votingPower.total} AXM`}
                      highlight 
                    />
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-green-400 mb-4">
                  🔧 Actions
                </h2>
                <div className="space-y-3">
                  {walletState.chainId !== 42161 && (
                    <button
                      onClick={handleSwitchToArbitrum}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
                    >
                      🔄 Switch to Arbitrum One
                    </button>
                  )}
                  
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Enter message to sign..."
                      className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSignMessage}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 px-4 rounded-xl transition-all"
                    >
                      ✍️ Sign Message
                    </button>
                  </div>

                  {signedMessage && (
                    <div className="bg-black/50 rounded-xl p-4">
                      <div className="text-sm text-gray-400 mb-1">Signature:</div>
                      <div className="font-mono text-xs text-green-400 break-all">
                        {signedMessage}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={disconnect}
                    className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/50 font-bold py-3 px-4 rounded-xl transition-all"
                  >
                    🔌 Disconnect Wallet
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-blue-400 mb-4">
                  📜 Action History
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {txHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No actions yet. Try signing a message or switching networks.
                    </p>
                  ) : (
                    txHistory.map((item, index) => (
                      <div key={index} className="bg-black/50 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-semibold text-white">{item.action}</div>
                          <div className="text-xs text-gray-500">{item.timestamp}</div>
                        </div>
                        <div className="text-sm text-gray-400 font-mono break-all">
                          {item.details}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                  ℹ️ System Info
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="bg-black/50 rounded-xl p-4">
                    <div className="text-gray-400 mb-1">Network</div>
                    <div className="text-white font-semibold">Arbitrum One</div>
                  </div>
                  <div className="bg-black/50 rounded-xl p-4">
                    <div className="text-gray-400 mb-1">Chain ID</div>
                    <div className="text-white font-semibold">42161</div>
                  </div>
                  <div className="bg-black/50 rounded-xl p-4">
                    <div className="text-gray-400 mb-1">AXM Token</div>
                    <div className="text-white font-mono text-xs break-all">
                      0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
                    </div>
                  </div>
                  <div className="bg-black/50 rounded-xl p-4">
                    <div className="text-gray-400 mb-1">Status</div>
                    <div className="text-green-400 font-semibold">✅ All Systems Operational</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoRow({ label, value, mono = false, highlight = false }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}:</span>
      <span className={`text-sm font-semibold ${mono ? 'font-mono' : ''} ${highlight ? 'text-yellow-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
