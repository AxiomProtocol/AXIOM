import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import StepProgressBanner from '../components/StepProgressBanner';

const TOKEN_INFO = {
  name: 'Axiom Protocol Token',
  symbol: 'AXM',
  network: 'Arbitrum One',
  standard: 'ERC-20',
  totalSupply: '15,000,000,000',
  contractAddress: '0x714c9087faaDfDc27B8B3269D2B7Bba01a000Dfa',
  decimals: 18,
};

const USE_CASES = [
  { icon: '🏛️', title: 'Governance', description: 'Vote on proposals and shape the future of Axiom Protocol' },
  { icon: '⛽', title: 'Gas Token', description: 'Native gas token on Universe Blockchain (L3)' },
  { icon: '💰', title: 'Staking Rewards', description: 'Earn yield by staking AXM in savings pools' },
  { icon: '🏠', title: 'KeyGrow Equity', description: 'Build home equity through rent-to-own contributions' },
  { icon: '🤝', title: 'SUSU Savings', description: 'Participate in community savings circles' },
  { icon: '🔌', title: 'DePIN Rewards', description: 'Earn from infrastructure node operations' },
  { icon: '🎓', title: 'Academy Access', description: 'Unlock premium educational content' },
  { icon: '💳', title: 'Fee Discounts', description: 'Reduced fees across all platform services' },
];

const QUICK_LINKS = [
  { name: 'View on Arbiscan', href: `https://arbiscan.io/token/${TOKEN_INFO.contractAddress}`, external: true },
  { name: 'Tokenomics', href: '/tokenomics', external: false },
  { name: 'Whitepaper', href: '/whitepaper', external: false },
  { name: 'Trade on DEX', href: '/dex', external: false },
];

export default function TokenPage() {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(TOKEN_INFO.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Head>
        <title>AXM Token | Axiom Protocol</title>
        <meta name="description" content="AXM is the governance and utility token powering Axiom Protocol - a community-first wealth-building platform." />
        <meta property="og:title" content="AXM Token | Axiom Protocol" />
        <meta property="og:description" content="The governance and utility token powering the Axiom community economy." />
        <meta property="og:type" content="website" />
      </Head>

      <Layout>
        <StepProgressBanner isAdvanced={true} />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/30">
                  <img 
                    src="/images/axiom-token.png" 
                    alt="AXM Token" 
                    className="w-20 h-20 rounded-full"
                    onError={(e: any) => { e.target.style.display = 'none'; }}
                  />
                </div>
              </div>
              <h1 className="text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">AXM</span> Token
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                The governance and utility token powering the Axiom community economy
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/dex" className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition shadow-lg">
                  Get AXM
                </Link>
                <Link href="/tokenomics" className="px-8 py-4 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition">
                  View Tokenomics
                </Link>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 py-16">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Token Details</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Token Name</p>
                  <p className="text-lg font-semibold text-gray-900">{TOKEN_INFO.name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Symbol</p>
                  <p className="text-lg font-semibold text-gray-900">{TOKEN_INFO.symbol}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Network</p>
                  <p className="text-lg font-semibold text-gray-900">{TOKEN_INFO.network}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Token Standard</p>
                  <p className="text-lg font-semibold text-gray-900">{TOKEN_INFO.standard}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Total Supply</p>
                  <p className="text-lg font-semibold text-gray-900">{TOKEN_INFO.totalSupply} AXM</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Decimals</p>
                  <p className="text-lg font-semibold text-gray-900">{TOKEN_INFO.decimals}</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Contract Address</p>
                    <p className="text-amber-400 font-mono text-sm md:text-base break-all">{TOKEN_INFO.contractAddress}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={copyAddress}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                    <a
                      href={`https://arbiscan.io/token/${TOKEN_INFO.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Arbiscan
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <Link href="/launchpad" className="block mb-12 group">
              <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-[1.01]">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl">🚀</span>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                      <h3 className="text-2xl font-bold">Token Generation Event (TGE)</h3>
                      <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">Q1 2026</span>
                    </div>
                    <p className="text-purple-100 mb-4">
                      Be among the first to participate in the AXM public sale. Early supporters get priority access and exclusive bonuses.
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        5% of supply available
                      </span>
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        750M AXM tokens
                      </span>
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        100% unlocked at TGE
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold group-hover:bg-gray-100 transition flex items-center gap-2">
                      Learn More
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Token Utility</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {USE_CASES.map((useCase, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:border-amber-300 transition">
                    <div className="text-3xl mb-3">{useCase.icon}</div>
                    <h3 className="font-semibold text-gray-900 mb-2">{useCase.title}</h3>
                    <p className="text-sm text-gray-600">{useCase.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-center text-white mb-12">
              <h2 className="text-2xl font-bold mb-4">Ready to Join the Axiom Economy?</h2>
              <p className="text-lg text-orange-100 mb-6 max-w-2xl mx-auto">
                Get AXM tokens to participate in governance, earn rewards, and build wealth in America's first on-chain smart city.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/dex" className="px-8 py-3 bg-white text-amber-600 rounded-xl font-semibold hover:bg-gray-100 transition shadow-lg">
                  Trade on DEX
                </Link>
                <Link href="/early-access" className="px-8 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition">
                  Get Early Access
                </Link>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {QUICK_LINKS.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  className="flex items-center justify-between bg-white rounded-xl p-4 shadow border border-gray-100 hover:border-amber-300 transition group"
                >
                  <span className="font-medium text-gray-900">{link.name}</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
