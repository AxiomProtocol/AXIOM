import { useState, useEffect } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
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

function getStatusStyle(status: string): string {
  switch (status) {
    case 'funded':
    case 'active':
      return 'text-xs font-dl-mono text-dl-forest';
    case 'exited':
      return 'text-xs font-dl-mono text-dl-error';
    default:
      return 'text-xs font-dl-mono text-dl-gray';
  }
}

function getCallStatusStyle(status: string): string {
  switch (status) {
    case 'fully_funded':
      return 'text-xs font-dl-mono text-dl-forest';
    case 'cancelled':
      return 'text-xs font-dl-mono text-dl-error';
    default:
      return 'text-xs font-dl-mono text-dl-gray';
  }
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-dl-bg border border-dl-border max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-dl-serif text-lg text-dl-navy">{title}</h3>
          <button onClick={onClose} className="text-dl-gray">
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
    <DesignLawLayout>
      <Head>
        <title>Axiom Capital Program — Investor Portal</title>
      </Head>

      <div className="mb-6">
        <h1 className="font-dl-serif text-3xl text-dl-navy">Axiom Capital Program</h1>
        <p className="text-sm text-dl-gray mt-1">Manage investors, track commitments, and issue capital calls</p>
      </div>

      <PilotNav currentTab="investors" />

      <div className="border border-dl-border bg-dl-bg-alt p-5 mb-8">
        <p className="text-sm text-dl-gray leading-relaxed">This portal tracks every investor in the pilot program — from initial commitment through funding and ongoing participation. Check sizes range from $25,000 to $75,000, supporting 20-30 qualified investors.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-dl-gray font-dl-mono">Loading investors...</p>
        </div>
      ) : error ? (
        <div className="border border-dl-error p-6">
          <p className="text-dl-error font-medium">Error</p>
          <p className="text-dl-gray text-sm mt-1">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-dl-border mb-8">
            <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
              <p className="text-xs text-dl-gray mb-1">Total Investors</p>
              <p className="font-dl-mono text-lg font-semibold text-dl-navy">{investors.length}</p>
            </div>
            <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
              <p className="text-xs text-dl-gray mb-1">Total Committed</p>
              <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatMoney(totalCommitted)}</p>
            </div>
            <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
              <p className="text-xs text-dl-gray mb-1">Total Funded</p>
              <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatMoney(totalFunded)}</p>
            </div>
            <div className="px-4 py-4 bg-dl-bg">
              <p className="text-xs text-dl-gray mb-1">Average Check Size</p>
              <p className="font-dl-mono text-lg font-semibold text-dl-navy">{formatMoney(avgCheckSize)}</p>
            </div>
          </div>

          <div className="border border-dl-border mb-8">
            <div className="flex items-center justify-between p-6 border-b border-dl-border">
              <SectionHeading className="mb-0 border-b-0 pb-0">Investors</SectionHeading>
              <button
                onClick={() => setShowInvestorModal(true)}
                className="px-4 py-2 bg-dl-navy text-white text-sm font-medium"
              >
                Add Investor
              </button>
            </div>
            {investors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-dl-border">
                  <thead className="bg-dl-bg-alt">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Commitment</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Funded</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Pro-Rata</th>
                      <th className="px-4 py-3 text-center text-xs font-dl-mono text-dl-gray uppercase">KYC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investors.map((inv, i) => (
                      <tr key={inv.id} className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                        <td className="px-4 py-3 text-sm font-medium text-dl-navy">{inv.name}</td>
                        <td className="px-4 py-3 text-sm text-dl-gray">{inv.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={getStatusStyle(inv.status)}>
                            {formatStatus(inv.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-dl-mono text-dl-navy">{formatMoney(inv.commitment_amount)}</td>
                        <td className="px-4 py-3 text-sm text-right font-dl-mono text-dl-navy">{formatMoney(inv.funded_amount)}</td>
                        <td className="px-4 py-3 text-sm text-right text-dl-gray">
                          {inv.pro_rata_share ? parseFloat(inv.pro_rata_share).toFixed(2) + '%' : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {inv.kyc_completed ? (
                            <span className="text-xs font-dl-mono text-dl-forest">
                              <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          ) : (
                            <span className="text-xs font-dl-mono text-dl-gray">
                              <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
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
              <div className="p-8 text-center bg-dl-bg-alt">
                <p className="text-dl-gray">No investors yet</p>
                <p className="text-dl-gray text-sm mt-1">Click "Add Investor" to get started</p>
              </div>
            )}
          </div>

          <div className="border border-dl-border">
            <div className="flex items-center justify-between p-6 border-b border-dl-border">
              <SectionHeading className="mb-0 border-b-0 pb-0">Capital Calls</SectionHeading>
              <button
                onClick={() => setShowCallModal(true)}
                className="px-4 py-2 bg-dl-navy text-white text-sm font-medium"
              >
                Create Capital Call
              </button>
            </div>
            {capitalCalls.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-dl-border">
                  <thead className="bg-dl-bg-alt">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Call #</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-dl-mono text-dl-gray uppercase">Funded</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capitalCalls.map((call, i) => (
                      <tr key={call.id} className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                        <td className="px-4 py-3 text-sm font-medium text-dl-navy">#{call.call_number}</td>
                        <td className="px-4 py-3 text-sm text-right font-dl-mono text-dl-navy">{formatMoney(call.total_amount)}</td>
                        <td className="px-4 py-3 text-sm text-right font-dl-mono text-dl-navy">{formatMoney(call.funded_amount)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={getCallStatusStyle(call.status)}>
                            {formatStatus(call.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-dl-gray">
                          {call.due_date ? new Date(call.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-dl-navy">{call.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-dl-bg-alt">
                <p className="text-dl-gray">No capital calls yet</p>
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={showInvestorModal} onClose={() => setShowInvestorModal(false)} title="Add Investor">
        <form onSubmit={handleAddInvestor} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dl-navy mb-1">Name</label>
            <input
              type="text"
              required
              value={investorForm.name}
              onChange={(e) => setInvestorForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dl-navy mb-1">Email</label>
            <input
              type="email"
              required
              value={investorForm.email}
              onChange={(e) => setInvestorForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dl-navy mb-1">Phone</label>
            <input
              type="tel"
              value={investorForm.phone}
              onChange={(e) => setInvestorForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dl-navy mb-1">Commitment Amount ($)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={investorForm.commitmentAmount}
              onChange={(e) => setInvestorForm((f) => ({ ...f, commitmentAmount: e.target.value }))}
              className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowInvestorModal(false)}
              className="flex-1 px-4 py-2 border border-dl-border text-dl-navy text-sm font-medium bg-dl-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={investorSubmitting}
              className="flex-1 px-4 py-2 bg-dl-navy text-white text-sm font-medium disabled:opacity-50"
            >
              {investorSubmitting ? 'Adding...' : 'Add Investor'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showCallModal} onClose={() => setShowCallModal(false)} title="Create Capital Call">
        <form onSubmit={handleCreateCall} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dl-navy mb-1">SPV</label>
            <select
              value={callForm.spvId}
              onChange={(e) => setCallForm((f) => ({ ...f, spvId: e.target.value }))}
              className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
            >
              <option value="">All SPVs</option>
              {spvOptions.map((spv) => (
                <option key={spv.id} value={spv.id}>{spv.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dl-navy mb-1">Amount ($)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={callForm.totalAmount}
              onChange={(e) => setCallForm((f) => ({ ...f, totalAmount: e.target.value }))}
              className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dl-navy mb-1">Purpose</label>
            <input
              type="text"
              required
              value={callForm.purpose}
              onChange={(e) => setCallForm((f) => ({ ...f, purpose: e.target.value }))}
              className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dl-navy mb-1">Due Date</label>
            <input
              type="date"
              required
              value={callForm.dueDate}
              onChange={(e) => setCallForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full border border-dl-border px-3 py-2 text-sm text-dl-navy bg-dl-bg"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCallModal(false)}
              className="flex-1 px-4 py-2 border border-dl-border text-dl-navy text-sm font-medium bg-dl-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={callSubmitting}
              className="flex-1 px-4 py-2 bg-dl-navy text-white text-sm font-medium disabled:opacity-50"
            >
              {callSubmitting ? 'Creating...' : 'Create Capital Call'}
            </button>
          </div>
        </form>
      </Modal>
    </DesignLawLayout>
  );
}
