import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WealthAdvancement({ wallet }) {
  const [opportunities, setOpportunities] = useState(null);
  const [graduatedGroups, setGraduatedGroups] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [wallet]);

  const fetchData = async () => {
    try {
      const [oppsRes, groupsRes] = await Promise.all([
        fetch(`/api/wealth/opportunities${wallet ? `?wallet=${wallet}` : ''}`),
        fetch(`/api/wealth/graduated-groups${wallet ? `?wallet=${wallet}` : ''}`)
      ]);

      if (oppsRes.ok) {
        const oppsData = await oppsRes.json();
        setOpportunities(oppsData);
      }
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGraduatedGroups(groupsData);
      }
    } catch (error) {
      console.error('Error fetching wealth data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
          <span className="text-gray-400">Loading Wealth Practice data...</span>
        </div>
      </div>
    );
  }

  const tiers = [
    { 
      name: 'Community Mode', 
      icon: '🤝', 
      color: 'green',
      description: 'Traditional SUSU savings circles',
      threshold: 'Up to $1,000/contribution',
      features: ['Peer savings groups', 'Rotating payouts', 'Trust building']
    },
    { 
      name: 'Capital Mode', 
      icon: '📈', 
      color: 'yellow',
      description: 'Larger investment pools',
      threshold: '$1,000+ contributions or $10K+ pot',
      features: ['Investment pools', 'Enhanced disclosures', 'Wealth building']
    },
    { 
      name: 'Wealth Practice', 
      icon: '🏛️', 
      color: 'purple',
      description: 'Full ecosystem access',
      threshold: 'Graduated Capital Mode groups',
      features: ['Real estate funds', 'DePIN investments', 'Governance voting']
    }
  ];

  const stats = graduatedGroups?.stats || {};
  const oppsStats = opportunities?.stats || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">Active Groups</div>
          <div className="text-2xl font-bold text-green-400">{stats.activeGroups || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">Graduated Groups</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.graduatedGroups || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">Capital Mobilized</div>
          <div className="text-2xl font-bold text-purple-400">${(stats.totalCapitalMobilized || 0).toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">Investment Pools</div>
          <div className="text-2xl font-bold text-blue-400">{oppsStats.activePools || 0}</div>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Advancement Pathway</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier, idx) => (
            <div 
              key={tier.name}
              className={`relative bg-gray-900/50 border-2 rounded-xl p-5 ${
                tier.color === 'green' ? 'border-green-500/50' :
                tier.color === 'yellow' ? 'border-yellow-500/50' :
                'border-purple-500/50'
              }`}
            >
              {idx < tiers.length - 1 && (
                <div className="hidden md:block absolute -right-6 top-1/2 transform -translate-y-1/2 z-10">
                  <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
              <div className="text-3xl mb-3">{tier.icon}</div>
              <h4 className={`text-lg font-bold mb-2 ${
                tier.color === 'green' ? 'text-green-400' :
                tier.color === 'yellow' ? 'text-yellow-400' :
                'text-purple-400'
              }`}>
                {tier.name}
              </h4>
              <p className="text-gray-400 text-sm mb-3">{tier.description}</p>
              <div className={`text-xs px-2 py-1 rounded-full inline-block mb-4 ${
                tier.color === 'green' ? 'bg-green-500/20 text-green-400' :
                tier.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {tier.threshold}
              </div>
              <ul className="space-y-2">
                {tier.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {opportunities?.opportunities && opportunities.opportunities.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Investment Opportunities</h3>
            <span className="text-sm text-gray-400">From Capital Pools Contract</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.opportunities.map((opp) => (
              <div key={opp.id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white">{opp.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    opp.riskLevel === 'Low' ? 'bg-green-500/20 text-green-400' :
                    opp.riskLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {opp.riskLevel} Risk
                  </span>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white">{opp.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full"
                      style={{ width: `${opp.progress}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-gray-500">Target</div>
                    <div className="text-white">{parseFloat(opp.targetAmount).toLocaleString()} AXM</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Min Investment</div>
                    <div className="text-white">{parseFloat(opp.minContribution).toLocaleString()} AXM</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  {opp.investors} investors
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {graduatedGroups?.groups && graduatedGroups.groups.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Graduated Groups</h3>
          <div className="space-y-3">
            {graduatedGroups.groups.slice(0, 10).map((group) => (
              <div key={group.id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    group.mode === 'capital' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {group.mode === 'capital' ? '📈' : '🤝'}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{group.name}</div>
                    <div className="text-sm text-gray-400">
                      {group.categoryName || 'General'} • {group.memberCount} members
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    group.mode === 'capital' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {group.mode === 'capital' ? 'Capital Mode' : 'Community Mode'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Pool #{group.graduatedPoolId}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!opportunities?.opportunities?.length && !graduatedGroups?.groups?.length) && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">🌱</div>
          <h3 className="text-xl font-bold text-white mb-2">Start Your Wealth Practice Journey</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Join or create a SUSU savings circle to begin building wealth with your community. 
            Graduate to Capital Mode to access larger investment opportunities.
          </p>
          <Link href="/susu" className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-amber-500 transition-all">
            Explore SUSU Circles
          </Link>
        </div>
      )}

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
        <a 
          href={`https://arbitrum.blockscout.com/address/${opportunities?.contractAddress || '0xFcCdC1E353b24936f9A8D08D21aF684c620fa701'}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-yellow-400 transition-colors"
        >
          View CapitalPoolsAndFunds Contract on Blockscout →
        </a>
      </div>
    </div>
  );
}
