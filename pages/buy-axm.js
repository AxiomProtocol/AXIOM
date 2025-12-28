import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

const STEPS = [
  { id: 1, title: 'Get Funds', description: 'Buy ETH or USDC with your card' },
  { id: 2, title: 'Swap for AXM', description: 'Exchange for Axiom tokens' }
];

export default function BuyAXMPage() {
  const { walletState, connectMetaMask } = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState('ETH');
  const [fiatAmount, setFiatAmount] = useState('100');
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isConnected = walletState.isConnected;
  const walletAddress = walletState.address;

  const handleStartPurchase = async () => {
    if (!walletAddress) {
      await connectMetaMask();
      return;
    }

    setIsProcessing(true);
    try {
      const tokenRes = await fetch('/api/onramp/session-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          assets: [selectedAsset, 'ETH', 'USDC'],
          networks: ['arbitrum']
        })
      });

      const tokenData = await tokenRes.json();
      
      if (tokenData.token) {
        const url = `https://pay.coinbase.com/buy/select-asset?sessionToken=${tokenData.token}&defaultAsset=${selectedAsset}&presetFiatAmount=${fiatAmount}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        setPurchaseComplete(true);
      } else {
        const res = await fetch('/api/onramp/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            provider: 'coinbase',
            chainId: 42161,
            asset: selectedAsset,
            fiatCurrency: 'USD',
            fiatAmount: parseFloat(fiatAmount)
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.widgetUrl) {
            window.open(data.widgetUrl, '_blank', 'noopener,noreferrer');
            setPurchaseComplete(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to start purchase:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPurchase = () => {
    setCurrentStep(2);
  };

  return (
    <Layout>
      <Head>
        <title>Buy AXM | Axiom Protocol</title>
        <meta name="description" content="Buy Axiom (AXM) tokens with your credit card" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-500 text-sm px-4 py-2 rounded-full mb-4">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              Two Simple Steps
            </div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-3">
              Buy AXM Tokens
            </h1>
            <p className="text-gray-400">
              Purchase Axiom tokens using your credit card in just two steps
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${
                    currentStep === step.id 
                      ? 'bg-yellow-500 text-black' 
                      : currentStep > step.id 
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-800 text-gray-400'
                  }`}>
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-black/20 text-sm font-bold">
                      {currentStep > step.id ? '✓' : step.id}
                    </span>
                    <span className="font-medium">{step.title}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-12 h-1 mx-2 rounded ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {currentStep === 1 && (
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Step 1: Buy {selectedAsset} with Coinbase</h2>
                  <p className="text-gray-400 text-sm">Purchase crypto that you'll swap for AXM</p>
                </div>
              </div>

              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Connect your wallet to continue</p>
                  <button
                    onClick={connectMetaMask}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-6 py-3 rounded-xl"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : !purchaseComplete ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Select what to buy</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['ETH', 'USDC'].map(asset => (
                        <button
                          key={asset}
                          onClick={() => setSelectedAsset(asset)}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            selectedAsset === asset
                              ? 'border-yellow-500 bg-yellow-500/10'
                              : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                          }`}
                        >
                          <div className="font-semibold text-white">{asset}</div>
                          <div className="text-sm text-gray-400">
                            {asset === 'ETH' ? 'Ethereum' : 'USD Coin'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={fiatAmount}
                        onChange={(e) => setFiatAmount(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-8 pr-4 text-white text-lg focus:outline-none focus:border-yellow-500"
                        placeholder="100"
                        min="10"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {['50', '100', '250', '500'].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setFiatAmount(amt)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            fiatAmount === amt 
                              ? 'bg-yellow-500 text-black' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Your wallet</span>
                      <span className="text-white font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Network</span>
                      <span className="text-white">Arbitrum One</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Provider</span>
                      <span className="text-white">Coinbase</span>
                    </div>
                  </div>

                  <button
                    onClick={handleStartPurchase}
                    disabled={isProcessing || !fiatAmount}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-4 rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? 'Opening Coinbase...' : `Buy $${fiatAmount} of ${selectedAsset}`}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-400 text-3xl">✓</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Coinbase window opened!</h3>
                  <p className="text-gray-400 mb-6">
                    Complete your purchase in the Coinbase window, then click below to continue.
                  </p>
                  <button
                    onClick={handleConfirmPurchase}
                    className="bg-green-500 hover:bg-green-400 text-white font-semibold px-8 py-3 rounded-xl"
                  >
                    I've completed my purchase → Continue to Step 2
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                  <span className="text-black font-bold text-xl">A</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Step 2: Swap for AXM</h2>
                  <p className="text-gray-400 text-sm">Exchange your {selectedAsset} for Axiom tokens</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl p-6 mb-6 border border-yellow-500/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-black font-bold">💡</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Ready to swap!</h3>
                    <p className="text-gray-400 text-sm">Your {selectedAsset} should arrive in your wallet within a few minutes</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Link
                  href={`/dex?from=${selectedAsset}&to=AXM`}
                  className="block w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-4 rounded-xl text-center hover:from-yellow-400 hover:to-yellow-500 transition-all"
                >
                  Go to Axiom DEX to Swap {selectedAsset} → AXM
                </Link>

                <div className="text-center">
                  <p className="text-gray-500 text-sm">
                    Or swap on{' '}
                    <a 
                      href={`https://app.uniswap.org/#/swap?chain=arbitrum&inputCurrency=${selectedAsset === 'USDC' ? '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' : 'ETH'}&outputCurrency=0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-500 hover:underline"
                    >
                      Uniswap
                    </a>
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-700">
                <h4 className="font-medium text-white mb-3">About AXM Token</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-900 rounded-lg p-3">
                    <div className="text-gray-400">Contract</div>
                    <div className="text-white font-mono text-xs break-all">0x864F...39D</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3">
                    <div className="text-gray-400">Network</div>
                    <div className="text-white">Arbitrum One</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="font-medium text-white mb-3">Important Information</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                <span>Coinbase handles all payment processing and identity verification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                <span>Crypto purchases typically arrive within 1-5 minutes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                <span>AXM can be staked for rewards or used in SUSU savings circles</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                <span>Always verify the AXM contract address before swapping</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
