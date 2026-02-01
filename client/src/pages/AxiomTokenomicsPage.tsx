import React from 'react';

const AxiomTokenomicsPage: React.FC = () => {
  const feeVaults = [
    { name: 'Burn Vault', allocation: '20%', purpose: 'Token deflation through permanent removal', color: 'bg-red-500' },
    { name: 'Staking Vault', allocation: '30%', purpose: 'Rewards for AXM token stakers', color: 'bg-blue-500' },
    { name: 'Liquidity Vault', allocation: '20%', purpose: 'DEX liquidity and market stability', color: 'bg-green-500' },
    { name: 'Dividend Vault', allocation: '15%', purpose: 'Revenue distribution to token holders', color: 'bg-purple-500' },
    { name: 'Treasury Vault', allocation: '15%', purpose: 'Development and ecosystem growth', color: 'bg-yellow-500' }
  ];

  const tokenFeatures = [
    {
      icon: '🔥',
      title: 'Deflationary Mechanism',
      description: '20% of all transaction fees are permanently burned, reducing total supply over time'
    },
    {
      icon: '💰',
      title: 'Staking Rewards',
      description: '30% of fees distributed to AXM stakers, incentivizing long-term holding'
    },
    {
      icon: '🏛️',
      title: 'Governance Power',
      description: 'Token holders vote on protocol upgrades, fee adjustments, and treasury allocation'
    },
    {
      icon: '📊',
      title: 'Revenue Sharing',
      description: 'Real-world revenue from city services flows directly to dividend vault'
    },
    {
      icon: '🔒',
      title: 'Compliance Ready',
      description: 'Built-in KYC/AML hooks and anti-whale protection mechanisms'
    },
    {
      icon: '⚡',
      title: 'Dynamic Fees',
      description: 'Governance can adjust fee rates and vault allocations based on market conditions'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ⚡ AXM Tokenomics
          </h1>
          <p className="text-xl text-gray-600">
            Governance & fee-routing token powering the Axiom Smart City economy
          </p>
        </div>

        {/* Token Overview */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-blue-600 mb-2">AXM</div>
              <div className="text-gray-600">Token Symbol</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-green-600 mb-2">15B</div>
              <div className="text-gray-600">Total Supply</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-orange-600 mb-2">ERC20</div>
              <div className="text-gray-600">Token Standard</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-purple-600 mb-2">Arbitrum</div>
              <div className="text-gray-600">Network</div>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
            <h3 className="font-bold text-xl mb-4 text-center">Contract Address</h3>
            <p className="font-mono text-center text-lg break-all">
              0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
            </p>
            <div className="mt-4 text-center">
              <a
                href="https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                View on Blockscout →
              </a>
            </div>
          </div>
        </div>

        {/* Fee Distribution System */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            💎 Dynamic Fee Distribution
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Every transaction fee is automatically distributed across 5 vaults for optimal ecosystem health
          </p>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {feeVaults.map((vault, idx) => (
              <div key={idx} className="text-center">
                <div className={`${vault.color} h-32 rounded-lg flex items-center justify-center text-white font-bold text-2xl mb-3`}>
                  {vault.allocation}
                </div>
                <h3 className="font-bold text-lg mb-2">{vault.name}</h3>
                <p className="text-sm text-gray-600">{vault.purpose}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <p className="text-gray-700">
              <strong>🎯 Governance Control:</strong> Fee rates and vault allocations can be adjusted through 
              community voting, ensuring the tokenomics evolve with ecosystem needs.
            </p>
          </div>
        </div>

        {/* Token Features */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            🚀 Token Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tokenFeatures.map((feature, idx) => (
              <div key={idx} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all">
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="font-bold text-xl mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Integration */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-6 text-center">
            🏙️ Real-World Revenue Integration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🏘️</div>
              <h3 className="font-semibold mb-2">Real Estate</h3>
              <p className="text-sm opacity-90">Rent & lease payments</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-semibold mb-2">Utilities</h3>
              <p className="text-sm opacity-90">Power, water, internet fees</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🚗</div>
              <h3 className="font-semibold mb-2">Transportation</h3>
              <p className="text-sm opacity-90">Transit & logistics revenue</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🏢</div>
              <h3 className="font-semibold mb-2">Services</h3>
              <p className="text-sm opacity-90">Business licenses & fees</p>
            </div>
          </div>

          <div className="mt-8 bg-white/20 rounded-lg p-6 backdrop-blur-sm">
            <p className="text-center text-lg">
              All real-world revenue flows on-chain through the Treasury Hub, feeding directly into the fee distribution system
            </p>
          </div>
        </div>

        {/* Utility & Governance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="text-purple-500 mr-3">🗳️</span>
              Governance Rights
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Vote on protocol upgrades and new features</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Adjust fee rates and vault allocations</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Control treasury spending and grants</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Propose and vote on city policies</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="text-orange-500 mr-3">⚙️</span>
              Smart Contract Features
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>EIP-2612 Permit (gasless approvals)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>EIP-712 Typed signatures</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Pausable for emergency situations</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Role-based access control (RBAC)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AxiomTokenomicsPage;
