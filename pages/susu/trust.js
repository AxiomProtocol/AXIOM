import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

export default function TrustCenterPage() {
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    fetchTrustCenterData();
  }, []);

  const fetchTrustCenterData = async () => {
    try {
      const res = await fetch('/api/susu/trust-center');
      if (res.ok) {
        const data = await res.json();
        setTrustData(data.trustCenter);
      } else {
        setError('Failed to load trust center data');
      }
    } catch (err) {
      setError('Failed to load trust center data');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'custody', label: 'Custody Model' },
    { id: 'risks', label: 'Risk Disclosures' },
    { id: 'claims', label: 'Marketing Claims' },
    { id: 'thresholds', label: 'Capital Mode' },
    { id: 'stats', label: 'Operational Stats' }
  ];

  if (loading) {
    return (
      <Layout title="Trust Center - Axiom SUSU">
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-yellow-400 text-xl">Loading Trust Center...</div>
        </div>
      </Layout>
    );
  }

  if (error || !trustData) {
    return (
      <Layout title="Trust Center - Axiom SUSU">
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-red-400 text-xl">{error || 'Failed to load data'}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Trust Center - Axiom SUSU">
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-4">
              Trust Center
            </h1>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Complete transparency about how Axiom SUSU works, our custody model, risk disclosures, 
              and what we can and cannot claim about our service.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeSection === 'overview' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">{trustData.productName}</h2>
              <p className="text-gray-300 text-lg mb-6">{trustData.description}</p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-yellow-400">{trustData.operationalStats?.active_groups || 0}</div>
                  <div className="text-gray-400 mt-1">Active Groups</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-yellow-400">{trustData.operationalStats?.total_participants || 0}</div>
                  <div className="text-gray-400 mt-1">Total Participants</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-yellow-400">{trustData.operationalStats?.graduated_pools || 0}</div>
                  <div className="text-gray-400 mt-1">Graduated to On-Chain</div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'custody' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">Custody Model</h2>
              
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🔒</span>
                  <span className="text-xl font-bold text-green-400 uppercase">
                    {trustData.custodyModel?.type}
                  </span>
                </div>
                <p className="text-gray-300">{trustData.custodyModel?.description}</p>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-3">Smart Contract Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contract Address:</span>
                    <a 
                      href={`https://arbiscan.io/address/${trustData.custodyModel?.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:underline font-mono"
                    >
                      {trustData.custodyModel?.contractAddress}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-white">{trustData.custodyModel?.network}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'risks' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-yellow-400 mb-6">Risk Disclosures</h2>
              <p className="text-gray-400 mb-6">
                Please read and understand these risks before participating in any SUSU pool.
              </p>
              
              <div className="space-y-4">
                {trustData.riskDisclosures?.map((risk, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-6 border-l-4 border-yellow-400">
                    <h3 className="font-semibold text-white mb-2">{risk.category}</h3>
                    <p className="text-gray-300">{risk.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'claims' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-yellow-400 mb-6">Marketing Claims Policy</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                    <span>✓</span> What We CAN Say
                  </h3>
                  <ul className="space-y-2">
                    {trustData.allowedClaims?.map((claim, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <span className="text-green-400 mt-1">•</span>
                        {claim}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                    <span>✗</span> What We CANNOT Say
                  </h3>
                  <ul className="space-y-2">
                    {trustData.prohibitedClaims?.map((claim, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <span className="text-red-400 mt-1">•</span>
                        {claim}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'thresholds' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">Capital Mode Thresholds</h2>
              <p className="text-gray-400 mb-6">
                When a SUSU pool exceeds any of these thresholds, it automatically enters "Capital Mode" 
                with enhanced governance, disclosures, and compliance requirements.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(trustData.capitalModeThresholds || {}).map(([key, data]) => (
                  <div key={key} className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {key.includes('usd') ? `$${data.value?.toLocaleString()}` : data.value}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{data.description}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                <h4 className="font-semibold text-blue-400 mb-2">Community Mode vs Capital Mode</h4>
                <p className="text-gray-300 text-sm">
                  <strong>Community Mode</strong> is the default for smaller, community-focused savings circles. 
                  <strong> Capital Mode</strong> activates automatically for larger pools, requiring enhanced 
                  charter agreements, additional disclosures, and stricter governance to protect participants.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'stats' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-yellow-400 mb-6">Operational Statistics</h2>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-white">{trustData.operationalStats?.active_hubs || 0}</div>
                  <div className="text-gray-400">Active Regional Hubs</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-white">{trustData.operationalStats?.active_groups || 0}</div>
                  <div className="text-gray-400">Active Purpose Groups</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-white">{trustData.operationalStats?.total_participants || 0}</div>
                  <div className="text-gray-400">Total Participants</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-white">{trustData.operationalStats?.graduated_pools || 0}</div>
                  <div className="text-gray-400">Graduated to On-Chain</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-white">{trustData.operationalStats?.total_charters || 0}</div>
                  <div className="text-gray-400">Total Charters Created</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-white">{trustData.operationalStats?.total_charter_acceptances || 0}</div>
                  <div className="text-gray-400">Charter Acceptances</div>
                </div>
              </div>

              <div className="mt-6 text-sm text-gray-500 text-center">
                Last updated: {new Date(trustData.lastUpdated).toLocaleString()}
              </div>
            </div>
          )}

          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold text-white mb-4">Need Help?</h3>
            <div className="flex justify-center gap-4">
              <a 
                href={`mailto:${trustData.supportContact?.email}`}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
              >
                Contact Support
              </a>
              <a 
                href="/susu"
                className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 rounded-lg text-black font-semibold transition-colors"
              >
                Explore SUSU Pools
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
