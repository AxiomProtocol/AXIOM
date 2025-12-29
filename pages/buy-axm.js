import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

const AXM_CONTRACT = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

export default function BuyAXMPage() {
  const { walletState, connectMetaMask } = useWallet();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [fiatAmount, setFiatAmount] = useState('100');

  const isConnected = walletState.isConnected;
  const walletAddress = walletState.address;

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
                  <h3 className="text-xl font-bold text-white">Swap on Axiom DEX</h3>
                  <p className="text-green-400 text-sm font-medium">Recommended</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4">
                Already have ETH or USDC? Swap directly for AXM on our decentralized exchange with the best rates.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-green-400">✓</span> No signup required
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-green-400">✓</span> Instant swaps
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-green-400">✓</span> Best AXM prices
                </li>
              </ul>
            </div>

            <div 
              onClick={() => setSelectedMethod('fiat')}
              className={`bg-gray-800 rounded-2xl p-6 border-2 cursor-pointer transition-all hover:border-yellow-500/50 ${
                selectedMethod === 'fiat' ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-gray-700'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Buy with Card</h3>
                  <p className="text-purple-400 text-sm font-medium">via MoonPay</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4">
                New to crypto? Buy ETH with your credit card, then swap for AXM on our DEX.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-purple-400">✓</span> Credit/Debit cards
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-purple-400">✓</span> Bank transfers
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span className="text-purple-400">✓</span> Apple Pay / Google Pay
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
                      <span className="text-white font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
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
                    Go to Axiom DEX →
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

          {selectedMethod === 'fiat' && (
            <div className="bg-gray-800 rounded-2xl p-8 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-2">Buy Crypto with Card</h3>
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
                      <span className="text-white font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
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
              <p>👆 Select an option above to get started</p>
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

          <div className="mt-6 bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <span className="text-yellow-500 text-xl">💡</span>
              <div>
                <p className="text-yellow-200 font-medium mb-1">Pro Tip</p>
                <p className="text-gray-400 text-sm">
                  Already have ETH or USDC? Skip the card purchase and go straight to our DEX for the fastest AXM acquisition!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
