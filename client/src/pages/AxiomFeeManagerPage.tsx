import React, { useState } from 'react';

const AxiomFeeManagerPage: React.FC = () => {
  const [selectedVault, setSelectedVault] = useState<string | null>(null);

  const vaults = [
    {
      id: 'burn',
      name: 'Burn Vault',
      allocation: 20,
      color: 'bg-red-500',
      borderColor: 'border-red-500',
      bgLight: 'bg-red-50',
      icon: '🔥',
      purpose: 'Permanent token removal for deflationary pressure',
      impact: 'Reduces circulating supply over time, increasing scarcity',
      status: 'active',
      totalBurned: '0 AXM',
      address: 'Configured in Treasury Hub'
    },
    {
      id: 'staking',
      name: 'Staking Vault',
      allocation: 30,
      color: 'bg-blue-500',
      borderColor: 'border-blue-500',
      bgLight: 'bg-blue-50',
      icon: '💎',
      purpose: 'Reward distribution to AXM token stakers',
      impact: 'Incentivizes long-term holding and network security',
      status: 'active',
      totalRewards: '0 AXM',
      address: 'Configured in Treasury Hub'
    },
    {
      id: 'liquidity',
      name: 'Liquidity Vault',
      allocation: 20,
      color: 'bg-green-500',
      borderColor: 'border-green-500',
      bgLight: 'bg-green-50',
      icon: '💧',
      purpose: 'DEX liquidity provision and market stability',
      impact: 'Ensures smooth trading and reduces price volatility',
      status: 'active',
      totalLiquidity: '0 AXM',
      address: 'Configured in Treasury Hub'
    },
    {
      id: 'dividend',
      name: 'Dividend Vault',
      allocation: 15,
      color: 'bg-purple-500',
      borderColor: 'border-purple-500',
      bgLight: 'bg-purple-50',
      icon: '💰',
      purpose: 'Revenue sharing with token holders',
      impact: 'Direct yield from real-world city services',
      status: 'active',
      totalDividends: '0 AXM',
      address: 'Configured in Treasury Hub'
    },
    {
      id: 'treasury',
      name: 'Treasury Vault',
      allocation: 15,
      color: 'bg-yellow-500',
      borderColor: 'border-yellow-500',
      bgLight: 'bg-yellow-50',
      icon: '🏛️',
      purpose: 'Development funding and ecosystem grants',
      impact: 'Fuels continuous protocol improvement',
      status: 'active',
      totalTreasury: '0 AXM',
      address: 'Configured in Treasury Hub'
    }
  ];

  const feeRates = [
    { type: 'Standard Transfer', rate: '0.1%', description: 'Person-to-person AXM transfers' },
    { type: 'Smart Contract', rate: '0.2%', description: 'DeFi protocol interactions' },
    { type: 'Large Transfer', rate: '0.15%', description: 'Transfers above whale threshold' },
    { type: 'Governance Action', rate: '0%', description: 'Voting and delegation (gas-free)' }
  ];

  const selectedVaultData = vaults.find(v => v.id === selectedVault);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ⚙️ Fee Manager
          </h1>
          <p className="text-xl text-gray-600">
            Dynamic fee distribution system powering the Axiom economy
          </p>
        </div>

        {/* Treasury Hub Info */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl shadow-2xl p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-4 text-center">Treasury & Revenue Hub</h2>
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6">
            <p className="text-sm mb-2 opacity-90">Contract Address:</p>
            <p className="font-mono text-lg mb-4 break-all">0x3fD63728288546AC41dAe3bf25ca383061c3A929</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">5</div>
                <div className="text-sm opacity-90">Fee Vaults</div>
              </div>
              <div>
                <div className="text-2xl font-bold">100%</div>
                <div className="text-sm opacity-90">Fee Coverage</div>
              </div>
              <div>
                <div className="text-2xl font-bold">✅</div>
                <div className="text-sm opacity-90">Configured</div>
              </div>
              <div>
                <div className="text-2xl font-bold">⚡</div>
                <div className="text-sm opacity-90">Automated</div>
              </div>
            </div>
          </div>
        </div>

        {/* Vault Allocation Overview */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Vault Allocation Overview
          </h2>
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Total Allocation</span>
              <span className="font-bold text-2xl">100%</span>
            </div>
            <div className="h-8 flex rounded-full overflow-hidden">
              {vaults.map((vault) => (
                <div
                  key={vault.id}
                  className={`${vault.color} flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity`}
                  style={{ width: `${vault.allocation}%` }}
                  onClick={() => setSelectedVault(vault.id)}
                >
                  {vault.allocation}%
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {vaults.map((vault) => (
              <div
                key={vault.id}
                onClick={() => setSelectedVault(vault.id)}
                className={`border-2 ${
                  selectedVault === vault.id ? vault.borderColor : 'border-gray-200'
                } rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all ${
                  selectedVault === vault.id ? vault.bgLight : ''
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{vault.icon}</div>
                  <h3 className="font-bold mb-1">{vault.name}</h3>
                  <div className={`text-2xl font-bold ${vault.color.replace('bg-', 'text-')}`}>
                    {vault.allocation}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Vault Details */}
        {selectedVaultData && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="text-4xl mr-3">{selectedVaultData.icon}</span>
                {selectedVaultData.name}
              </h2>
              <button
                onClick={() => setSelectedVault(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`${selectedVaultData.bgLight} border-l-4 ${selectedVaultData.borderColor} p-6 rounded-lg`}>
                <h3 className="font-bold text-lg mb-2">Purpose</h3>
                <p className="text-gray-700">{selectedVaultData.purpose}</p>
              </div>

              <div className={`${selectedVaultData.bgLight} border-l-4 ${selectedVaultData.borderColor} p-6 rounded-lg`}>
                <h3 className="font-bold text-lg mb-2">Economic Impact</h3>
                <p className="text-gray-700">{selectedVaultData.impact}</p>
              </div>

              <div className="border-2 border-gray-200 p-6 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Allocation</h3>
                <div className={`text-4xl font-bold ${selectedVaultData.color.replace('bg-', 'text-')}`}>
                  {selectedVaultData.allocation}%
                </div>
                <p className="text-sm text-gray-600 mt-2">of all transaction fees</p>
              </div>

              <div className="border-2 border-gray-200 p-6 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Status</h3>
                <span className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                  {selectedVaultData.status}
                </span>
                <p className="text-sm text-gray-600 mt-2">Configured in Treasury Hub</p>
              </div>
            </div>
          </div>
        )}

        {/* Fee Rates */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Transaction Fee Rates
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Transaction Type</th>
                  <th className="text-center py-3 px-4">Fee Rate</th>
                  <th className="text-left py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody>
                {feeRates.map((rate, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold">{rate.type}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                        {rate.rate}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{rate.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>📊 Governance Control:</strong> Fee rates can be adjusted through community voting to optimize 
              for market conditions and ecosystem health.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-6 text-center">
            How Fee Distribution Works
          </h2>

          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="flex items-start">
                <div className="bg-white text-purple-600 rounded-full w-10 h-10 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Transaction Occurs</h3>
                  <p className="opacity-90">User initiates an AXM transfer or smart contract interaction</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="flex items-start">
                <div className="bg-white text-purple-600 rounded-full w-10 h-10 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Fee Calculation</h3>
                  <p className="opacity-90">Smart contract calculates appropriate fee rate based on transaction type</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="flex items-start">
                <div className="bg-white text-purple-600 rounded-full w-10 h-10 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Automatic Distribution</h3>
                  <p className="opacity-90">Fee is split across all 5 vaults according to configured percentages</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="flex items-start">
                <div className="bg-white text-purple-600 rounded-full w-10 h-10 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Ecosystem Benefits</h3>
                  <p className="opacity-90">Burns reduce supply, stakers earn rewards, liquidity stays healthy, dividends distribute, and treasury funds development</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AxiomFeeManagerPage;
