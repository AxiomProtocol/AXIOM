import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InvestmentMatching({ walletAddress, className = '' }) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOpportunities();
  }, [walletAddress]);

  const fetchOpportunities = async () => {
    try {
      const res = await fetch('/api/investments/matching');
      const data = await res.json();
      if (data.success) {
        setOpportunities(data.opportunities || []);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All', icon: '📊' },
    { id: 'realestate', label: 'Real Estate', icon: '🏘️' },
    { id: 'depin', label: 'DePIN', icon: '🖥️' },
    { id: 'treasury', label: 'Treasury', icon: '🏦' }
  ];

  const filtered = opportunities.filter(o => 
    filter === 'all' || o.category === filter
  );

  const getStatusColor = (status) => {
    if (status === 'open') return 'bg-green-500/20 text-green-400';
    if (status === 'filling') return 'bg-yellow-500/20 text-yellow-400';
    if (status === 'closed') return 'bg-gray-500/20 text-gray-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      realestate: '🏘️',
      depin: '🖥️',
      treasury: '🏦',
      governance: '🏛️'
    };
    return icons[category] || '📈';
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-xl p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🎯</div>
          <div>
            <h2 className="text-xl font-bold text-white">Investment Matching</h2>
            <p className="text-gray-400">Capital Mode opportunities matched to your group profile</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center gap-2 transition-colors ${
              filter === cat.id
                ? 'bg-yellow-500 text-black font-medium'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <p className="text-gray-400">No opportunities available in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((opp) => (
            <div key={opp.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getCategoryIcon(opp.category)}</div>
                    <div>
                      <h3 className="font-bold text-white">{opp.name}</h3>
                      <p className="text-sm text-gray-400">{opp.type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(opp.status)}`}>
                    {opp.status}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-4">{opp.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Min Investment</div>
                    <div className="text-white font-bold">${opp.minInvestment.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Expected Return</div>
                    <div className="text-green-400 font-bold">{opp.expectedReturn}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Duration</div>
                    <div className="text-white font-bold">{opp.duration}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Risk Level</div>
                    <div className={`font-bold ${
                      opp.riskLevel === 'Low' ? 'text-green-400' : 
                      opp.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-orange-400'
                    }`}>{opp.riskLevel}</div>
                  </div>
                </div>

                {opp.matchScore && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Match Score</span>
                      <span className="text-yellow-400 font-medium">{opp.matchScore}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-500 to-amber-500"
                        style={{ width: `${opp.matchScore}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors">
                    Learn More
                  </button>
                  {opp.status === 'open' && (
                    <button className="px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors">
                      Express Interest
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500">
          Investment opportunities are for Capital Mode groups only. 
          All investments carry risk. Not financial advice.
        </p>
      </div>
    </div>
  );
}
