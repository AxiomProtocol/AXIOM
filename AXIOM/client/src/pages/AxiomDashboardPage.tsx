import React, { useState } from 'react';

const AxiomDashboardPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const contracts = [
    { id: 1, name: 'AxiomV2 (AXM Token)', address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', category: 'core', status: 'verified', rating: 10 },
    { id: 2, name: 'AxiomIdentityComplianceHub', address: '0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED', category: 'core', status: 'verified', rating: 10 },
    { id: 3, name: 'AxiomTreasuryAndRevenueHub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929', category: 'core', status: 'verified', rating: 10 },
    { id: 4, name: 'AxiomStakingAndEmissionsHub', address: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885', category: 'core', status: 'verified', rating: 10 },
    { id: 5, name: 'CitizenCredentialRegistry', address: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344', category: 'core', status: 'verified', rating: 10 },
    { id: 6, name: 'AxiomLandAndAssetRegistry', address: '0xaB15907b124620E165aB6E464eE45b178d8a6591', category: 'core', status: 'verified', rating: 10 },
    { id: 7, name: 'LeaseAndRentEngine', address: '0x26a20dEa57F951571AD6e518DFb3dC60634D5297', category: 'real-estate', status: 'verified', rating: 10 },
    { id: 8, name: 'RealtorModule', address: '0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412', category: 'real-estate', status: 'verified', rating: 10 },
    { id: 9, name: 'CapitalPoolsAndFunds', address: '0xFcCdC1E353b24936f9A8D08D21aF684c620fa701', category: 'real-estate', status: 'verified', rating: 10 },
    { id: 10, name: 'UtilityAndMeteringHub', address: '0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d', category: 'utilities', status: 'verified', rating: 10 },
    { id: 11, name: 'TransportAndLogisticsHub', address: '0x959c5dd99B170e2b14B1F9b5a228f323946F514e', category: 'utilities', status: 'verified', rating: 10 },
    { id: 12, name: 'DePINNodeSuite', address: '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1', category: 'utilities', status: 'verified', rating: 10 },
    { id: 13, name: 'CrossChainAndLaunchModule', address: '0x28623Ee5806ab9609483F4B68cb1AE212A092e4d', category: 'defi', status: 'verified', rating: 10 },
    { id: 14, name: 'AxiomExchangeHub (DEX)', address: '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D', category: 'defi', status: 'verified', rating: 10 },
    { id: 15, name: 'CitizenReputationOracle', address: '0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643', category: 'defi', status: 'verified', rating: 10 },
    { id: 16, name: 'IoTOracleNetwork', address: '0xe38B3443E17A07953d10F7841D5568a27A73ec1a', category: 'defi', status: 'verified', rating: 10 },
    { id: 17, name: 'MarketsAndListingsHub', address: '0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830', category: 'defi', status: 'verified', rating: 9 },
    { id: 18, name: 'OracleAndMetricsRelay', address: '0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6', category: 'defi', status: 'verified', rating: 10 },
    { id: 19, name: 'CommunitySocialHub', address: '0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49', category: 'community', status: 'verified', rating: 10 },
    { id: 20, name: 'AxiomAcademyHub', address: '0x30667931BEe54a58B76D387D086A975aB37206F4', category: 'community', status: 'verified', rating: 10 },
    { id: 21, name: 'GamificationHub', address: '0x7F455b4614E05820AAD52067Ef223f30b1936f93', category: 'community', status: 'verified', rating: 10 },
    { id: 22, name: 'SustainabilityHub', address: '0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046', category: 'community', status: 'verified', rating: 10 }
  ];

  const categories = [
    { id: 'all', name: 'All Contracts', count: 22, color: 'bg-gray-600' },
    { id: 'core', name: 'Core Infrastructure', count: 6, color: 'bg-blue-600' },
    { id: 'real-estate', name: 'Real Estate', count: 3, color: 'bg-green-600' },
    { id: 'utilities', name: 'Utilities & DePIN', count: 3, color: 'bg-yellow-600' },
    { id: 'defi', name: 'DeFi & Oracles', count: 6, color: 'bg-purple-600' },
    { id: 'community', name: 'Community', count: 4, color: 'bg-pink-600' }
  ];

  const filteredContracts = selectedCategory === 'all' 
    ? contracts 
    : contracts.filter(c => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🏛️ Axiom Smart City Dashboard
          </h1>
          <p className="text-xl text-gray-300">
            Complete overview of 22 deployed smart contracts on Arbitrum One
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
            <div className="text-4xl font-bold text-white">22/22</div>
            <div className="text-gray-300 mt-2">Contracts Deployed</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
            <div className="text-4xl font-bold text-green-400">100%</div>
            <div className="text-gray-300 mt-2">Verified on Blockscout</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
            <div className="text-4xl font-bold text-blue-400">9.95/10</div>
            <div className="text-gray-300 mt-2">Avg Security Rating</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
            <div className="text-4xl font-bold text-purple-400">91.67%</div>
            <div className="text-gray-300 mt-2">Integration Progress</div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedCategory === cat.id
                  ? `${cat.color} text-white shadow-lg scale-105`
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* Contracts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredContracts.map(contract => (
            <div key={contract.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{contract.name}</h3>
                  <span className="text-sm text-gray-400">Contract #{contract.id}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                    {contract.status}
                  </span>
                  <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                    {contract.rating}/10
                  </span>
                </div>
              </div>
              
              <div className="bg-black/30 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 mb-1">Contract Address:</p>
                <p className="font-mono text-sm text-white break-all">{contract.address}</p>
              </div>

              <a
                href={`https://arbitrum.blockscout.com/address/${contract.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-all text-center"
              >
                View on Blockscout →
              </a>
            </div>
          ))}
        </div>

        {/* Network Info */}
        <div className="mt-12 bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Network Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div><span className="font-semibold text-white">Network:</span> Arbitrum One</div>
            <div><span className="font-semibold text-white">Chain ID:</span> 42161</div>
            <div><span className="font-semibold text-white">Deployer:</span> 0xDFf9...1528</div>
            <div><span className="font-semibold text-white">Compiler:</span> Solidity 0.8.20</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AxiomDashboardPage;
