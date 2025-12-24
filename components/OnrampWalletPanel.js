/**
 * Onramp Wallet Panel - Wallet address and configuration
 */

import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

const CHAIN_INFO = {
  42161: { id: 42161, name: 'Arbitrum One', icon: '⚡' },
  1: { id: 1, name: 'Ethereum Mainnet', icon: '💎' },
  137: { id: 137, name: 'Polygon', icon: '💜' },
  10: { id: 10, name: 'Optimism', icon: '🔴' },
  8453: { id: 8453, name: 'Base', icon: '🔵' }
};

const FIAT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }
];

function isValidEthAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export default function OnrampWalletPanel({ 
  config,
  walletAddress,
  setWalletAddress,
  selectedChain,
  setSelectedChain,
  selectedAsset,
  setSelectedAsset,
  fiatCurrency,
  setFiatCurrency,
  fiatAmount,
  setFiatAmount
}) {
  const { walletState, connectMetaMask } = useWallet();
  const [addressError, setAddressError] = useState('');
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    if (walletState.isConnected && walletState.address && !manualMode) {
      setWalletAddress(walletState.address);
      setAddressError('');
    }
  }, [walletState.isConnected, walletState.address, manualMode]);

  const handleAddressChange = (value) => {
    setWalletAddress(value);
    if (value && !isValidEthAddress(value)) {
      setAddressError('Invalid Ethereum address format');
    } else {
      setAddressError('');
    }
  };

  const supportedChains = config?.supportedChainIds?.map(id => CHAIN_INFO[id]).filter(Boolean) || [CHAIN_INFO[42161]];
  const assets = config?.assetList || [{ symbol: 'ETH', name: 'Ethereum', chainId: 42161 }];

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Destination Details</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Wallet Address</label>
          {walletState.isConnected && !manualMode ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-4 py-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-white font-mono text-sm truncate flex-1">
                  {walletState.address}
                </span>
                <button
                  onClick={() => setManualMode(true)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Change
                </button>
              </div>
              <p className="text-xs text-gray-500">Connected wallet will receive tokens</p>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="0x..."
                className={`w-full bg-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm border ${
                  addressError ? 'border-red-500' : 'border-transparent'
                } focus:border-yellow-500 focus:outline-none`}
              />
              {addressError && (
                <p className="text-xs text-red-400">{addressError}</p>
              )}
              {!walletState.isConnected && (
                <button
                  onClick={() => { connectMetaMask(); setManualMode(false); }}
                  className="text-sm text-yellow-500 hover:text-yellow-400"
                >
                  Or connect wallet
                </button>
              )}
              {manualMode && walletState.isConnected && (
                <button
                  onClick={() => { setManualMode(false); setWalletAddress(walletState.address); }}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Use connected wallet
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Network</label>
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(Number(e.target.value))}
              className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white border border-transparent focus:border-yellow-500 focus:outline-none"
            >
              {supportedChains.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.icon} {chain.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Asset</label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white border border-transparent focus:border-yellow-500 focus:outline-none"
            >
              {assets.map(asset => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol} - {asset.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Fiat Currency</label>
            <select
              value={fiatCurrency}
              onChange={(e) => setFiatCurrency(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white border border-transparent focus:border-yellow-500 focus:outline-none"
            >
              {FIAT_CURRENCIES.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Amount</label>
            <input
              type="number"
              value={fiatAmount}
              onChange={(e) => setFiatAmount(e.target.value)}
              placeholder="100"
              min="10"
              className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white border border-transparent focus:border-yellow-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
