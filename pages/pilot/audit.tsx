import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
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

function getActionStyle(action: string): string {
  switch (action) {
    case 'contribution_received':
    case 'contribution_confirmed':
    case 'investor_onboarded':
      return 'text-xs font-dl-mono text-dl-forest';
    case 'configuration_changed':
      return 'text-xs font-dl-mono text-dl-error';
    default:
      return 'text-xs font-dl-mono text-dl-gray';
  }
}

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
    <DesignLawLayout>
      <Head>
        <title>Axiom Capital Program — Compliance Audit Trail</title>
      </Head>

      <div className="mb-6">
        <h1 className="font-dl-serif text-3xl text-dl-navy">Compliance Audit Trail</h1>
        <p className="text-sm text-dl-gray mt-1">Complete, immutable record of every financial action in the pilot program</p>
      </div>

      <PilotNav currentTab="audit" />

      <div className="border border-dl-border bg-dl-bg-alt p-5 mb-8">
        <p className="text-sm text-dl-gray leading-relaxed">Every contribution, distribution, capital call, valuation update, and configuration change is logged with timestamps, actors, and amounts. This audit trail provides the institutional-grade transparency that investors and regulators expect.</p>
      </div>

      <div className="border border-dl-border p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-dl-gray mb-1">Action Type</label>
            <select
              value={filters.action}
              onChange={(e) => updateFilter('action', e.target.value)}
              className="w-full px-3 py-2 border border-dl-border text-sm text-dl-navy bg-dl-bg"
            >
              {actionTypes.map((at) => (
                <option key={at.value} value={at.value}>{at.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dl-gray mb-1">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => updateFilter('from', e.target.value)}
              className="w-full px-3 py-2 border border-dl-border text-sm text-dl-navy bg-dl-bg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dl-gray mb-1">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => updateFilter('to', e.target.value)}
              className="w-full px-3 py-2 border border-dl-border text-sm text-dl-navy bg-dl-bg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dl-gray mb-1">SPV Filter</label>
            <input
              type="text"
              value={filters.spvId}
              onChange={(e) => updateFilter('spvId', e.target.value)}
              placeholder="SPV ID"
              className="w-full px-3 py-2 border border-dl-border text-sm text-dl-navy bg-dl-bg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dl-gray mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search description..."
              className="w-full px-3 py-2 border border-dl-border text-sm text-dl-navy bg-dl-bg"
            />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-dl-navy text-white text-sm font-medium"
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
          <p className="text-sm text-dl-gray font-dl-mono">Loading audit trail...</p>
        </div>
      ) : error ? (
        <div className="border border-dl-error p-6">
          <p className="text-dl-error font-medium">Error</p>
          <p className="text-dl-gray text-sm mt-1">{error}</p>
        </div>
      ) : displayedEntries.length === 0 ? (
        <div className="border border-dl-border p-8 bg-dl-bg-alt text-center">
          <p className="text-dl-gray">No audit entries found matching your filters</p>
        </div>
      ) : (
        <>
          <div className="border border-dl-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border border-dl-border">
                <thead className="bg-dl-bg-alt">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">SPV</th>
                    <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-dl-mono text-dl-gray uppercase">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEntries.map((entry, i) => (
                    <tr key={entry.id} className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                      <td className="px-4 py-3 text-sm text-dl-gray whitespace-nowrap">
                        {entry.created_at ? formatTimestamp(entry.created_at) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={getActionStyle(entry.action)}>
                          {formatAction(entry.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-dl-navy">
                        {entry.actor_role || entry.actor_id || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-dl-gray">
                        {entry.spv_id || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-dl-mono text-dl-navy whitespace-nowrap">
                        {entry.amount ? formatMoney(entry.amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-dl-gray max-w-xs truncate">
                        {entry.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-dl-gray">
              Page {filters.page} of {totalPages} &middot; Total {totalCount} entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter('page', Math.max(1, filters.page - 1))}
                disabled={filters.page <= 1}
                className="px-4 py-2 border border-dl-border text-sm font-medium text-dl-navy bg-dl-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => updateFilter('page', Math.min(totalPages, filters.page + 1))}
                disabled={filters.page >= totalPages}
                className="px-4 py-2 border border-dl-border text-sm font-medium text-dl-navy bg-dl-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </DesignLawLayout>
  );
}
