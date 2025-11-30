import Layout from '../../components/Layout';
import Link from 'next/link';

export default function Security() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/dex" className="text-amber-600 hover:text-amber-700 flex items-center gap-2 mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Exchange
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Security & Safety</h1>
          <p className="text-xl text-gray-600">Understanding the security measures and best practices for using Axiom Exchange</p>
        </div>

        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl">🛡️</div>
            <h2 className="text-2xl font-bold">Security-First Design</h2>
          </div>
          <p className="text-green-100 mb-6">
            Axiom Exchange is built with security as a core principle. Our smart contracts follow industry best practices
            and are designed to protect user funds at every step.
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">✓</div>
              <div className="text-sm text-green-100">Non-Custodial</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">✓</div>
              <div className="text-sm text-green-100">Open Source</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">✓</div>
              <div className="text-sm text-green-100">Verified Contracts</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">✓</div>
              <div className="text-sm text-green-100">Permissionless</div>
            </div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Smart Contract Security</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-green-500">✓</span> Verified on Block Explorer
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                All Axiom Exchange contracts are verified on Arbitrum's block explorer, allowing anyone to inspect the source code and confirm it matches what's deployed.
              </p>
              <a 
                href="https://arbiscan.io/address/0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D#code" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
              >
                View on Arbiscan
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-green-500">✓</span> OpenZeppelin Standards
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                We use battle-tested OpenZeppelin contracts for core functionality like ERC-20 tokens, access control, and reentrancy guards.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">ReentrancyGuard</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">SafeERC20</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">Ownable</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">Pausable</span>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-green-500">✓</span> Non-Upgradeable Core
              </h3>
              <p className="text-gray-600 text-sm">
                The core exchange contracts are non-upgradeable, meaning the code cannot be changed after deployment. What you see is what you get — forever.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-green-500">✓</span> Permissionless Design
              </h3>
              <p className="text-gray-600 text-sm">
                No admin can freeze your funds or block your transactions. The exchange operates autonomously according to its immutable code.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contract Addresses</h2>
          <div className="bg-gray-50 rounded-2xl p-6">
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-bold text-gray-900">AxiomExchangeHub</div>
                    <div className="text-sm text-gray-500">Main DEX Contract</div>
                  </div>
                  <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono">0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D</code>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-bold text-gray-900">AXM Token</div>
                    <div className="text-sm text-gray-500">Governance Token</div>
                  </div>
                  <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono">0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D</code>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Network: Arbitrum One (Chain ID: 42161)
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">User Security Best Practices</h2>
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🔐</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Secure Your Wallet</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Never share your seed phrase or private keys with anyone</li>
                    <li>• Use a hardware wallet for large amounts</li>
                    <li>• Keep your recovery phrase in a secure, offline location</li>
                    <li>• Use a unique, strong password for your wallet</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">✅</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Verify Transactions</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Always double-check the contract address before interacting</li>
                    <li>• Review transaction details in your wallet before confirming</li>
                    <li>• Start with small amounts when using a new protocol</li>
                    <li>• Check gas fees before confirming transactions</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🎣</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Avoid Phishing</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Bookmark the official Axiom website</li>
                    <li>• Never click links from unsolicited messages</li>
                    <li>• Be wary of urgent messages asking for wallet connection</li>
                    <li>• Official Axiom will never ask for your private keys</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📋</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Token Approvals</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Only approve tokens for contracts you trust</li>
                    <li>• Consider using limited approvals instead of unlimited</li>
                    <li>• Periodically review and revoke unused approvals</li>
                    <li>• Use tools like Revoke.cash to manage approvals</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Understanding the Risks</h2>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
            <h3 className="font-bold text-orange-900 mb-4">DeFi Involves Inherent Risks</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-orange-900 mb-2">Smart Contract Risk</h4>
                <p className="text-orange-800 text-sm">
                  Despite best practices and audits, smart contracts may contain undiscovered bugs. Never invest more than you can afford to lose.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-orange-900 mb-2">Impermanent Loss</h4>
                <p className="text-orange-800 text-sm">
                  Providing liquidity exposes you to impermanent loss when token prices change. Understand this risk before depositing.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-orange-900 mb-2">Market Risk</h4>
                <p className="text-orange-800 text-sm">
                  Token prices can be volatile. The value of your deposits may decrease due to market conditions.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-orange-900 mb-2">Network Risk</h4>
                <p className="text-orange-800 text-sm">
                  Network congestion, outages, or issues with the Arbitrum chain could temporarily prevent transactions.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Emergency Procedures</h2>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h3 className="font-bold text-red-900 mb-4">If You Suspect Your Wallet is Compromised</h3>
            <ol className="space-y-3 text-red-800">
              <li className="flex gap-3">
                <span className="font-bold text-red-600">1.</span>
                <span>Immediately transfer remaining funds to a new, secure wallet</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-red-600">2.</span>
                <span>Revoke all token approvals using Revoke.cash or similar tools</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-red-600">3.</span>
                <span>Never use the compromised wallet again</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-red-600">4.</span>
                <span>Create a new wallet with a fresh seed phrase</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-red-600">5.</span>
                <span>Consider using a hardware wallet for additional security</span>
              </li>
            </ol>
          </div>
        </section>

        <div className="mt-12 grid md:grid-cols-3 gap-4">
          <Link href="/dex/how-amm-works" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">How AMMs Work</h3>
            <p className="text-sm text-gray-600">Understand the mechanics</p>
          </Link>
          <Link href="/dex/liquidity-guide" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">💧</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">Liquidity Guide</h3>
            <p className="text-sm text-gray-600">Complete LP walkthrough</p>
          </Link>
          <Link href="/dex/fees-rewards" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">💰</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">Fees & Rewards</h3>
            <p className="text-sm text-gray-600">Maximize your earnings</p>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
