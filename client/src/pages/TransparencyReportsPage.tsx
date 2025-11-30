import React from 'react';

const TransparencyReportsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📊 Transparency Reports
          </h1>
          <p className="text-xl text-gray-600">
            Real-time deployment status and integration progress for Axiom Smart City
          </p>
        </div>

        {/* Deployment Status */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-green-500 mr-3">✅</span>
            Smart Contract Deployment Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-green-600">22/22</div>
              <div className="text-gray-600 mt-2">Contracts Deployed</div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-blue-600">100%</div>
              <div className="text-gray-600 mt-2">Verified on Blockscout</div>
            </div>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-purple-600">91.67%</div>
              <div className="text-gray-600 mt-2">Integration Complete</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Deployment Network</h3>
            <div className="space-y-2">
              <p><span className="font-semibold">Network:</span> Arbitrum One (Chain ID: 42161)</p>
              <p><span className="font-semibold">Deployer:</span> 0xDFf9e47eb007bF02e47477d577De9ffA99791528</p>
              <p><span className="font-semibold">Compiler:</span> Solidity 0.8.20 with optimizer</p>
              <p><span className="font-semibold">Security Rating:</span> 10/10 (21 contracts), 9/10 (1 contract)</p>
            </div>
          </div>
        </div>

        {/* Integration Progress */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-blue-500 mr-3">🔗</span>
            Integration Progress
          </h2>

          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Stage 1: Core Security & Token Plumbing</h3>
                  <p className="text-gray-600">Foundation roles for treasury, staking, and compliance</p>
                </div>
                <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                  11/11 ✅
                </span>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4 py-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Stage 2: Financial & Real Estate Mesh</h3>
                  <p className="text-gray-600">Treasury connections for lease engine and capital pools</p>
                </div>
                <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                  5/5 ✅
                </span>
              </div>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4 py-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Stage 3A: Utility Hub Oracle Role</h3>
                  <p className="text-gray-600">IoT oracle permissions for utility metering</p>
                </div>
                <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-semibold">
                  0/1 ⏳
                </span>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4 py-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Stage 3B: DePIN Suite Oracle Role</h3>
                  <p className="text-gray-600">IoT oracle permissions for DePIN infrastructure</p>
                </div>
                <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                  1/1 ✅
                </span>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4 py-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Stage 4: Community & Cross-Chain</h3>
                  <p className="text-gray-600">Permissionless community contract setup</p>
                </div>
                <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                  Complete ✅
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Explorer Links */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-purple-500 mr-3">🔍</span>
            Blockchain Verification
          </h2>
          
          <p className="text-gray-600 mb-4">
            All contracts are verified and publicly auditable on Arbitrum Blockscout:
          </p>
          
          <div className="flex gap-4">
            <a 
              href="https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              View AXM Token Contract →
            </a>
            <a 
              href="/axiom-dashboard"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              View All Contracts →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransparencyReportsPage;
