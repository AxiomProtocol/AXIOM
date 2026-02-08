import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import PilotNav from '../../components/pilot/PilotNav';

interface AuditEntry {
  id: string;
  action: string;
  actor_id: string;
  actor_role: string;
  spv_id: string | null;
  description: string;
  amount: string | null;
  created_at: string;
}

interface AuditFilters {
  action: string;
  from: string;
  to: string;
  spvId: string;
  search: string;
  page: number;
}

const LIMIT = 25;

const actionTypes = [
  { value: '', label: 'All Actions' },
  { value: 'contribution_received', label: 'Contribution Received' },
  { value: 'contribution_confirmed', label: 'Contribution Confirmed' },
  { value: 'distribution_calculated', label: 'Distribution Calculated' },
  { value: 'distribution_approved', label: 'Distribution Approved' },
  { value: 'distribution_paid', label: 'Distribution Paid' },
  { value: 'reserve_allocation', label: 'Reserve Allocation' },
  { value: 'capital_call_issued', label: 'Capital Call Issued' },
  { value: 'capital_call_funded', label: 'Capital Call Funded' },
  { value: 'asset_purchased', label: 'Asset Purchased' },
  { value: 'valuation_updated', label: 'Valuation Updated' },
  { value: 'document_uploaded', label: 'Document Uploaded' },
  { value: 'investor_onboarded', label: 'Investor Onboarded' },
  { value: 'report_generated', label: 'Report Generated' },
  { value: 'configuration_changed', label: 'Configuration Changed' },
];

const actionBadgeColors: Record<string, string> = {
  contribution_received: 'bg-green-100 text-green-800',
  contribution_confirmed: 'bg-green-100 text-green-800',
  distribution_calculated: 'bg-blue-100 text-blue-800',
  distribution_approved: 'bg-blue-100 text-blue-800',
  distribution_paid: 'bg-blue-100 text-blue-800',
  reserve_allocation: 'bg-indigo-100 text-indigo-800',
  capital_call_issued: 'bg-amber-100 text-amber-800',
  capital_call_funded: 'bg-amber-100 text-amber-800',
  asset_purchased: 'bg-teal-100 text-teal-800',
  valuation_updated: 'bg-purple-100 text-purple-800',
  document_uploaded: 'bg-gray-100 text-gray-800',
  investor_onboarded: 'bg-emerald-100 text-emerald-800',
  report_generated: 'bg-sky-100 text-sky-800',
  configuration_changed: 'bg-red-100 text-red-800',
};

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({
    action: '',
    from: '',
    to: '',
    spvId: '',
    search: '',
    page: 1,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.set('action', filters.action);
      if (filters.from) params.set('startDate', filters.from);
      if (filters.to) params.set('endDate', filters.to);
      if (filters.spvId) params.set('spvId', filters.spvId);
      params.set('limit', String(LIMIT));
      params.set('offset', String((filters.page - 1) * LIMIT));

      const res = await fetch(`/api/pilot/audit?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : (result.data?.entries || []);
        setEntries(data);
        setTotalCount(result.data?.total || data.length);
      } else {
        setError(result.error || 'Failed to load audit trail');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  function updateFilter(key: keyof AuditFilters, value: string | number) {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? (value as number) : 1 }));
  }

  function exportCSV() {
    const filtered = entries.filter((e) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        return (e.description || '').toLowerCase().includes(s) ||
          (e.action || '').toLowerCase().includes(s) ||
          (e.actor_role || '').toLowerCase().includes(s);
      }
      return true;
    });

    const headers = ['Timestamp', 'Action', 'Actor', 'SPV', 'Amount', 'Description'];
    const rows = filtered.map((e) => [
      e.created_at ? new Date(e.created_at).toISOString() : '',
      formatAction(e.action),
      e.actor_role || e.actor_id || '',
      e.spv_id || '',
      e.amount ? parseFloat(e.amount).toFixed(2) : '',
      (e.description || '').replace(/"/g, '""'),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pilot-audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const displayedEntries = filters.search
    ? entries.filter((e) => {
        const s = filters.search.toLowerCase();
        return (e.description || '').toLowerCase().includes(s) ||
          (e.action || '').toLowerCase().includes(s) ||
          (e.actor_role || '').toLowerCase().includes(s);
      })
    : entries;

  return (
    <>
      <Head>
        <title>National Economic Pilot — Audit Trail</title>
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">National Economic Pilot</h1>
            <p className="text-gray-500 mt-1">Audit Trail</p>
          </div>

          <PilotNav currentTab="audit" />

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
                <select
                  value={filters.action}
                  onChange={(e) => updateFilter('action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  {actionTypes.map((at) => (
                    <option key={at.value} value={at.value}>{at.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => updateFilter('from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => updateFilter('to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">SPV Filter</label>
                <input
                  type="text"
                  value={filters.spvId}
                  onChange={(e) => updateFilter('spvId', e.target.value)}
                  placeholder="SPV ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Search description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              <span className="ml-3 text-gray-500">Loading audit trail...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          ) : displayedEntries.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-500">No audit entries found matching your filters</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SPV</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {entry.created_at ? formatTimestamp(entry.created_at) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                              actionBadgeColors[entry.action] || 'bg-gray-100 text-gray-700'
                            }`}>
                              {formatAction(entry.action)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {entry.actor_role || entry.actor_id || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {entry.spv_id || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {entry.amount ? formatMoney(entry.amount) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {entry.description || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Page {filters.page} of {totalPages} &middot; Total {totalCount} entries
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFilter('page', Math.max(1, filters.page - 1))}
                    disabled={filters.page <= 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => updateFilter('page', Math.min(totalPages, filters.page + 1))}
                    disabled={filters.page >= totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
