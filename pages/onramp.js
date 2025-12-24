/**
 * Onramp Center - Multi-provider fiat-to-crypto purchase page
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import OnrampProviderCard from '../components/OnrampProviderCard';
import OnrampWalletPanel from '../components/OnrampWalletPanel';
import OnrampDisclosure from '../components/OnrampDisclosure';
import { useWallet } from '../components/WalletConnect/WalletContext';

export default function OnrampPage() {
  const router = useRouter();
  const { walletState } = useWallet();
  
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState(42161);
  const [selectedAsset, setSelectedAsset] = useState('ETH');
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [fiatAmount, setFiatAmount] = useState('100');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [intentId, setIntentId] = useState(null);
  const [purchaseStatus, setPurchaseStatus] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (router.query.status === 'completed' && router.query.provider) {
      setPurchaseStatus({
        status: 'completed',
        provider: router.query.provider,
        message: 'Purchase initiated! Tokens will be delivered to your wallet shortly.'
      });
    }
  }, [router.query]);

  useEffect(() => {
    if (walletState.address) {
      setWalletAddress(walletState.address);
    }
  }, [walletState.address]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/onramp/config');
      if (!res.ok) throw new Error('Failed to load configuration');
      const data = await res.json();
      setConfig(data);
      
      if (data.defaultChainId) setSelectedChain(data.defaultChainId);
      if (data.defaultAsset) setSelectedAsset(data.defaultAsset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPurchase = async () => {
    if (!selectedProvider || !walletAddress || !fiatAmount) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/onramp/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          provider: selectedProvider,
          chainId: selectedChain,
          asset: selectedAsset,
          fiatCurrency,
          fiatAmount: parseFloat(fiatAmount)
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create purchase intent');
      }

      const data = await res.json();
      setIntentId(data.intentId);

      if (data.widgetUrl) {
        window.open(data.widgetUrl, '_blank', 'noopener,noreferrer');
        setPurchaseStatus({
          status: 'pending',
          provider: selectedProvider,
          message: 'Provider window opened. Complete your purchase there.'
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!intentId) return;

    try {
      await fetch('/api/onramp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId,
          status: 'completed'
        })
      });

      setPurchaseStatus({
        status: 'completed',
        provider: selectedProvider,
        message: 'Great! Your tokens should arrive in your wallet shortly.'
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const isFormValid = selectedProvider && walletAddress && fiatAmount && parseFloat(fiatAmount) > 0;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading Onramp Center...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !config) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={fetchConfig} className="text-yellow-500 hover:underline">
              Try again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const providers = config?.providers ? Object.values(config.providers) : [];
  const hasAnyProvider = providers.some(p => p.enabled);

  return (
    <Layout>
      <Head>
        <title>Get Axiom Units | Onramp Center</title>
        <meta name="description" content="Buy tokens or stablecoins using fiat currency through trusted providers" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-block bg-gray-800 text-yellow-500 text-sm px-3 py-1 rounded-full mb-4">
              Fiat-to-Crypto Gateway
            </div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-3">
              Get Axiom Units
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Choose a provider to buy tokens or stablecoins and use them inside Axiom and The Wealth Practice
            </p>
          </div>

          <OnrampDisclosure />

          {purchaseStatus && (
            <div className={`mt-6 p-4 rounded-xl border ${
              purchaseStatus.status === 'completed' 
                ? 'bg-green-900/30 border-green-500/50' 
                : 'bg-yellow-900/30 border-yellow-500/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {purchaseStatus.status === 'completed' ? (
                    <span className="text-green-400 text-2xl">✅</span>
                  ) : (
                    <span className="text-yellow-400 text-2xl">⏳</span>
                  )}
                  <div>
                    <p className="text-white font-medium">{purchaseStatus.message}</p>
                    <p className="text-sm text-gray-400">Provider: {purchaseStatus.provider}</p>
                  </div>
                </div>
                {purchaseStatus.status === 'pending' && (
                  <button
                    onClick={handleMarkCompleted}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    I completed the purchase
                  </button>
                )}
              </div>

              {purchaseStatus.status === 'completed' && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-400 mb-3">Next Steps:</p>
                  <div className="flex flex-wrap gap-3">
                    <Link 
                      href="/wealth-practice" 
                      className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Join The Wealth Practice
                    </Link>
                    <Link 
                      href="/susu" 
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Explore SUSU Groups
                    </Link>
                    <a 
                      href="mailto:support@axiom.city" 
                      className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
                    >
                      Need help? Contact support
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasAnyProvider ? (
            <div className="mt-8 bg-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400 mb-4">
                No onramp providers are currently configured. Please contact support for assistance.
              </p>
              <a 
                href="mailto:support@axiom.city" 
                className="text-yellow-500 hover:underline"
              >
                Contact Support
              </a>
            </div>
          ) : (
            <div className="mt-8 grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">1. Select Provider</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {providers.map(provider => (
                      <OnrampProviderCard
                        key={provider.id}
                        provider={provider}
                        selected={selectedProvider === provider.id}
                        onSelect={setSelectedProvider}
                        disabled={isProcessing}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">2. Configure Purchase</h2>
                  <OnrampWalletPanel
                    config={config}
                    walletAddress={walletAddress}
                    setWalletAddress={setWalletAddress}
                    selectedChain={selectedChain}
                    setSelectedChain={setSelectedChain}
                    selectedAsset={selectedAsset}
                    setSelectedAsset={setSelectedAsset}
                    fiatCurrency={fiatCurrency}
                    setFiatCurrency={setFiatCurrency}
                    fiatAmount={fiatAmount}
                    setFiatAmount={setFiatAmount}
                  />
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Purchase Summary</h3>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Provider</span>
                        <span className="text-white">
                          {selectedProvider 
                            ? providers.find(p => p.id === selectedProvider)?.name || selectedProvider
                            : 'Not selected'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Amount</span>
                        <span className="text-white">{fiatAmount || '0'} {fiatCurrency}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Asset</span>
                        <span className="text-white">{selectedAsset}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Network</span>
                        <span className="text-white">
                          {selectedChain === 42161 ? 'Arbitrum One' : `Chain ${selectedChain}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Wallet</span>
                        <span className="text-white font-mono text-xs truncate max-w-[150px]">
                          {walletAddress || 'Not set'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleStartPurchase}
                      disabled={!isFormValid || isProcessing}
                      className={`w-full py-3 rounded-lg font-semibold transition-all ${
                        isFormValid && !isProcessing
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                          Processing...
                        </span>
                      ) : (
                        'Start Purchase'
                      )}
                    </button>

                    <p className="text-xs text-gray-500 text-center mt-3">
                      Opens provider in new tab
                    </p>
                  </div>

                  <OnrampDisclosure compact className="mt-4" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
