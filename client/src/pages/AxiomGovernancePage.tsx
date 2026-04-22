import React from 'react';

const AxiomGovernancePage: React.FC = () => {
  const governanceModules = [
    {
      title: 'On-Chain Voting',
      icon: '🗳️',
      status: 'active',
      description: 'Token-weighted voting on protocol upgrades, fee adjustments, and treasury spending',
      features: ['Proposal submission', 'Voting delegation', 'Timelock execution']
    },
    {
      title: 'Multi-Sig Admin',
      icon: '🔐',
      status: 'active',
      description: 'Safe multi-signature wallet for critical administrative functions',
      features: ['1-of-1 threshold (upgrade to 3-of-5 planned)', 'Role management', 'Emergency pause']
    },
    {
      title: 'Treasury Management',
      icon: '💰',
      status: 'active',
      description: 'Community-controlled allocation of development funds and ecosystem grants',
      features: ['Budget proposals', 'Milestone-based releases', 'Transparency reports']
    },
    {
      title: 'Fee Governance',
      icon: '⚖️',
      status: 'active',
      description: 'Adjust transaction fees and vault allocations based on market conditions',
      features: ['Dynamic fee rates', 'Vault reallocation', 'Revenue optimization']
    }
  ];

  const roles = [
    { role: 'DEFAULT_ADMIN_ROLE', holder: 'Safe Multisig', permissions: 'Grant/revoke all roles, emergency controls' },
    { role: 'MINTER_ROLE', holder: 'Treasury Hub', permissions: 'Mint new AXM tokens for emissions' },
    { role: 'FEE_MANAGER_ROLE', holder: 'Treasury Hub', permissions: 'Configure fee vaults and distribution' },
    { role: 'COMPLIANCE_ROLE', holder: 'Identity Hub', permissions: 'Enforce KYC/AML compliance checks' },
    { role: 'PAUSER_ROLE', holder: 'Safe Multisig', permissions: 'Emergency pause of all transfers' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🏛️ Axiom Governance
          </h1>
          <p className="text-xl text-gray-600">
            Decentralized governance for America's first on-chain sovereign smart city
          </p>
        </div>

        {/* Governance Vision */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-4 text-center">Our Vision</h2>
          <p className="text-lg text-center max-w-4xl mx-auto leading-relaxed">
            Axiom Smart City is governed entirely by its community of AXM token holders. Through transparent 
            on-chain voting, citizens control protocol upgrades, fee structures, treasury allocation, and city 
            policies—establishing true digital sovereignty.
          </p>
        </div>

        {/* Governance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-purple-600">22</div>
            <div className="text-gray-600 mt-2">Smart Contracts</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-blue-600">5</div>
            <div className="text-gray-600 mt-2">Core Roles</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-green-600">100%</div>
            <div className="text-gray-600 mt-2">On-Chain</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-orange-600">∞</div>
            <div className="text-gray-600 mt-2">Community Power</div>
          </div>
        </div>

        {/* Governance Modules */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Governance Mechanisms
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {governanceModules.map((module, idx) => (
              <div key={idx} className="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-500 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-5xl">{module.icon}</div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    module.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {module.status}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{module.title}</h3>
                <p className="text-gray-600 mb-4">{module.description}</p>
                <ul className="space-y-2">
                  {module.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-sm">
                      <span className="text-purple-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Role-Based Access Control */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            🔐 Role-Based Access Control
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Critical protocol functions are protected by role-based permissions
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Current Holder</th>
                  <th className="text-left py-3 px-4">Permissions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm font-semibold">{role.role}</td>
                    <td className="py-3 px-4">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                        {role.holder}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{role.permissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>🔒 Security Note:</strong> The Safe multisig currently has a 1-of-1 threshold for rapid 
              development. Once contracts are battle-tested, this will upgrade to a 3-of-5 community multisig 
              for enhanced decentralization.
            </p>
          </div>
        </div>

        {/* Governance Process */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            📋 Proposal Process
          </h2>

          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mr-4 flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Submit Proposal</h3>
                <p className="text-gray-600">AXM holders submit governance proposals with detailed specifications and impact analysis</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mr-4 flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Community Discussion</h3>
                <p className="text-gray-600">7-day discussion period on governance forum for feedback and refinement</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mr-4 flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">On-Chain Voting</h3>
                <p className="text-gray-600">72-hour voting period with token-weighted votes (1 AXM = 1 vote)</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mr-4 flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Timelock Execution</h3>
                <p className="text-gray-600">Approved proposals enter 48-hour timelock before automatic execution</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Safe */}
        <div className="bg-gradient-to-r from-gray-900 to-purple-900 rounded-2xl shadow-2xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-6 text-center">
            🛡️ Admin Safe Multisig
          </h2>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6">
            <p className="text-sm mb-2">Safe Address:</p>
            <p className="font-mono text-lg break-all">0x93696b537d814Aed5875C4490143195983AED365</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center">
              <div className="text-3xl font-bold mb-2">1/1</div>
              <div className="text-sm opacity-90">Current Threshold</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center">
              <div className="text-3xl font-bold mb-2">3/5</div>
              <div className="text-sm opacity-90">Planned Upgrade</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center">
              <div className="text-3xl font-bold mb-2">22</div>
              <div className="text-sm opacity-90">Contracts Controlled</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AxiomGovernancePage;
