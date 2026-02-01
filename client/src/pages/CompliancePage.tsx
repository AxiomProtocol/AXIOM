import React from 'react';

const CompliancePage: React.FC = () => {
  const contracts = [
    { name: 'AXM Token', rating: 10, features: 'Access Control, Pausable, Compliance Hooks' },
    { name: 'Identity & Compliance Hub', rating: 10, features: 'Role-based Access, Credential Registry' },
    { name: 'Treasury & Revenue Hub', rating: 10, features: 'Multi-vault System, Reentrancy Guard' },
    { name: 'Staking & Emissions Hub', rating: 10, features: 'Reward Distribution, Time-locked Stakes' },
    { name: 'Citizen Credential Registry', rating: 10, features: 'Identity Verification, Privacy Controls' },
    { name: 'Land & Asset Registry', rating: 10, features: 'Ownership Tracking, Transfer Controls' },
    { name: 'Lease & Rent Engine', rating: 10, features: 'Payment Automation, Compliance Checks' },
    { name: 'Realtor Module', rating: 10, features: 'Licensed Access, Transaction Security' },
    { name: 'Capital Pools & Funds', rating: 10, features: 'Investment Protection, Withdrawal Limits' },
    { name: 'Utility & Metering Hub', rating: 10, features: 'Usage Tracking, Payment Integration' },
    { name: 'Transport & Logistics Hub', rating: 10, features: 'Route Optimization, Audit Trails' },
    { name: 'DePIN Node Suite', rating: 10, features: 'Node Registration, Reward Distribution' },
    { name: 'Cross-Chain Launch Module', rating: 10, features: 'Bridge Security, Multi-chain Support' },
    { name: 'Exchange Hub (DEX)', rating: 10, features: 'AMM Security, Slippage Protection' },
    { name: 'Citizen Reputation Oracle', rating: 10, features: 'Credit Scoring, Privacy Preservation' },
    { name: 'IoT Oracle Network', rating: 10, features: 'Data Validation, Tamper Resistance' },
    { name: 'Markets & Listings Hub', rating: 9, features: 'RWA Trading, Escrow Protection' },
    { name: 'Oracle & Metrics Relay', rating: 10, features: 'Price Feeds, Data Aggregation' },
    { name: 'Community Social Hub', rating: 10, features: 'Social Graph, Content Moderation' },
    { name: 'Axiom Academy Hub', rating: 10, features: 'Education Tracking, Certification' },
    { name: 'Gamification Hub', rating: 10, features: 'Achievement System, NFT Rewards' },
    { name: 'Sustainability Hub', rating: 10, features: 'Carbon Credits, Green Finance' }
  ];

  const avgRating = contracts.reduce((sum, c) => sum + c.rating, 0) / contracts.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🛡️ Compliance & Security
          </h1>
          <p className="text-xl text-gray-600">
            Enterprise-grade security standards across all smart contracts
          </p>
        </div>

        {/* Overall Security Score */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className="inline-block bg-green-100 rounded-full p-6 mb-4">
              <div className="text-6xl font-bold text-green-600">{avgRating.toFixed(1)}/10</div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Overall Security Rating</h2>
            <p className="text-gray-600">Based on comprehensive 10-point security analysis</p>
          </div>
        </div>

        {/* Security Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-3">✅</div>
            <h3 className="font-bold text-lg mb-2">Access Control</h3>
            <p className="text-gray-600">Role-based permissions across all contracts with granular access management</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-bold text-lg mb-2">Reentrancy Protection</h3>
            <p className="text-gray-600">Guards against reentrancy attacks on all state-changing functions</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-3">⏸️</div>
            <h3 className="font-bold text-lg mb-2">Emergency Pause</h3>
            <p className="text-gray-600">Circuit breakers to halt operations in case of detected threats</p>
          </div>
        </div>

        {/* Contract Security Ratings */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contract Security Ratings</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Contract Name</th>
                  <th className="text-center py-3 px-4">Security Rating</th>
                  <th className="text-left py-3 px-4">Key Security Features</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{contract.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full font-semibold ${
                        contract.rating === 10 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {contract.rating}/10
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{contract.features}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance Standards */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Compliance Standards</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-lg mb-2">Smart Contract Verification</h3>
              <p className="text-gray-600 mb-2">All contracts verified on Arbitrum Blockscout with publicly auditable source code</p>
              <p className="text-sm text-gray-500">✅ 100% Verification Rate</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-lg mb-2">OpenZeppelin Standards</h3>
              <p className="text-gray-600 mb-2">Built on industry-standard OpenZeppelin Contracts v5.x for maximum security</p>
              <p className="text-sm text-gray-500">✅ Battle-tested Libraries</p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-lg mb-2">Role-Based Access Control</h3>
              <p className="text-gray-600 mb-2">Granular permissions system with admin, minter, pauser, and compliance roles</p>
              <p className="text-sm text-gray-500">✅ Principle of Least Privilege</p>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-lg mb-2">Upgrade Safety</h3>
              <p className="text-gray-600 mb-2">Controlled upgrade mechanisms with multi-sig governance for critical changes</p>
              <p className="text-sm text-gray-500">✅ Community Governance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompliancePage;
