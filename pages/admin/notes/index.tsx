import React, { useState, useEffect, useCallback } from 'react';
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
  collateral_value: string;
  status: string;
  outstanding_principal: string;
  origination_date: string;
  maturity_date: string;
  created_at: string;
}

interface NoteSummary {
  totalNotes: number;
  activeNotes: number;
  currentNotes: number;
  delinquentNotes: number;
  paidOffNotes: number;
  totalOutstanding: number;
  totalPayments: number;
}

interface NotesData {
  notes: Note[];
  summary: NoteSummary;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

export default function AdminNotesPage() {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<NotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notes?status=${statusFilter}`, {
        headers: { 'x-admin-wallet': address },
      });
      if (res.status === 401) {
        setError('Admin access required');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch notes');
      const result = await res.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [address, statusFilter]);

  useEffect(() => {
    if (isConnected && address) {
      fetchNotes();
    }
  }, [isConnected, address, fetchNotes]);

  if (!isConnected) {
    return (
      <SiteLayout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Note Portal - Admin</h1>
              <p className="text-gray-600">Please connect your wallet to access the admin panel.</p>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (error === 'Admin access required') {
    return (
      <SiteLayout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
              <p className="text-gray-600">Your wallet is not authorized for admin access.</p>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Note Portal</h1>
              <p className="text-gray-600 mt-1">Manage private credit notes for self-funded treasury operations</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              + Create Note
            </button>
          </div>

          {data?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-500">Total Notes</div>
                <div className="text-2xl font-bold text-gray-900">{data.summary.totalNotes}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-500">Active</div>
                <div className="text-2xl font-bold text-blue-600">{data.summary.activeNotes}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-500">Current</div>
                <div className="text-2xl font-bold text-teal-600">{data.summary.currentNotes}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-500">Delinquent</div>
                <div className="text-2xl font-bold text-red-600">{data.summary.delinquentNotes}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-500">Paid Off</div>
                <div className="text-2xl font-bold text-green-600">{data.summary.paidOffNotes}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-500">Outstanding</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.summary.totalOutstanding)}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-500">Total Payments</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.totalPayments)}</div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="current">Current</option>
                  <option value="delinquent">Delinquent</option>
                  <option value="paid_off">Paid Off</option>
                  <option value="defaulted">Defaulted</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button onClick={fetchNotes} className="text-teal-600 hover:text-teal-700">
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading notes...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">{error}</div>
            ) : data?.notes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No notes found.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 text-teal-600 hover:underline"
                >
                  Create your first note
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrower</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Principal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Maturity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.notes.map((note) => (
                    <tr key={note.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{note.note_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{note.borrower_entity_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(note.principal)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatPercent(note.interest_rate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(note.outstanding_principal)}</td>
                      <td className="px-4 py-3"><StatusBadge status={note.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {note.maturity_date ? new Date(note.maturity_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/admin/notes/${note.id}`} className="text-teal-600 hover:underline text-sm">
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {data?.pagination && data.pagination.total > data.pagination.limit && (
              <div className="p-4 border-t border-gray-200 text-center text-sm text-gray-500">
                Showing {data.notes.length} of {data.pagination.total} notes
              </div>
            )}
          </div>

          {showCreateModal && (
            <CreateNoteModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                setShowCreateModal(false);
                fetchNotes();
              }}
              adminWallet={address!}
            />
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

function CreateNoteModal({ onClose, onSuccess, adminWallet }: { 
  onClose: () => void; 
  onSuccess: () => void; 
  adminWallet: string;
}) {
  const [formData, setFormData] = useState({
    noteNumber: '',
    principal: '',
    interestRate: '',
    termMonths: '',
    paymentFrequency: 'monthly',
    borrowerEntityName: '',
    collateralType: '',
    collateralValue: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-wallet': adminWallet,
        },
        body: JSON.stringify({
          noteNumber: formData.noteNumber,
          principal: parseFloat(formData.principal),
          interestRate: parseFloat(formData.interestRate) / 100,
          termMonths: parseInt(formData.termMonths),
          paymentFrequency: formData.paymentFrequency,
          borrowerEntityName: formData.borrowerEntityName || null,
          collateralType: formData.collateralType || null,
          collateralValue: formData.collateralValue ? parseFloat(formData.collateralValue) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create note');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create New Note</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note Number *</label>
            <input
              type="text"
              required
              value={formData.noteNumber}
              onChange={(e) => setFormData({ ...formData, noteNumber: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., PCN-2026-001"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Principal ($) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.principal}
                onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term (Months) *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.termMonths}
                onChange={(e) => setFormData({ ...formData, termMonths: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Frequency</label>
              <select
                value={formData.paymentFrequency}
                onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Borrower Entity Name</label>
            <input
              type="text"
              value={formData.borrowerEntityName}
              onChange={(e) => setFormData({ ...formData, borrowerEntityName: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collateral Type</label>
              <input
                type="text"
                value={formData.collateralType}
                onChange={(e) => setFormData({ ...formData, collateralType: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., Real Estate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collateral Value ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.collateralValue}
                onChange={(e) => setFormData({ ...formData, collateralValue: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
