import { useState } from 'react';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import { getArbiscanTxUrl, getArbiscanAddressUrl } from '../../../lib/property/explorerLinks';

function formatCurrency(val: number | string | null | undefined): string {
  if (!val) return '$0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

function formatAxusd(amountCents: number | null | undefined): string | null {
  if (amountCents == null) return null;
  return `${(amountCents / 100).toFixed(2)} AXUSD`;
}

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function gradeColor(grade: string): string {
  if (grade === 'A') return 'text-green-800 bg-green-50 border-green-200';
  if (grade === 'B') return 'text-blue-800 bg-blue-50 border-blue-200';
  if (grade === 'C') return 'text-yellow-800 bg-yellow-50 border-yellow-200';
  return 'text-red-800 bg-red-50 border-red-200';
}

function statusColor(status: string): string {
  if (status === 'ready') return 'text-green-800 bg-green-50 border-green-200';
  if (status === 'paid' || status === 'generating') return 'text-blue-800 bg-blue-50 border-blue-200';
  if (status === 'failed') return 'text-red-800 bg-red-50 border-red-200';
  return 'text-dl-gray bg-white border-dl-border';
}

interface ReportSummary {
  id: string;
  createdAt: string;
  tier: string;
  status: string;
  addressRaw: string;
  addressNormalized: string | null;
  city: string | null;
  state: string | null;
  valueMid: string | null;
  rentMid: string | null;
  confidenceScore: number | null;
  dealGrade: string | null;
  paymentTxHash: string | null;
  paymentChainId: number | null;
  paymentFromAddress: string | null;
  paymentConfirmedAt: string | null;
  amountPaidCents: number | null;
  buyerWallet: string | null;
  isRepeatPurchase?: boolean;
}

type LookupMode = 'email' | 'wallet';

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

interface RecoverResult {
  kind: 'success';
  reportId: string;
  status: string;
}
interface RecoverError {
  kind: 'error';
  message: string;
}
type RecoverState = null | RecoverResult | RecoverError;

export default function ReportHistory() {
  const [mode, setMode] = useState<LookupMode>('email');
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeMode, setActiveMode] = useState<LookupMode>('email');
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [searched, setSearched] = useState(false);

  // ── Self-recover form state (task #280) ────────────────────────────────
  // The /property/reports/expired email tells buyers to come here and paste
  // their tx hash. We POST to /api/property/recover-payment which wraps
  // resolveSingleByTxHash with the same sender-wallet check operators get.
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverReportId, setRecoverReportId] = useState('');
  const [recoverTxHash, setRecoverTxHash] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverState, setRecoverState] = useState<RecoverState>(null);

  const submitRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverState(null);
    const reportId = recoverReportId.trim();
    const txHash = recoverTxHash.trim();
    if (!reportId) {
      setRecoverState({ kind: 'error', message: 'Report ID is required.' });
      return;
    }
    if (!TX_HASH_RE.test(txHash)) {
      setRecoverState({
        kind: 'error',
        message: 'Transaction hash must start with 0x and be 66 characters long.',
      });
      return;
    }
    setRecoverLoading(true);
    try {
      const res = await fetch('/api/property/recover-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, txHash }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRecoverState({
          kind: 'error',
          message: data.error || `Recovery failed (HTTP ${res.status}).`,
        });
      } else {
        setRecoverState({
          kind: 'success',
          reportId: data.reportId || reportId,
          status: data.status || 'paid',
        });
      }
    } catch {
      setRecoverState({
        kind: 'error',
        message: 'Could not reach the recovery endpoint. Check your connection and try again.',
      });
    } finally {
      setRecoverLoading(false);
    }
  };

  const fetchReports = async (lookup: LookupMode, value: string, page: number = 1) => {
    const trimmed = value.trim();
    if (lookup === 'email' && !EMAIL_RE.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (lookup === 'wallet' && !WALLET_RE.test(trimmed)) {
      setError('Please enter a valid wallet address (0x followed by 40 hex characters).');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const param = lookup === 'email'
        ? `email=${encodeURIComponent(trimmed)}`
        : `wallet=${encodeURIComponent(trimmed)}`;
      const res = await fetch(`/api/property/reports?${param}&page=${page}&limit=10`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not fetch reports');
        setReports([]);
      } else {
        setReports(data.reports || []);
        setPagination(data.pagination || { page: 1, totalPages: 0, total: 0 });
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveMode(mode);
    setActiveQuery(query);
    fetchReports(mode, query, 1);
  };

  const inputType = mode === 'email' ? 'email' : 'text';
  const placeholder = mode === 'email' ? 'Enter your email address' : '0x… (your wallet address)';

  return (
    <DesignLawLayout>
      <Head>
        <title>Report History | Property Analysis | Axiom Protocol</title>
      </Head>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="border-b border-dl-border pb-6 mb-8">
          <h1 className="font-dl-serif text-2xl text-dl-navy">Report History</h1>
          <p className="text-sm text-dl-gray mt-2">
            Look up every property report you have paid for. Each row links to the report and to the on-chain AXUSD
            payment receipt on Arbitrum One.
          </p>
        </div>

        <form onSubmit={handleSearch} className="border border-dl-border p-4 sm:p-6 mb-8">
          <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Find Your Reports</h2>

          <div className="flex gap-2 mb-4" role="tablist" aria-label="Lookup method">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'email'}
              onClick={() => { setMode('email'); setError(''); }}
              data-testid="mode-email"
              className={`px-4 py-2 min-h-[44px] text-xs font-dl-mono border ${
                mode === 'email'
                  ? 'bg-dl-navy text-white border-dl-navy'
                  : 'bg-white text-dl-navy border-dl-border hover:border-dl-navy'
              }`}
            >
              By Email
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'wallet'}
              onClick={() => { setMode('wallet'); setError(''); }}
              data-testid="mode-wallet"
              className={`px-4 py-2 min-h-[44px] text-xs font-dl-mono border ${
                mode === 'wallet'
                  ? 'bg-dl-navy text-white border-dl-navy'
                  : 'bg-white text-dl-navy border-dl-border hover:border-dl-navy'
              }`}
            >
              By Wallet
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type={inputType}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              data-testid="lookup-input"
              className="flex-1 border border-dl-border px-4 py-3 min-h-[44px] text-sm font-dl-mono bg-white text-dl-navy focus:outline-none focus:border-dl-navy"
            />
            <button
              type="submit"
              disabled={loading}
              data-testid="lookup-search"
              className="px-6 py-3 min-h-[44px] text-sm font-dl-mono bg-dl-navy text-white border border-dl-navy hover:bg-opacity-90 disabled:opacity-60"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <p className="text-xs text-dl-gray font-dl-mono mt-3">
            {mode === 'email'
              ? 'We match against the email used at checkout.'
              : 'We match the wallet that signed the AXUSD transfer.'}
          </p>
        </form>

        {error && (
          <div className="border border-red-300 bg-red-50 p-4 mb-6 text-sm text-red-800" data-testid="lookup-error">
            {error}
          </div>
        )}

        {/* Self-recover form (task #280). Collapsed by default — most
            visitors are here to look up an existing receipt, not to rescue
            a stuck pending row. The "your report request expired" email
            (#275) deep-links here. */}
        <section className="border border-dl-border mb-8" data-testid="recover-section">
          <button
            type="button"
            onClick={() => {
              setRecoverOpen((v) => !v);
              if (recoverOpen) setRecoverState(null);
            }}
            data-testid="recover-toggle"
            aria-expanded={recoverOpen}
            className="w-full text-left px-4 sm:px-6 py-4 flex items-center justify-between font-dl-mono text-sm text-dl-navy hover:bg-dl-border/20"
          >
            <span>Already paid? Recover your report</span>
            <span className="text-xs text-dl-gray">{recoverOpen ? '−' : '+'}</span>
          </button>

          {recoverOpen && (
            <form
              onSubmit={submitRecover}
              data-testid="recover-form"
              className="border-t border-dl-border px-4 sm:px-6 py-5 space-y-4"
            >
              <p className="text-xs text-dl-gray">
                If your AXUSD payment landed on Arbitrum One but the report stayed pending, paste your
                report ID and the on-chain transaction hash below. We will verify the transfer and
                generate the report — no support ticket needed.
              </p>

              <div>
                <label htmlFor="recover-report-id" className="block text-xs font-dl-mono text-dl-gray mb-1 uppercase">
                  Report ID
                </label>
                <input
                  id="recover-report-id"
                  type="text"
                  value={recoverReportId}
                  onChange={(e) => setRecoverReportId(e.target.value)}
                  placeholder="e.g. rep_01H..."
                  data-testid="recover-report-id"
                  className="w-full border border-dl-border px-4 py-3 min-h-[44px] text-sm font-dl-mono bg-white text-dl-navy focus:outline-none focus:border-dl-navy"
                />
                <p className="text-[10px] text-dl-gray font-dl-mono mt-1">
                  Found in the report URL (/property/reports/&lt;id&gt;) or in the expiration email.
                </p>
              </div>

              <div>
                <label htmlFor="recover-tx-hash" className="block text-xs font-dl-mono text-dl-gray mb-1 uppercase">
                  Transaction Hash
                </label>
                <input
                  id="recover-tx-hash"
                  type="text"
                  value={recoverTxHash}
                  onChange={(e) => setRecoverTxHash(e.target.value)}
                  placeholder="0x… (66 characters)"
                  data-testid="recover-tx-hash"
                  className="w-full border border-dl-border px-4 py-3 min-h-[44px] text-sm font-dl-mono bg-white text-dl-navy focus:outline-none focus:border-dl-navy"
                />
                <p className="text-[10px] text-dl-gray font-dl-mono mt-1">
                  The AXUSD Transfer must come from the wallet recorded on the report.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={recoverLoading}
                  data-testid="recover-submit"
                  className="px-6 py-3 min-h-[44px] text-sm font-dl-mono bg-dl-navy text-white border border-dl-navy hover:bg-opacity-90 disabled:opacity-60"
                >
                  {recoverLoading ? 'Verifying…' : 'Recover Report'}
                </button>
              </div>

              {recoverState?.kind === 'error' && (
                <div
                  data-testid="recover-error"
                  className="border border-red-300 bg-red-50 p-3 text-sm text-red-800"
                  role="alert"
                >
                  {recoverState.message}
                </div>
              )}

              {recoverState?.kind === 'success' && (
                <div
                  data-testid="recover-success"
                  className="border border-green-300 bg-green-50 p-3 text-sm text-green-900"
                  role="status"
                >
                  <p className="font-dl-mono">
                    Recovery accepted. Report status:{' '}
                    <span data-testid="recover-success-status" className="uppercase">
                      {recoverState.status}
                    </span>
                    .
                  </p>
                  <p className="mt-2">
                    <a
                      href={`/property/reports/${recoverState.reportId}`}
                      data-testid="recover-success-link"
                      className="font-dl-mono text-xs text-dl-navy underline"
                    >
                      Open report →
                    </a>
                  </p>
                </div>
              )}
            </form>
          )}
        </section>

        {searched && !loading && reports.length === 0 && !error && (
          <div className="border border-dl-border p-8 text-center" data-testid="lookup-empty">
            <h3 className="font-dl-serif text-lg text-dl-navy mb-2">No Reports Found</h3>
            <p className="text-sm text-dl-gray mb-4">
              No paid reports were found for this {activeMode === 'email' ? 'email' : 'wallet'}. Receipts appear here
              once your AXUSD payment is confirmed on Arbitrum One.
            </p>
            <a href="/property" className="font-dl-mono text-sm text-dl-navy border border-dl-navy px-6 py-2 hover:bg-dl-navy hover:text-white inline-block">
              Generate a Report
            </a>
          </div>
        )}

        {reports.length > 0 && (
          <div data-testid="reports-list">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs text-dl-gray font-dl-mono">
                {pagination.total} report{pagination.total !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  data-testid="report-row"
                  data-repeat={report.isRepeatPurchase ? 'true' : 'false'}
                  className={`border p-4 transition-colors ${
                    report.isRepeatPurchase
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-dl-border hover:border-dl-navy'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/property/reports/${report.id}`}
                        className="text-sm text-dl-navy font-dl-mono hover:underline break-words"
                      >
                        {report.addressNormalized || report.addressRaw}
                      </a>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs text-dl-gray font-dl-mono">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs font-dl-mono border border-dl-border px-2 py-0 text-dl-gray uppercase">
                          {report.tier}
                        </span>
                        <span className={`text-xs font-dl-mono border px-2 py-0 uppercase ${statusColor(report.status)}`}>
                          {report.status}
                        </span>
                        {report.dealGrade && (
                          <span className={`text-xs font-dl-mono border px-2 py-0 ${gradeColor(report.dealGrade)}`}>
                            {report.dealGrade}
                          </span>
                        )}
                        {report.isRepeatPurchase && (
                          <span
                            data-testid="repeat-badge"
                            title="You already paid for a report on this address. Open the earlier receipt instead of paying again."
                            className="text-xs font-dl-mono border border-amber-300 bg-amber-100 text-amber-900 px-2 py-0 uppercase"
                          >
                            Repeat purchase
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-6 text-right shrink-0">
                      {report.valueMid && (
                        <div>
                          <p className="text-xs text-dl-gray">Value</p>
                          <p className="text-sm font-dl-mono text-dl-navy">{formatCurrency(report.valueMid)}</p>
                        </div>
                      )}
                      {report.rentMid && (
                        <div>
                          <p className="text-xs text-dl-gray">Rent</p>
                          <p className="text-sm font-dl-mono text-dl-navy">{formatCurrency(report.rentMid)}/mo</p>
                        </div>
                      )}
                      {report.confidenceScore !== null && (
                        <div>
                          <p className="text-xs text-dl-gray">Confidence</p>
                          <p className="text-sm font-dl-mono text-dl-navy">{report.confidenceScore}/100</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {report.paymentTxHash && (
                    <div
                      className="mt-3 pt-3 border-t border-dl-border/60 flex flex-col md:flex-row md:items-center gap-2 md:gap-6"
                      data-testid="receipt-block"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-dl-gray font-dl-mono">
                          AXUSD Tx
                        </span>
                        <a
                          href={getArbiscanTxUrl(report.paymentChainId, report.paymentTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="arbiscan-tx-link"
                          className="text-xs font-dl-mono text-dl-navy underline hover:no-underline break-all"
                          title={report.paymentTxHash}
                        >
                          {shortHash(report.paymentTxHash)}
                        </a>
                      </div>
                      {report.amountPaidCents != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wide text-dl-gray font-dl-mono">Paid</span>
                          <span className="text-xs font-dl-mono text-dl-navy">{formatAxusd(report.amountPaidCents)}</span>
                        </div>
                      )}
                      {report.paymentFromAddress && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wide text-dl-gray font-dl-mono">From</span>
                          <a
                            href={getArbiscanAddressUrl(report.paymentChainId, report.paymentFromAddress)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-dl-mono text-dl-navy underline hover:no-underline"
                            title={report.paymentFromAddress}
                          >
                            {shortHash(report.paymentFromAddress)}
                          </a>
                        </div>
                      )}
                      {report.paymentConfirmedAt && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wide text-dl-gray font-dl-mono">Confirmed</span>
                          <span className="text-xs font-dl-mono text-dl-gray">
                            {new Date(report.paymentConfirmedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchReports(activeMode, activeQuery, p)}
                    className={`w-10 h-10 min-h-[44px] text-xs font-dl-mono border ${
                      p === pagination.page
                        ? 'bg-dl-navy text-white border-dl-navy'
                        : 'bg-white text-dl-navy border-dl-border hover:border-dl-navy'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-dl-border">
          <a href="/property" className="font-dl-mono text-xs text-dl-navy border border-dl-navy px-4 py-2 hover:bg-dl-navy hover:text-white">
            Back to Property Analysis
          </a>
        </div>
      </div>
    </DesignLawLayout>
  );
}
