import { useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

const AXM_CONTRACT = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';

export default function BuyAXMPage() {
  const { walletState, connectMetaMask } = useWallet();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [fiatAmount, setFiatAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const isConnected = walletState.isConnected;
  const walletAddress = walletState.address;

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openCoinbaseOnramp = useCallback(async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onramp/buy-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          paymentAmount: fiatAmount,
          paymentCurrency: 'USD',
          purchaseCurrency: 'ETH',
          purchaseNetwork: 'arbitrum',
          country: 'US'
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data.onramp_url) {
        window.open(data.onramp_url, '_blank', 'noopener,noreferrer');
      } else {
        const params = new URLSearchParams({
          appId: process.env.NEXT_PUBLIC_COINBASE_PROJECT_ID || 'axiom-nexus',
          destinationWallets: JSON.stringify([{
            address: walletAddress,
            blockchains: ['arbitrum'],
            assets: ['ETH', 'USDC']
          }]),
          presetFiatAmount: fiatAmount,
          fiatCurrency: 'USD',
          defaultNetwork: 'arbitrum'
        });
        
        window.open(`https://pay.coinbase.com/buy/select-asset?${params.toString()}`, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Coinbase Onramp error:', err);
      setError('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, fiatAmount]);

  const openMoonPay = () => {
    const params = new URLSearchParams({
      currencyCode: 'eth_arbitrum',
      walletAddress: walletAddress || '',
      baseCurrencyAmount: fiatAmount,
      baseCurrencyCode: 'usd',
      colorCode: '%23EAB308',
      language: 'en'
    });
    
    const moonpayUrl = `https://www.moonpay.com/buy/eth?${params.toString()}`;
    window.open(moonpayUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Layout>
      <Head>
        <title>Buy AXM | Axiom Protocol</title>
        <meta name="description" content="Buy Axiom (AXM) tokens - multiple options available" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-500 text-sm px-4 py-2 rounded-full mb-4">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              Get AXM Tokens
            </div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-3">
              Buy AXM Tokens
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto">
              Choose the option that works best for you. Already have crypto? Go straight to our DEX!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div 
              onClick={() => setSelectedMethod('dex')}
              className={`bg-gray-800 rounded-2xl p-6 border-2 cursor-pointer transition-all hover:border-yellow-500/50 ${
                selectedMethod === 'dex' ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-gray-700'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Swap on DEX</h3>
                  <p className="text-green-400 text-sm font-medium">Best Rates</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4 text-sm">
                Already have ETH or USDC? Swap directly for AXM on our DEX.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-green-400">✓</span> No signup
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-green-400">✓</span> Instant swaps
                </li>
              </ul>
            </div>

            <div 
              onClick={() => setSelectedMethod('coinbase')}
              className={`bg-gray-800 rounded-2xl p-6 border-2 cursor-pointer transition-all hover:border-blue-500/50 relative ${
                selectedMethod === 'coinbase' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700'
              }`}
            >
              <div className="absolute -top-3 left-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                RECOMMENDED
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Coinbase</h3>
                  <p className="text-blue-400 text-sm font-medium">Buy with Card</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4 text-sm">
                Buy ETH instantly with your card via Coinbase, then swap for AXM.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-blue-400">✓</span> Trusted platform
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-blue-400">✓</span> Instant delivery
                </li>
              </ul>
            </div>

            <div 
              onClick={() => setSelectedMethod('moonpay')}
              className={`bg-gray-800 rounded-2xl p-6 border-2 cursor-pointer transition-all hover:border-purple-500/50 ${
                selectedMethod === 'moonpay' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-gray-700'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">MoonPay</h3>
                  <p className="text-purple-400 text-sm font-medium">Alternative</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4 text-sm">
                Another option to buy crypto with card or bank transfer.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-purple-400">✓</span> Global coverage
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-purple-400">✓</span> Multiple methods
                </li>
              </ul>
            </div>
          </div>

          {selectedMethod === 'dex' && (
            <div className="bg-gray-800 rounded-2xl p-8 border border-yellow-500/30">
              <h3 className="text-xl font-bold text-white mb-6">Swap for AXM</h3>
              
              {!isConnected ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-4">Connect your wallet to see your balances</p>
                  <button
                    onClick={connectMetaMask}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-6 py-3 rounded-xl"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-xl p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Your wallet</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                        <button
                          onClick={copyAddress}
                          className="text-xs text-yellow-500 hover:text-yellow-400"
                          title="Copy full address"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Network</span>
                      <span className="text-white">Arbitrum One</span>
                    </div>
                  </div>

                  <Link
                    href="/dex?to=AXM"
                    className="block w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-4 rounded-xl text-center hover:from-yellow-400 hover:to-yellow-500 transition-all"
                  >
                    Go to Axiom DEX
                  </Link>

                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <span>Or use external DEX:</span>
                    <a 
                      href={`https://app.uniswap.org/#/swap?chain=arbitrum&outputCurrency=${AXM_CONTRACT}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-400 hover:underline"
                    >
                      Uniswap
                    </a>
                    <a 
                      href={`https://app.camelot.exchange/?token2=${AXM_CONTRACT}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:underline"
                    >
                      Camelot
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedMethod === 'coinbase' && (
            <div className="bg-gray-800 rounded-2xl p-8 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">Buy with Coinbase</h3>
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">Powered by Coinbase</span>
              </div>
              <p className="text-gray-400 mb-6">Purchase ETH via Coinbase, then swap for AXM on our DEX</p>

              {!isConnected ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-4">Connect your wallet first</p>
                  <button
                    onClick={connectMetaMask}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-6 py-3 rounded-xl"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={fiatAmount}
                        onChange={(e) => setFiatAmount(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-8 pr-4 text-white text-lg focus:outline-none focus:border-blue-500"
                        placeholder="100"
                        min="30"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {['50', '100', '250', '500'].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setFiatAmount(amt)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            fiatAmount === amt 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Destination wallet</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                        <button
                          onClick={copyAddress}
                          className="text-xs text-yellow-500 hover:text-yellow-400"
                          title="Copy full address"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">You'll receive</span>
                      <span className="text-white">ETH on Arbitrum</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Next step</span>
                      <span className="text-yellow-400">Swap ETH → AXM</span>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={openCoinbaseOnramp}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 rounded-xl hover:from-blue-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue with Coinbase</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2 justify-center text-gray-500 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Self-custody - Funds go directly to your wallet</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedMethod === 'moonpay' && (
            <div className="bg-gray-800 rounded-2xl p-8 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-2">Buy Crypto with MoonPay</h3>
              <p className="text-gray-400 mb-6">Purchase ETH via MoonPay, then swap for AXM</p>

              {!isConnected ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-4">Connect your wallet first</p>
                  <button
                    onClick={connectMetaMask}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-6 py-3 rounded-xl"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={fiatAmount}
                        onChange={(e) => setFiatAmount(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-8 pr-4 text-white text-lg focus:outline-none focus:border-purple-500"
                        placeholder="100"
                        min="30"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {['50', '100', '250', '500'].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setFiatAmount(amt)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            fiatAmount === amt 
                              ? 'bg-purple-500 text-white' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Destination wallet</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                        <button
                          onClick={copyAddress}
                          className="text-xs text-yellow-500 hover:text-yellow-400"
                          title="Copy full address"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">You'll receive</span>
                      <span className="text-white">ETH on Arbitrum</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Next step</span>
                      <span className="text-yellow-400">Swap ETH → AXM</span>
                    </div>
                  </div>

                  <button
                    onClick={openMoonPay}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-4 rounded-xl hover:from-purple-400 hover:to-purple-500 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Continue to MoonPay</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>

                  <p className="text-center text-gray-500 text-sm">
                    After buying ETH, return here to swap for AXM
                  </p>
                </div>
              )}
            </div>
          )}

          {!selectedMethod && (
            <div className="text-center text-gray-500 py-8">
              <p>Select an option above to get started</p>
            </div>
          )}

          <div className="mt-8 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="font-medium text-white mb-3">About AXM Token</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="text-gray-400 mb-1">Contract Address</div>
                <div className="text-white font-mono text-xs break-all">{AXM_CONTRACT}</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="text-gray-400 mb-1">Network</div>
                <div className="text-white">Arbitrum One</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="text-gray-400 mb-1">Use Cases</div>
                <div className="text-white">Staking, Governance, SUSU</div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-200 font-medium mb-1">Self-Custody Model</p>
                <p className="text-gray-400 text-sm">
                  Axiom is a non-custodial DeFi protocol. All funds are delivered directly to your wallet - we never hold or control your assets. Not a bank. No FDIC insurance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
