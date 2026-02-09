import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { DesignLawLayout } from '../components/design-law';

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
    <DesignLawLayout>
      <Head>
        <title>Buy AXM | Axiom Protocol</title>
        <meta name="description" content="Buy Axiom (AXM) tokens - multiple options available" />
      </Head>

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-dl-bg-alt text-dl-navy text-sm px-4 py-2 mb-4 border border-dl-border">
            <span className="w-2 h-2 bg-dl-forest"></span>
            Get AXM Tokens
          </div>
          <h1 className="font-dl-serif text-4xl text-dl-navy mb-3">
            Buy AXM Tokens
          </h1>
          <p className="text-dl-gray max-w-xl mx-auto">
            Choose the option that works best for you. Already have crypto? Go straight to our DEX!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div 
            onClick={() => setSelectedMethod('dex')}
            className={`bg-dl-bg p-6 border-2 cursor-pointer ${
              selectedMethod === 'dex' ? 'border-dl-navy' : 'border-dl-border'
            }`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-dl-navy flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-dl-serif text-xl text-dl-navy">Swap on DEX</h3>
                <p className="text-dl-forest text-sm font-medium">Best Rates</p>
              </div>
            </div>
            <p className="text-dl-gray mb-4 text-sm">
              Already have ETH or USDC? Swap directly for AXM on our DEX.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-dl-navy">
                <span className="text-dl-forest">✓</span> No signup required
              </li>
              <li className="flex items-center gap-2 text-dl-navy">
                <span className="text-dl-forest">✓</span> Instant swaps
              </li>
            </ul>
          </div>

          <div 
            onClick={() => setSelectedMethod('buy-crypto')}
            className={`bg-dl-bg p-6 border-2 cursor-pointer relative ${
              selectedMethod === 'buy-crypto' ? 'border-dl-navy' : 'border-dl-border'
            }`}
          >
            <div className="absolute -top-3 left-4 bg-dl-navy text-white text-xs font-medium px-3 py-1">
              NEW TO CRYPTO?
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-dl-navy flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-dl-serif text-xl text-dl-navy">Buy with Card</h3>
                <p className="text-dl-navy text-sm font-medium">Via MetaMask</p>
              </div>
            </div>
            <p className="text-dl-gray mb-4 text-sm">
              Buy ETH directly in MetaMask with your card, then swap for AXM.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-dl-navy">
                <span className="text-dl-forest">✓</span> Credit/Debit cards
              </li>
              <li className="flex items-center gap-2 text-dl-navy">
                <span className="text-dl-forest">✓</span> Apple Pay, PayPal
              </li>
            </ul>
          </div>
        </div>

        {selectedMethod === 'dex' && (
          <div className="bg-dl-bg-alt border border-dl-border p-8">
            <h3 className="font-dl-serif text-xl text-dl-navy mb-6">Swap for AXM</h3>
            
            {!isConnected ? (
              <div className="text-center py-6">
                <p className="text-dl-gray mb-4">Connect your wallet to see your balances</p>
                <button
                  onClick={connectMetaMask}
                  className="px-6 py-3 bg-dl-navy text-white font-medium"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-dl-bg p-4 border border-dl-border">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-dl-gray">Your wallet</span>
                    <div className="flex items-center gap-2">
                      <span className="text-dl-navy font-dl-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                      <button
                        onClick={copyAddress}
                        className="text-xs text-dl-navy"
                        title="Copy full address"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dl-gray">Network</span>
                    <span className="text-dl-navy">Arbitrum One</span>
                  </div>
                </div>

                <Link
                  href="/dex?to=AXM"
                  className="block w-full bg-dl-navy text-white font-medium py-4 text-center"
                >
                  Go to Axiom DEX
                </Link>

                <div className="flex items-center justify-center gap-4 text-sm text-dl-gray">
                  <span>Or use external DEX:</span>
                  <a 
                    href={`https://app.uniswap.org/#/swap?chain=arbitrum&outputCurrency=${AXM_CONTRACT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dl-navy"
                  >
                    Uniswap
                  </a>
                  <a 
                    href={`https://app.camelot.exchange/?token2=${AXM_CONTRACT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dl-navy"
                  >
                    Camelot
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedMethod === 'buy-crypto' && (
          <div className="bg-dl-bg-alt border border-dl-border p-8">
            <h3 className="font-dl-serif text-xl text-dl-navy mb-2">Buy Crypto in MetaMask</h3>
            <p className="text-dl-gray mb-6">Follow these simple steps to get AXM tokens</p>

            <div className="space-y-4">
              <div className="bg-dl-bg p-5 border border-dl-border">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-dl-navy flex items-center justify-center text-white font-medium shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-dl-navy font-medium mb-2">Open MetaMask & Click "Buy"</h4>
                    <p className="text-dl-gray text-sm mb-3">
                      In your MetaMask wallet, tap the "Buy & Sell" or "Buy" button
                    </p>
                    <div className="bg-dl-bg-alt p-3 text-sm border border-dl-border">
                      <p className="text-dl-navy">
                        <span className="text-dl-forest font-medium">Tip:</span> MetaMask compares prices from multiple providers (Transak, MoonPay, Coinbase, etc.) to get you the best rate
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-dl-bg p-5 border border-dl-border">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-dl-navy flex items-center justify-center text-white font-medium shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-dl-navy font-medium mb-2">Select Network & Token</h4>
                    <p className="text-dl-gray text-sm mb-3">
                      Choose <span className="text-dl-navy font-medium">Arbitrum One</span> as the network and <span className="text-dl-navy font-medium">ETH</span> as the token
                    </p>
                    <div className="flex gap-2">
                      <span className="bg-dl-bg-alt text-dl-navy text-xs px-3 py-1 border border-dl-border font-dl-mono">Arbitrum One</span>
                      <span className="bg-dl-bg-alt text-dl-navy text-xs px-3 py-1 border border-dl-border font-dl-mono">ETH</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-dl-bg p-5 border border-dl-border">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-dl-navy flex items-center justify-center text-white font-medium shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-dl-navy font-medium mb-2">Complete Purchase</h4>
                    <p className="text-dl-gray text-sm mb-3">
                      Enter amount, choose payment method (card, Apple Pay, bank), and complete the purchase
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-dl-bg-alt text-dl-navy text-xs px-3 py-1 border border-dl-border">💳 Credit/Debit</span>
                      <span className="bg-dl-bg-alt text-dl-navy text-xs px-3 py-1 border border-dl-border"> Apple Pay</span>
                      <span className="bg-dl-bg-alt text-dl-navy text-xs px-3 py-1 border border-dl-border">🏦 Bank Transfer</span>
                      <span className="bg-dl-bg-alt text-dl-navy text-xs px-3 py-1 border border-dl-border">PayPal</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-dl-bg p-5 border border-dl-border">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-dl-navy flex items-center justify-center text-white font-medium shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="text-dl-navy font-medium mb-2">Swap ETH for AXM</h4>
                    <p className="text-dl-gray text-sm mb-3">
                      Once you have ETH, come back here and swap it for AXM on our DEX
                    </p>
                    <Link
                      href="/dex?to=AXM"
                      className="inline-flex items-center gap-2 bg-dl-navy text-white font-medium px-4 py-2 text-sm"
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

            <div className="mt-6 bg-dl-bg-alt p-4 border border-dl-border">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-dl-navy mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-dl-navy font-medium mb-1">Don't have MetaMask?</p>
                  <p className="text-dl-gray text-sm">
                    Download it free at{' '}
                    <a 
                      href="https://metamask.io/download/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-dl-navy underline"
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
          <div className="text-center text-dl-gray py-8">
            <p>Select an option above to get started</p>
          </div>
        )}

        <div className="mt-8 bg-dl-bg-alt border border-dl-border p-6">
          <h3 className="font-medium text-dl-navy mb-3">About AXM Token</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-dl-bg p-4 border border-dl-border">
              <div className="text-dl-gray mb-1">Contract Address</div>
              <div className="flex items-center gap-2">
                <span className="text-dl-navy font-dl-mono text-xs truncate">{AXM_CONTRACT}</span>
                <button
                  onClick={copyContract}
                  className="text-dl-navy text-xs shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="bg-dl-bg p-4 border border-dl-border">
              <div className="text-dl-gray mb-1">Network</div>
              <div className="text-dl-navy">Arbitrum One</div>
            </div>
            <div className="bg-dl-bg p-4 border border-dl-border">
              <div className="text-dl-gray mb-1">Use Cases</div>
              <div className="text-dl-navy">Staking, Governance, SUSU</div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-dl-bg-alt border border-dl-border p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-dl-navy mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-dl-navy font-medium mb-1">Self-Custody Model</p>
              <p className="text-dl-gray text-sm">
                Axiom is a non-custodial DeFi protocol. All funds are delivered directly to your wallet - we never hold or control your assets. Not a bank. No FDIC insurance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DesignLawLayout>
  );
}
