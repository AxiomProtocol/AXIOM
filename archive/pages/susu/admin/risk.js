import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';

export default function RiskManagementAdmin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [insurancePool, setInsurancePool] = useState(null);
  const [collateralStakes, setCollateralStakes] = useState([]);
  const [vettingRequests, setVettingRequests] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [poolRes, collateralRes, vettingRes, claimsRes] = await Promise.all([
        fetch('/api/susu/insurance?action=pool'),
        fetch('/api/susu/collateral'),
        fetch('/api/susu/vetting?status=pending'),
        fetch('/api/susu/insurance?action=claims')
      ]);
      
      const pool = await poolRes.json();
      const collateral = await collateralRes.json();
      const vetting = await vettingRes.json();
      const claimsData = await claimsRes.json();
      
      setInsurancePool(pool);
      setCollateralStakes(collateral.stakes || []);
      setVettingRequests(vetting.requests || []);
      setClaims(claimsData.claims || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleClaimReview = async (claimId, decision) => {
    try {
      const res = await fetch('/api/susu/insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          claimId,
          decision,
          reviewedBy: 1
        })
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error reviewing claim:', error);
    }
  };

  const formatAmount = (amount) => {
    return parseFloat(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'collateral', label: 'Collateral Stakes' },
    { id: 'vetting', label: 'Vetting Requests' },
    { id: 'insurance', label: 'Insurance Pool' },
    { id: 'claims', label: 'Insurance Claims' }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-yellow-500 mb-2">SUSU Risk Management</h1>
          <p className="text-gray-400 mb-6">Manage collateral, vetting, insurance, and payout priorities</p>

          <div className="flex space-x-2 mb-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-yellow-500 text-black font-semibold' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-gray-400 text-sm mb-2">Insurance Pool Balance</h3>
                    <p className="text-2xl font-bold text-green-400">
                      {formatAmount(insurancePool?.pool?.total_balance)} AXM
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {formatAmount(insurancePool?.pool?.total_contributions)} total contributed
                    </p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-gray-400 text-sm mb-2">Active Collateral</h3>
                    <p className="text-2xl font-bold text-yellow-400">
                      {collateralStakes.filter(s => s.status === 'staked').length} stakes
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {formatAmount(collateralStakes.filter(s => s.status === 'staked').reduce((sum, s) => sum + parseFloat(s.stake_amount || 0), 0))} AXM locked
                    </p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-gray-400 text-sm mb-2">Pending Vetting</h3>
                    <p className="text-2xl font-bold text-blue-400">
                      {vettingRequests.length} requests
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Awaiting member votes
                    </p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-gray-400 text-sm mb-2">Pending Claims</h3>
                    <p className="text-2xl font-bold text-red-400">
                      {claims.filter(c => c.status === 'pending').length} claims
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {formatAmount(insurancePool?.claimStats?.total_paid)} total paid out
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'collateral' && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold">Collateral Stakes</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-750">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">User</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Group</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Amount</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Status</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collateralStakes.map(stake => (
                          <tr key={stake.id} className="border-t border-gray-700 hover:bg-gray-750">
                            <td className="px-4 py-3">{stake.user_email || `User #${stake.user_id}`}</td>
                            <td className="px-4 py-3">{stake.group_name || 'N/A'}</td>
                            <td className="px-4 py-3 font-mono">{formatAmount(stake.stake_amount)} AXM</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                stake.status === 'staked' ? 'bg-green-900 text-green-300' :
                                stake.status === 'released' ? 'bg-blue-900 text-blue-300' :
                                'bg-red-900 text-red-300'
                              }`}>
                                {stake.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-sm">
                              {new Date(stake.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                        {collateralStakes.length === 0 && (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                              No collateral stakes yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'vetting' && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold">Pending Vetting Requests</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-750">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Applicant</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Group</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Reliability</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Votes</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Deadline</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vettingRequests.map(req => (
                          <tr key={req.id} className="border-t border-gray-700 hover:bg-gray-750">
                            <td className="px-4 py-3">{req.applicant_email || `User #${req.applicant_user_id}`}</td>
                            <td className="px-4 py-3">{req.group_name || `Group #${req.group_id}`}</td>
                            <td className="px-4 py-3">
                              <span className={`font-mono ${
                                req.reliability_score_at_application >= 80 ? 'text-green-400' :
                                req.reliability_score_at_application >= 50 ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {req.reliability_score_at_application || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-green-400">{req.approve_votes || 0}</span>
                              {' / '}
                              <span className="text-red-400">{req.reject_votes || 0}</span>
                              {' of '}
                              {req.votes_required}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-sm">
                              {req.voting_deadline ? new Date(req.voting_deadline).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                req.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                                req.status === 'approved' ? 'bg-green-900 text-green-300' :
                                'bg-red-900 text-red-300'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {vettingRequests.length === 0 && (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                              No pending vetting requests
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'insurance' && (
                <div className="space-y-6">
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">Insurance Pool Details</h2>
                    {insurancePool?.pool ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-gray-400 text-sm">Pool Name</p>
                          <p className="font-semibold">{insurancePool.pool.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Current Balance</p>
                          <p className="font-semibold text-green-400">{formatAmount(insurancePool.pool.total_balance)} AXM</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Fee Allocation</p>
                          <p className="font-semibold">{insurancePool.pool.fee_allocation_percent}%</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Max Claim Coverage</p>
                          <p className="font-semibold">{insurancePool.pool.max_claim_percent}%</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Total Contributions</p>
                          <p className="font-semibold">{formatAmount(insurancePool.pool.total_contributions)} AXM</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Total Claims Paid</p>
                          <p className="font-semibold text-red-400">{formatAmount(insurancePool.pool.total_claims_paid)} AXM</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Min Reserve</p>
                          <p className="font-semibold">{formatAmount(insurancePool.pool.min_pool_balance)} AXM</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Status</p>
                          <span className={`px-2 py-1 rounded text-xs ${
                            insurancePool.pool.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                          }`}>
                            {insurancePool.pool.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">No insurance pool configured</p>
                    )}
                  </div>

                  <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-700">
                      <h2 className="text-xl font-semibold">Recent Contributions</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-750">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm text-gray-400">Source Group</th>
                            <th className="px-4 py-3 text-left text-sm text-gray-400">Amount</th>
                            <th className="px-4 py-3 text-left text-sm text-gray-400">Original Fee</th>
                            <th className="px-4 py-3 text-left text-sm text-gray-400">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(insurancePool?.recentContributions || []).map(contrib => (
                            <tr key={contrib.id} className="border-t border-gray-700 hover:bg-gray-750">
                              <td className="px-4 py-3">{contrib.source_group_name || 'Direct'}</td>
                              <td className="px-4 py-3 font-mono text-green-400">+{formatAmount(contrib.amount)} AXM</td>
                              <td className="px-4 py-3 font-mono text-gray-400">{formatAmount(contrib.original_fee_amount)} AXM</td>
                              <td className="px-4 py-3 text-gray-400 text-sm">
                                {new Date(contrib.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                          {(!insurancePool?.recentContributions || insurancePool.recentContributions.length === 0) && (
                            <tr>
                              <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                No contributions yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'claims' && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold">Insurance Claims</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-750">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Claimant</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Defaulter</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Group</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Amount</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Status</th>
                          <th className="px-4 py-3 text-left text-sm text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {claims.map(claim => (
                          <tr key={claim.id} className="border-t border-gray-700 hover:bg-gray-750">
                            <td className="px-4 py-3">{claim.claimant_email || `User #${claim.claimant_user_id}`}</td>
                            <td className="px-4 py-3 text-red-400">{claim.defaulter_email || `User #${claim.defaulter_user_id}`}</td>
                            <td className="px-4 py-3">{claim.group_name || 'N/A'}</td>
                            <td className="px-4 py-3 font-mono">{formatAmount(claim.claim_amount)} AXM</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                claim.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                                claim.status === 'approved' ? 'bg-blue-900 text-blue-300' :
                                claim.status === 'paid' ? 'bg-green-900 text-green-300' :
                                claim.status === 'rejected' ? 'bg-red-900 text-red-300' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {claim.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {claim.status === 'pending' && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleClaimReview(claim.id, 'approve')}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleClaimReview(claim.id, 'reject')}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {claims.length === 0 && (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                              No insurance claims yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
