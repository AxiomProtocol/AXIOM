import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import SiteLayout from '../../../components/SiteLayout';

interface Note {
  id: number;
  note_number: string;
  principal: string;
  interest_rate: string;
  term_months: number;
  payment_frequency: string;
  issuer: string;
  borrower_entity_name: string;
  collateral_type: string;
  collateral_description: string;
  collateral_value: string;
  ltv_ratio: string;
  status: string;
  outstanding_principal: string;
  accrued_interest: string;
  total_payments_received: string;
  origination_date: string;
  maturity_date: string;
  first_payment_date: string;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: number;
  event_date: string;
  event_type: string;
  amount: string;
  principal_portion: string;
  interest_portion: string;
  balance_after: string;
}

interface Covenant {
  id: number;
  covenant_name: string;
  description: string;
  check_frequency: string;
  is_compliant: boolean | null;
  last_checked_at: string;
}

interface Document {
  id: number;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num || 0);
}

function formatPercent(rate: number | string): string {
  const num = typeof rate === 'string' ? parseFloat(rate) : rate;
  return `${(num * 100).toFixed(2)}%`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-blue-100 text-blue-800',
    current: 'bg-teal-100 text-teal-800',
    delinquent: 'bg-red-100 text-red-800',
    paid_off: 'bg-green-100 text-green-800',
    defaulted: 'bg-red-200 text-red-900',
    cancelled: 'bg-gray-200 text-gray-600',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100'}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

export default function NoteDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { address, isConnected } = useAccount();
  const [note, setNote] = useState<Note | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [covenants, setCovenants] = useState<Covenant[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'covenants' | 'documents'>('details');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Note>>({});
  const [saving, setSaving] = useState(false);

  const fetchNote = useCallback(async () => {
    if (!address || !id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notes/${id}`, {
        headers: { 'x-admin-wallet': address },
      });
      if (res.status === 401) {
        setError('Admin access required');
        return;
      }
      if (res.status === 404) {
        setError('Note not found');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch note');
      const data = await res.json();
      setNote(data.note);
      setPayments(data.payments || []);
      setCovenants(data.covenants || []);
      setDocuments(data.documents || []);
      setEditForm(data.note);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [address, id]);

  useEffect(() => {
    if (isConnected && address && id) {
      fetchNote();
    }
  }, [isConnected, address, id, fetchNote]);

  const handleSave = async () => {
    if (!address || !id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-wallet': address,
        },
        body: JSON.stringify({
          status: editForm.status,
          borrowerEntityName: editForm.borrower_entity_name,
          collateralType: editForm.collateral_type,
          collateralValue: editForm.collateral_value ? parseFloat(editForm.collateral_value as string) : null,
          outstandingPrincipal: editForm.outstanding_principal ? parseFloat(editForm.outstanding_principal as string) : null,
          accruedInterest: editForm.accrued_interest ? parseFloat(editForm.accrued_interest as string) : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update note');
      await fetchNote();
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isConnected) {
    return (
      <SiteLayout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-gray-600">Please connect your wallet to access this page.</p>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (loading) {
    return (
      <SiteLayout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">Loading...</div>
        </div>
      </SiteLayout>
    );
  }

  if (error || !note) {
    return (
      <SiteLayout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-red-600">{error || 'Note not found'}</p>
              <a href="/admin/notes" className="text-teal-600 hover:underline mt-4 block">Back to Notes</a>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <a href="/admin/notes" className="text-teal-600 hover:underline text-sm mb-2 block">← Back to Notes</a>
              <h1 className="text-3xl font-bold text-gray-900">{note.note_number}</h1>
              <p className="text-gray-600 mt-1">{note.borrower_entity_name || 'No borrower specified'}</p>
            </div>
            <div className="flex items-center space-x-4">
              <StatusBadge status={note.status} />
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50"
                >
                  Edit
                </button>
              ) : (
                <div className="space-x-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-500">Principal</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(note.principal)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-500">Outstanding</div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(note.outstanding_principal)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-500">Interest Rate</div>
              <div className="text-xl font-bold text-gray-900">{formatPercent(note.interest_rate)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-500">Payments Received</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(note.total_payments_received)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {(['details', 'payments', 'covenants', 'documents'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === tab
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'payments' && ` (${payments.length})`}
                    {tab === 'covenants' && ` (${covenants.length})`}
                    {tab === 'documents' && ` (${documents.length})`}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'details' && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Note Terms</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Term</dt>
                        <dd className="font-medium">{note.term_months} months</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Payment Frequency</dt>
                        <dd className="font-medium capitalize">{note.payment_frequency}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Issuer</dt>
                        <dd className="font-medium">{note.issuer}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Status</dt>
                        <dd>
                          {editing ? (
                            <select
                              value={editForm.status || note.status}
                              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                              className="border rounded px-2 py-1"
                            >
                              <option value="draft">Draft</option>
                              <option value="active">Active</option>
                              <option value="current">Current</option>
                              <option value="delinquent">Delinquent</option>
                              <option value="paid_off">Paid Off</option>
                              <option value="defaulted">Defaulted</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          ) : (
                            <StatusBadge status={note.status} />
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Collateral</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Type</dt>
                        <dd className="font-medium">{note.collateral_type || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Value</dt>
                        <dd className="font-medium">{note.collateral_value ? formatCurrency(note.collateral_value) : '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">LTV Ratio</dt>
                        <dd className="font-medium">{note.ltv_ratio ? formatPercent(note.ltv_ratio) : '-'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Key Dates</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Origination</dt>
                        <dd className="font-medium">{note.origination_date ? new Date(note.origination_date).toLocaleDateString() : '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Maturity</dt>
                        <dd className="font-medium">{note.maturity_date ? new Date(note.maturity_date).toLocaleDateString() : '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">First Payment</dt>
                        <dd className="font-medium">{note.first_payment_date ? new Date(note.first_payment_date).toLocaleDateString() : '-'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Balances</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Outstanding Principal</dt>
                        <dd className="font-medium">{formatCurrency(note.outstanding_principal)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Accrued Interest</dt>
                        <dd className="font-medium">{formatCurrency(note.accrued_interest)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Total Received</dt>
                        <dd className="font-medium text-green-600">{formatCurrency(note.total_payments_received)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}

              {activeTab === 'payments' && (
                <div>
                  {payments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No payment events recorded</p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Type</th>
                          <th className="pb-3 text-right">Amount</th>
                          <th className="pb-3 text-right">Principal</th>
                          <th className="pb-3 text-right">Interest</th>
                          <th className="pb-3 text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3">{new Date(p.event_date).toLocaleDateString()}</td>
                            <td className="py-3 capitalize">{p.event_type.replace('_', ' ')}</td>
                            <td className="py-3 text-right">{formatCurrency(p.amount)}</td>
                            <td className="py-3 text-right">{formatCurrency(p.principal_portion)}</td>
                            <td className="py-3 text-right">{formatCurrency(p.interest_portion)}</td>
                            <td className="py-3 text-right">{formatCurrency(p.balance_after)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'covenants' && (
                <div>
                  {covenants.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No covenants defined</p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase">
                          <th className="pb-3">Covenant</th>
                          <th className="pb-3">Frequency</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Last Checked</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {covenants.map((c) => (
                          <tr key={c.id}>
                            <td className="py-3 font-medium">{c.covenant_name}</td>
                            <td className="py-3 capitalize">{c.check_frequency}</td>
                            <td className="py-3">
                              {c.is_compliant === null ? (
                                <span className="text-gray-400">Unchecked</span>
                              ) : c.is_compliant ? (
                                <span className="text-green-600">Compliant</span>
                              ) : (
                                <span className="text-red-600">Non-Compliant</span>
                              )}
                            </td>
                            <td className="py-3">{c.last_checked_at ? new Date(c.last_checked_at).toLocaleDateString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div>
                  {documents.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No documents uploaded</p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase">
                          <th className="pb-3">Document</th>
                          <th className="pb-3">Type</th>
                          <th className="pb-3">Uploaded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {documents.map((d) => (
                          <tr key={d.id}>
                            <td className="py-3 font-medium">{d.file_name}</td>
                            <td className="py-3">{d.document_type}</td>
                            <td className="py-3">{new Date(d.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
