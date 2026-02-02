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
  attestationCount?: number;
  totalEarnings?: number;
}

const PHASE_ORDER = ['APPLIED', 'VERIFIED', 'PROVISIONED', 'DRY_RUN_PASSED', 'CERTIFIED', 'ACTIVE'];
const PHASE_LABELS: Record<string, string> = {
  'APPLIED': 'Applied',
  'VERIFIED': 'Verified',
  'PROVISIONED': 'Provisioned',
  'DRY_RUN_PASSED': 'Dry-Run Complete',
  'CERTIFIED': 'Certified',
  'ACTIVE': 'Active',
  'REJECTED': 'Rejected',
};

export default function OperatorAdminPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [operatorDetails, setOperatorDetails] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchOperators();
    }
  }, [isAdmin]);

  const checkAdminStatus = async (wallet: string) => {
    try {
      const res = await fetch('/api/admin/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.isAdmin;
      }
    } catch (e) {
      console.error('Admin check failed:', e);
    }
    return false;
  };

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts[0]) {
          const addr = accounts[0].toLowerCase();
          setWalletAddress(addr);
          const adminStatus = await checkAdminStatus(addr);
          setIsAdmin(adminStatus);
          if (!adminStatus) {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error('Wallet check failed:', e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts[0]) {
          const addr = accounts[0].toLowerCase();
          setWalletAddress(addr);
          const adminStatus = await checkAdminStatus(addr);
          setIsAdmin(adminStatus);
        }
      } catch (e) {
        console.error('Wallet connection failed:', e);
      }
    } else {
      alert('Please install MetaMask');
    }
  };

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

  const fetchOperatorDetails = async (operatorId: string) => {
    try {
      const res = await fetch(`/api/admin/operators/${operatorId}`);
      if (res.ok) {
        const data = await res.json();
        setOperatorDetails(data);
        setShowDetailsModal(true);
      }
    } catch (e) {
      console.error('Failed to fetch operator details:', e);
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
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-wallet': walletAddress,
        },
        body: JSON.stringify({ operatorId, newPhase: nextPhase }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const emailMsg = data.emailSent ? ' - Email sent' : (data.emailError ? ` (Email failed: ${data.emailError})` : '');
        setMessage({ type: 'success', text: `Operator advanced to ${PHASE_LABELS[nextPhase]}${emailMsg}` });
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
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return;
    
    setActionLoading(operatorId);
    try {
      const res = await fetch('/api/admin/operators/reject', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-wallet': walletAddress,
        },
        body: JSON.stringify({ operatorId, reason: reason || undefined }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const emailMsg = data.emailSent ? ' - Email sent' : '';
        setMessage({ type: 'success', text: `Application rejected${emailMsg}` });
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

  const sendEmail = async () => {
    if (!selectedOperator || !emailSubject || !emailMessage) return;
    
    setEmailSending(true);
    try {
      const res = await fetch('/api/admin/operators/send-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-wallet': walletAddress,
        },
        body: JSON.stringify({ 
          operatorId: selectedOperator.operatorId, 
          subject: emailSubject, 
          message: emailMessage 
        }),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: `Email sent to ${selectedOperator.email}` });
        setShowEmailModal(false);
        setEmailSubject('');
        setEmailMessage('');
        setSelectedOperator(null);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.message || 'Failed to send email' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to send email' });
    } finally {
      setEmailSending(false);
    }
  };

  const openEmailModal = (op: Operator) => {
    setSelectedOperator(op);
    setShowEmailModal(true);
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

  const stats = {
    total: operators.length,
    pending: operators.filter(op => op.status === 'APPLIED').length,
    active: operators.filter(op => op.status === 'ACTIVE').length,
    onboarding: operators.filter(op => !['APPLIED', 'ACTIVE', 'REJECTED'].includes(op.status)).length,
  };

  if (!walletAddress) {
    return (
      <>
        <Head>
          <title>Operator Admin | Axiom</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
            <p className="text-gray-500 mb-6">Connect your admin wallet to access this panel.</p>
            <button
              onClick={connectWallet}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Head>
          <title>Operator Admin | Axiom</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-4">This wallet does not have admin privileges.</p>
            <p className="text-xs text-gray-400 font-mono break-all">{walletAddress}</p>
            <Link href="/" className="inline-block mt-6 text-teal-600 hover:text-teal-700">
              Return to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

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
              <div className="text-xs text-gray-400 font-mono">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Operators</div>
            </div>
            <div className="bg-white rounded-xl border border-yellow-200 p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending Review</div>
            </div>
            <div className="bg-white rounded-xl border border-blue-200 p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.onboarding}</div>
              <div className="text-sm text-gray-500">In Onboarding</div>
            </div>
            <div className="bg-white rounded-xl border border-green-200 p-4">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
          </div>

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
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => fetchOperatorDetails(op.operatorId)}
                            className="inline-flex items-center px-2 py-1.5 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEmailModal(op)}
                            className="inline-flex items-center px-2 py-1.5 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100"
                            title="Send Email"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                          {op.status !== 'ACTIVE' && op.status !== 'REJECTED' && (
                            <>
                              <button
                                onClick={() => advancePhase(op.operatorId, op.status)}
                                disabled={actionLoading === op.operatorId}
                                className="inline-flex items-center px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
                              >
                                {actionLoading === op.operatorId ? '...' : `Advance`}
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
                            <span className="text-xs text-green-600 font-medium px-2">Active</span>
                          )}
                          {op.status === 'REJECTED' && (
                            <span className="text-xs text-red-600 font-medium px-2">Rejected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showEmailModal && selectedOperator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Send Email</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="mb-4">
              <div className="text-sm text-gray-500">To: {selectedOperator.displayName} ({selectedOperator.email})</div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter subject..."
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter your message..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={sendEmail}
                disabled={emailSending || !emailSubject || !emailMessage}
                className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {emailSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && operatorDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Operator Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Display Name</div>
                <div className="font-medium">{operatorDetails.operator.displayName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Email</div>
                <div className="font-medium">{operatorDetails.operator.email}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Wallet Address</div>
                <div className="font-mono text-sm break-all">{operatorDetails.operator.walletAddress}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Operator ID</div>
                <div className="font-mono text-sm">{operatorDetails.operator.operatorId}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Role</div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(operatorDetails.operator.role)}`}>
                  {operatorDetails.operator.role}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Status</div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(operatorDetails.operator.status)}`}>
                  {PHASE_LABELS[operatorDetails.operator.status] || operatorDetails.operator.status}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Statistics</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-900">{operatorDetails.operator.attestationCount || 0}</div>
                  <div className="text-xs text-gray-500">Attestations</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-900">${operatorDetails.operator.totalEarnings?.toFixed(2) || '0.00'}</div>
                  <div className="text-xs text-gray-500">Total Earnings</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-900">{operatorDetails.operator.settlementsCompleted || 0}</div>
                  <div className="text-xs text-gray-500">Settlements</div>
                </div>
              </div>
            </div>

            {operatorDetails.onboarding && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Onboarding Timeline</h4>
                <div className="space-y-2 text-sm">
                  {operatorDetails.onboarding.applicationSubmittedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Application Submitted</span>
                      <span>{new Date(operatorDetails.onboarding.applicationSubmittedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {operatorDetails.onboarding.verificationCompletedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Verification Completed</span>
                      <span>{new Date(operatorDetails.onboarding.verificationCompletedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {operatorDetails.onboarding.provisioningCompletedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Provisioning Completed</span>
                      <span>{new Date(operatorDetails.onboarding.provisioningCompletedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {operatorDetails.onboarding.dryRunCompletedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dry-Run Completed</span>
                      <span>{new Date(operatorDetails.onboarding.dryRunCompletedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {operatorDetails.onboarding.certificationCompletedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Certification Completed</span>
                      <span>{new Date(operatorDetails.onboarding.certificationCompletedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {operatorDetails.onboarding.activationCompletedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Activation Completed</span>
                      <span>{new Date(operatorDetails.onboarding.activationCompletedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {operatorDetails.onboarding.expiresAt && (
                    <div className="flex justify-between text-amber-600">
                      <span>Application Expires</span>
                      <span>{new Date(operatorDetails.onboarding.expiresAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
