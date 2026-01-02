import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

const AXM_CONTRACT = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';

export default function BuyAXMPage() {
  const { walletState, connectMetaMask } = useWallet();
  const [selectedMethod, setSelectedMethod] = useState(null);
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

  const copyContract = () => {
    navigator.clipboard.writeText(AXM_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

          <div className="grid md:grid-cols-2 gap-6 mb-8">
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
                  <span className="text-green-400">✓</span> No signup required
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-green-400">✓</span> Instant swaps
                </li>
              </ul>
            </div>

            <div 
              onClick={() => setSelectedMethod('buy-crypto')}
              className={`bg-gray-800 rounded-2xl p-6 border-2 cursor-pointer transition-all hover:border-orange-500/50 relative ${
                selectedMethod === 'buy-crypto' ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-gray-700'
              }`}
            >
              <div className="absolute -top-3 left-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                NEW TO CRYPTO?
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Buy with Card</h3>
                  <p className="text-orange-400 text-sm font-medium">Via MetaMask</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4 text-sm">
                Buy ETH directly in MetaMask with your card, then swap for AXM.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">✓</span> Credit/Debit cards
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">✓</span> Apple Pay, PayPal
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

          {selectedMethod === 'buy-crypto' && (
            <div className="bg-gray-800 rounded-2xl p-8 border border-orange-500/30">
              <h3 className="text-xl font-bold text-white mb-2">Buy Crypto in MetaMask</h3>
              <p className="text-gray-400 mb-6">Follow these simple steps to get AXM tokens</p>

              <div className="space-y-4">
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Open MetaMask & Click "Buy"</h4>
                      <p className="text-gray-400 text-sm mb-3">
                        In your MetaMask wallet, tap the "Buy & Sell" or "Buy" button
                      </p>
                      <div className="bg-gray-800 rounded-lg p-3 text-sm">
                        <p className="text-gray-300">
                          <span className="text-orange-400">Tip:</span> MetaMask compares prices from multiple providers (Transak, MoonPay, Coinbase, etc.) to get you the best rate
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Select Network & Token</h4>
                      <p className="text-gray-400 text-sm mb-3">
                        Choose <span className="text-white font-medium">Arbitrum One</span> as the network and <span className="text-white font-medium">ETH</span> as the token
                      </p>
                      <div className="flex gap-2">
                        <span className="bg-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full">Arbitrum One</span>
                        <span className="bg-purple-500/20 text-purple-400 text-xs px-3 py-1 rounded-full">ETH</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Complete Purchase</h4>
                      <p className="text-gray-400 text-sm mb-3">
                        Enter amount, choose payment method (card, Apple Pay, bank), and complete the purchase
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">💳 Credit/Debit</span>
                        <span className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full"> Apple Pay</span>
                        <span className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">🏦 Bank Transfer</span>
                        <span className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">PayPal</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-5 border border-yellow-500/30">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold shrink-0">
                      4
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Swap ETH for AXM</h4>
                      <p className="text-gray-400 text-sm mb-3">
                        Once you have ETH, come back here and swap it for AXM on our DEX
                      </p>
                      <Link
                        href="/dex?to=AXM"
                        className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg text-sm"
                      >
                        Go to Axiom DEX
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-orange-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-orange-200 font-medium mb-1">Don't have MetaMask?</p>
                    <p className="text-gray-400 text-sm">
                      Download it free at{' '}
                      <a 
                        href="https://metamask.io/download/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:underline"
                      >
                        metamask.io/download
                      </a>
                    </p>
                  </div>
                </div>
              </div>
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
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-xs truncate">{AXM_CONTRACT}</span>
                  <button
                    onClick={copyContract}
                    className="text-yellow-500 hover:text-yellow-400 text-xs shrink-0"
                  >
                    Copy
                  </button>
                </div>
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
