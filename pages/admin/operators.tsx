import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Operator {
  operatorId: string;
  walletAddress: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  onboardingPhase: string;
  createdAt: string;
  activatedAt?: string;
}

interface OnboardingData {
  onboardingId: string;
  currentPhase: string;
  applicationSubmittedAt: string;
  expiresAt: string;
}

const PHASE_ORDER = ['APPLIED', 'VERIFIED', 'PROVISIONED', 'DRY_RUN_PASSED', 'CERTIFIED', 'ACTIVE'];
const PHASE_LABELS: Record<string, string> = {
  'APPLIED': 'Applied',
  'VERIFIED': 'Verified',
  'PROVISIONED': 'Provisioned',
  'DRY_RUN_PASSED': 'Dry-Run Complete',
  'CERTIFIED': 'Certified',
  'ACTIVE': 'Active',
};

export default function OperatorAdminPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      const res = await fetch('/api/admin/operators');
      if (res.ok) {
        const data = await res.json();
        setOperators(data.operators || []);
      }
    } catch (e) {
      console.error('Failed to fetch operators:', e);
    } finally {
      setLoading(false);
    }
  };

  const advancePhase = async (operatorId: string, currentPhase: string) => {
    const currentIndex = PHASE_ORDER.indexOf(currentPhase);
    if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) return;
    
    const nextPhase = PHASE_ORDER[currentIndex + 1];
    setActionLoading(operatorId);
    
    try {
      const res = await fetch('/api/admin/operators/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, newPhase: nextPhase }),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: `Operator advanced to ${PHASE_LABELS[nextPhase]}` });
        fetchOperators();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.message || 'Failed to advance operator' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to advance operator' });
    } finally {
      setActionLoading(null);
    }
  };

  const rejectOperator = async (operatorId: string) => {
    if (!confirm('Are you sure you want to reject this application? This cannot be undone.')) return;
    
    setActionLoading(operatorId);
    try {
      const res = await fetch('/api/admin/operators/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId }),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Application rejected' });
        fetchOperators();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.message || 'Failed to reject' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to reject application' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOperators = operators.filter(op => {
    if (filter === 'all') return true;
    if (filter === 'pending') return op.status === 'APPLIED';
    if (filter === 'active') return op.status === 'ACTIVE';
    if (filter === 'onboarding') return !['APPLIED', 'ACTIVE', 'REJECTED'].includes(op.status);
    return true;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OBSERVER': return 'bg-blue-100 text-blue-800';
      case 'VALIDATOR': return 'bg-teal-100 text-teal-800';
      case 'ATTESTOR': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'APPLIED': return 'bg-yellow-100 text-yellow-800';
      case 'VERIFIED': return 'bg-blue-100 text-blue-800';
      case 'PROVISIONED': return 'bg-indigo-100 text-indigo-800';
      case 'DRY_RUN_PASSED': return 'bg-cyan-100 text-cyan-800';
      case 'CERTIFIED': return 'bg-emerald-100 text-emerald-800';
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Head>
        <title>Operator Admin | Axiom</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Node Operator Admin</h1>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{operators.length} total operators</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {message.text}
              <button onClick={() => setMessage(null)} className="float-right font-bold">&times;</button>
            </div>
          )}

          <div className="mb-6 flex items-center space-x-2">
            {['all', 'pending', 'onboarding', 'active'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'All' : f === 'pending' ? 'Pending Review' : f === 'onboarding' ? 'In Onboarding' : 'Active'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading operators...</p>
            </div>
          ) : filteredOperators.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No operators found</h3>
              <p className="text-gray-500 mt-1">No operators match the current filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOperators.map((op) => (
                    <tr key={op.operatorId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{op.displayName}</div>
                            <div className="text-sm text-gray-500">{op.email}</div>
                            <div className="text-xs text-gray-400 font-mono">{op.walletAddress.slice(0, 10)}...{op.walletAddress.slice(-6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(op.role)}`}>
                          {op.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(op.status)}`}>
                          {PHASE_LABELS[op.status] || op.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(op.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {op.status !== 'ACTIVE' && op.status !== 'REJECTED' && (
                          <>
                            <button
                              onClick={() => advancePhase(op.operatorId, op.status)}
                              disabled={actionLoading === op.operatorId}
                              className="inline-flex items-center px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
                            >
                              {actionLoading === op.operatorId ? 'Processing...' : `Advance to ${PHASE_LABELS[PHASE_ORDER[PHASE_ORDER.indexOf(op.status) + 1]] || 'Next'}`}
                            </button>
                            <button
                              onClick={() => rejectOperator(op.operatorId)}
                              disabled={actionLoading === op.operatorId}
                              className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {op.status === 'ACTIVE' && (
                          <span className="text-xs text-green-600 font-medium">Fully Active</span>
                        )}
                        {op.status === 'REJECTED' && (
                          <span className="text-xs text-red-600 font-medium">Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
