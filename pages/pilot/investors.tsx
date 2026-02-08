import { useState, useEffect } from 'react';
import Head from 'next/head';
import PilotNav from '../../components/pilot/PilotNav';

interface Investor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  commitment_amount: string;
  funded_amount: string;
  pro_rata_share: string | null;
  accreditation_verified: boolean;
  kyc_completed: boolean;
  created_at: string;
}

interface CapitalCall {
  id: string;
  spv_id: string | null;
  call_number: number;
  total_amount: string;
  funded_amount: string;
  status: string;
  purpose: string;
  due_date: string;
  issued_at: string;
}

interface SpvOption {
  id: string;
  name: string;
}

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const statusBadgeColors: Record<string, string> = {
  invited: 'bg-gray-100 text-gray-700',
  onboarding: 'bg-blue-100 text-blue-800',
  committed: 'bg-amber-100 text-amber-800',
  funded: 'bg-green-100 text-green-800',
  active: 'bg-teal-100 text-teal-800',
  exited: 'bg-red-100 text-red-800',
};

const callStatusColors: Record<string, string> = {
  issued: 'bg-blue-100 text-blue-800',
  partially_funded: 'bg-amber-100 text-amber-800',
  fully_funded: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
};

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function PilotInvestors() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [capitalCalls, setCapitalCalls] = useState<CapitalCall[]>([]);
  const [spvOptions, setSpvOptions] = useState<SpvOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [investorForm, setInvestorForm] = useState({ name: '', email: '', phone: '', commitmentAmount: '' });
  const [investorSubmitting, setInvestorSubmitting] = useState(false);

  const [showCallModal, setShowCallModal] = useState(false);
  const [callForm, setCallForm] = useState({ spvId: '', totalAmount: '', purpose: '', dueDate: '' });
  const [callSubmitting, setCallSubmitting] = useState(false);

  async function fetchData() {
    try {
      const [invRes, callRes, spvRes] = await Promise.all([
        fetch('/api/pilot/investors'),
        fetch('/api/pilot/capital-calls'),
        fetch('/api/pilot/spvs'),
      ]);
      const [invResult, callResult, spvResult] = await Promise.all([
        invRes.json(),
        callRes.json(),
        spvRes.json(),
      ]);

      if (invResult.success) setInvestors(invResult.data || []);
      else setError(invResult.error);

      if (callResult.success) setCapitalCalls(callResult.data || []);
      if (spvResult.success) setSpvOptions((spvResult.data || []).map((s: any) => ({ id: s.id, name: s.name })));
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const totalCommitted = investors.reduce((sum, i) => sum + parseFloat(i.commitment_amount || '0'), 0);
  const totalFunded = investors.reduce((sum, i) => sum + parseFloat(i.funded_amount || '0'), 0);
  const avgCheckSize = investors.length > 0 ? totalCommitted / investors.length : 0;

  async function handleAddInvestor(e: React.FormEvent) {
    e.preventDefault();
    setInvestorSubmitting(true);
    try {
      const res = await fetch('/api/pilot/investors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(investorForm),
      });
      const result = await res.json();
      if (result.success) {
        setInvestors((prev) => [...prev, result.data]);
        setShowInvestorModal(false);
        setInvestorForm({ name: '', email: '', phone: '', commitmentAmount: '' });
      } else {
        alert(result.error || 'Failed to add investor');
      }
    } catch {
      alert('Failed to add investor');
    } finally {
      setInvestorSubmitting(false);
    }
  }

  async function handleCreateCall(e: React.FormEvent) {
    e.preventDefault();
    setCallSubmitting(true);
    try {
      const nextCallNumber = capitalCalls.length > 0
        ? Math.max(...capitalCalls.map((c) => c.call_number)) + 1
        : 1;
      const res = await fetch('/api/pilot/capital-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...callForm,
          callNumber: nextCallNumber,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setCapitalCalls((prev) => [...prev, result.data]);
        setShowCallModal(false);
        setCallForm({ spvId: '', totalAmount: '', purpose: '', dueDate: '' });
      } else {
        alert(result.error || 'Failed to create capital call');
      }
    } catch {
      alert('Failed to create capital call');
    } finally {
      setCallSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>National Economic Pilot — Investors</title>
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">National Economic Pilot</h1>
            <p className="text-gray-500 mt-1">Investor Management Portal</p>
          </div>

          <PilotNav currentTab="investors" />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              <span className="ml-3 text-gray-500">Loading investors...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Total Investors</p>
                  <p className="text-2xl font-bold text-gray-900">{investors.length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Total Committed</p>
                  <p className="text-2xl font-bold text-gray-900">{formatMoney(totalCommitted)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Total Funded</p>
                  <p className="text-2xl font-bold text-gray-900">{formatMoney(totalFunded)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Average Check Size</p>
                  <p className="text-2xl font-bold text-gray-900">{formatMoney(avgCheckSize)}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Investors</h2>
                  <button
                    onClick={() => setShowInvestorModal(true)}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Add Investor
                  </button>
                </div>
                {investors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commitment</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Funded</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pro-Rata</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">KYC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {investors.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{inv.email}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeColors[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                                {formatStatus(inv.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{formatMoney(inv.commitment_amount)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{formatMoney(inv.funded_amount)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-500">
                              {inv.pro_rata_share ? parseFloat(inv.pro_rata_share).toFixed(2) + '%' : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {inv.kyc_completed ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-400">No investors yet</p>
                    <p className="text-gray-400 text-sm mt-1">Click "Add Investor" to get started</p>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Capital Calls</h2>
                  <button
                    onClick={() => setShowCallModal(true)}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Create Capital Call
                  </button>
                </div>
                {capitalCalls.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Call #</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Funded</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {capitalCalls.map((call) => (
                          <tr key={call.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">#{call.call_number}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{formatMoney(call.total_amount)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{formatMoney(call.funded_amount)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${callStatusColors[call.status] || 'bg-gray-100 text-gray-700'}`}>
                                {formatStatus(call.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {call.due_date ? new Date(call.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{call.purpose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-400">No capital calls yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={showInvestorModal} onClose={() => setShowInvestorModal(false)} title="Add Investor">
        <form onSubmit={handleAddInvestor} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={investorForm.name}
              onChange={(e) => setInvestorForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={investorForm.email}
              onChange={(e) => setInvestorForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={investorForm.phone}
              onChange={(e) => setInvestorForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commitment Amount ($)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={investorForm.commitmentAmount}
              onChange={(e) => setInvestorForm((f) => ({ ...f, commitmentAmount: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowInvestorModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={investorSubmitting}
              className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {investorSubmitting ? 'Adding...' : 'Add Investor'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showCallModal} onClose={() => setShowCallModal(false)} title="Create Capital Call">
        <form onSubmit={handleCreateCall} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SPV</label>
            <select
              value={callForm.spvId}
              onChange={(e) => setCallForm((f) => ({ ...f, spvId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">All SPVs</option>
              {spvOptions.map((spv) => (
                <option key={spv.id} value={spv.id}>{spv.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={callForm.totalAmount}
              onChange={(e) => setCallForm((f) => ({ ...f, totalAmount: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <input
              type="text"
              required
              value={callForm.purpose}
              onChange={(e) => setCallForm((f) => ({ ...f, purpose: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              required
              value={callForm.dueDate}
              onChange={(e) => setCallForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCallModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={callSubmitting}
              className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {callSubmitting ? 'Creating...' : 'Create Capital Call'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
