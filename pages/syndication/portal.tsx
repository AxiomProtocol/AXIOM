import React, { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../../lib/web3/useWallet';

type Tab = 'holdings' | 'capitalCalls' | 'distributions' | 'documents';

function fmt(n: number): string {
  if (isNaN(n) || n === 0) return '$0';
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtFull(n: number): string {
  if (isNaN(n) || n === 0) return '$0.00';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: string | number | null): string {
  if (!n) return '\u2014';
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return isNaN(v) ? '\u2014' : `${(v * 100).toFixed(1)}%`;
}

function fmtDate(d: string | null): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-50 text-blue-700',
  under_review: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  funded: 'bg-green-100 text-green-800',
  rejected: 'bg-red-50 text-red-600',
  cancelled: 'bg-gray-200 text-gray-600',
  completed: 'bg-green-100 text-green-800',
  processing: 'bg-blue-50 text-blue-700',
  failed: 'bg-red-50 text-red-600',
  sent: 'bg-yellow-50 text-yellow-700',
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-100 text-green-800',
  raising: 'bg-green-50 text-green-700',
  active: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-gray-200 text-gray-700',
  winding_down: 'bg-orange-50 text-orange-700',
};

const DIST_TYPE_LABELS: Record<string, string> = {
  preferred_return: 'Preferred Return',
  profit_share: 'Profit Share',
  return_of_capital: 'Return of Capital',
  refinance_proceeds: 'Refinance Proceeds',
  sale_proceeds: 'Sale Proceeds',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  ppm: 'PPM',
  operating_agreement: 'Operating Agreement',
  subscription_agreement: 'Subscription Agreement',
  side_letter: 'Side Letter',
  k1: 'K-1',
  quarterly_report: 'Quarterly Report',
  annual_report: 'Annual Report',
  investor_letter: 'Investor Letter',
  other: 'Other',
};

export default function InvestorPortal() {
  const { isConnected, address } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('holdings');

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/syndication/portal');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load portal.');
        return;
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load portal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      loadPortal();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, loadPortal]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'holdings', label: 'My Holdings', count: data?.holdings?.length },
    { key: 'capitalCalls', label: 'Capital Calls', count: data?.capitalCalls?.length },
    { key: 'distributions', label: 'Distributions', count: data?.distributions?.length },
    { key: 'documents', label: 'Documents', count: data?.documents?.length },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Investor Portal | Axiom Protocol</title>
      </Head>

      <div className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="font-serif text-2xl text-[#1a2744]">Investor Portal</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">
          {isConnected && address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : 'Not connected'}
        </p>
      </div>

      {!isConnected && (
        <div className="border border-gray-200 p-8 text-center">
          <p className="font-serif text-lg text-[#1a2744] mb-2">Connect Your Wallet</p>
          <p className="text-sm text-gray-500 mb-4">
            Connect and sign in with your wallet to view your investment portfolio,
            distributions, capital calls, and documents.
          </p>
          <p className="text-xs text-gray-400">
            Use the "Access Platform" button in the navigation bar to connect.
          </p>
        </div>
      )}

      {isConnected && loading && (
        <div className="border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Loading your portfolio...</p>
        </div>
      )}

      {isConnected && error && (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {isConnected && !loading && !error && data && !data.profile && (
        <div className="border border-gray-200 p-8 text-center">
          <p className="font-serif text-lg text-[#1a2744] mb-2">No Investor Profile Found</p>
          <p className="text-sm text-gray-500">
            Your connected wallet is not linked to any investor profile.
            If you believe this is an error, contact the offering operator to link your wallet address.
          </p>
          <p className="text-xs text-gray-400 mt-2 font-mono">{data.wallet}</p>
        </div>
      )}

      {isConnected && !loading && !error && data?.profile && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Invested</p>
              <p className="font-mono text-lg text-[#1a2744] mt-1">
                {fmtFull(data.summary?.totalInvested || 0)}
              </p>
            </div>
            <div className="border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Distributions Received</p>
              <p className="font-mono text-lg text-[#1a2744] mt-1">
                {fmtFull(data.summary?.totalDistributed || 0)}
              </p>
            </div>
            <div className="border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Calls</p>
              <p className="font-mono text-lg text-[#1a2744] mt-1">
                {fmtFull(data.summary?.pendingCalls || 0)}
              </p>
            </div>
            <div className="border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Holdings</p>
              <p className="font-mono text-lg text-[#1a2744] mt-1">
                {data.summary?.holdingCount || 0}
              </p>
            </div>
            <div className="border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active Offerings</p>
              <p className="font-mono text-lg text-[#1a2744] mt-1">
                {data.summary?.activeOfferings || 0}
              </p>
            </div>
          </div>

          <div className="border-b border-gray-200 mb-6 flex gap-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm border-b-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-[#1a2744] text-[#1a2744] font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 text-xs text-gray-400">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'holdings' && <HoldingsTab holdings={data.holdings} subscriptions={data.subscriptions} />}
          {activeTab === 'capitalCalls' && <CapitalCallsTab capitalCalls={data.capitalCalls} />}
          {activeTab === 'distributions' && <DistributionsTab distributions={data.distributions} />}
          {activeTab === 'documents' && <DocumentsTab documents={data.documents} />}
        </>
      )}
    </DesignLawLayout>
  );
}

function HoldingsTab({ holdings, subscriptions }: { holdings: any[]; subscriptions: any[] }) {
  if (holdings.length === 0 && subscriptions.length === 0) {
    return (
      <div className="border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No holdings or subscriptions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {holdings.length > 0 && (
        <div>
          <h2 className="font-serif text-lg text-[#1a2744] mb-3">Capital Table Positions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 border-b border-gray-200">Offering</th>
                  <th className="px-3 py-2 border-b border-gray-200">Status</th>
                  <th className="px-3 py-2 border-b border-gray-200">Share Class</th>
                  <th className="px-3 py-2 border-b border-gray-200 text-right">Ownership</th>
                  <th className="px-3 py-2 border-b border-gray-200 text-right">Contributed</th>
                  <th className="px-3 py-2 border-b border-gray-200 text-right">Distributions</th>
                  <th className="px-3 py-2 border-b border-gray-200 text-right">Pref Return</th>
                  <th className="px-3 py-2 border-b border-gray-200 text-right">Proj. IRR</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h: any) => (
                  <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Link
                        href={`/syndication/offerings/${h.offering_id}`}
                        className="text-[#1a2744] underline"
                      >
                        {h.offering_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 text-xs ${STATUS_COLORS[h.offering_status] || 'bg-gray-100 text-gray-600'}`}>
                        {h.offering_status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">{h.share_class || 'common'}</td>
                    <td className="px-3 py-2 text-right font-mono">{pct(h.ownership_pct)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtFull(parseFloat(h.capital_contributed || '0'))}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtFull(parseFloat(h.distributions_received || '0'))}</td>
                    <td className="px-3 py-2 text-right font-mono">{pct(h.preferred_return)}</td>
                    <td className="px-3 py-2 text-right font-mono">{pct(h.projected_irr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subscriptions.length > 0 && (
        <div>
          <h2 className="font-serif text-lg text-[#1a2744] mb-3">Subscriptions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 border-b border-gray-200">Offering</th>
                  <th className="px-3 py-2 border-b border-gray-200">Status</th>
                  <th className="px-3 py-2 border-b border-gray-200 text-right">Amount</th>
                  <th className="px-3 py-2 border-b border-gray-200">Currency</th>
                  <th className="px-3 py-2 border-b border-gray-200">Method</th>
                  <th className="px-3 py-2 border-b border-gray-200">Submitted</th>
                  <th className="px-3 py-2 border-b border-gray-200">Funded</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Link
                        href={`/syndication/offerings/${s.offering_id}`}
                        className="text-[#1a2744] underline"
                      >
                        {s.offering_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 text-xs ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                        {s.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmtFull(parseFloat(s.amount || '0'))}</td>
                    <td className="px-3 py-2 font-mono">{s.payment_currency || 'USD'}</td>
                    <td className="px-3 py-2">{s.funding_method || '\u2014'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmtDate(s.submitted_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmtDate(s.funded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CapitalCallsTab({ capitalCalls }: { capitalCalls: any[] }) {
  if (capitalCalls.length === 0) {
    return (
      <div className="border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No capital calls issued.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-lg text-[#1a2744] mb-3">Capital Calls</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 border-b border-gray-200">Offering</th>
              <th className="px-3 py-2 border-b border-gray-200">Status</th>
              <th className="px-3 py-2 border-b border-gray-200 text-right">Amount Called</th>
              <th className="px-3 py-2 border-b border-gray-200">Currency</th>
              <th className="px-3 py-2 border-b border-gray-200">Due Date</th>
              <th className="px-3 py-2 border-b border-gray-200">Sent</th>
              <th className="px-3 py-2 border-b border-gray-200">Reference</th>
            </tr>
          </thead>
          <tbody>
            {capitalCalls.map((cc: any) => {
              const meta = cc.meta || {};
              const isOverdue = cc.due_date && cc.status === 'sent' && new Date(cc.due_date) < new Date();
              return (
                <tr key={cc.id} className={`border-b border-gray-100 ${isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-2">
                    <Link
                      href={`/syndication/offerings/${cc.offering_id}`}
                      className="text-[#1a2744] underline"
                    >
                      {cc.offering_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 text-xs ${STATUS_COLORS[cc.status] || 'bg-gray-100 text-gray-600'}`}>
                      {cc.status}
                    </span>
                    {isOverdue && <span className="ml-1 text-xs text-red-600">OVERDUE</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmtFull(parseFloat(cc.amount_called || '0'))}</td>
                  <td className="px-3 py-2 font-mono">{cc.currency || 'USD'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{fmtDate(cc.due_date)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{fmtDate(cc.sent_at)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{meta.memoCode || '\u2014'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DistributionsTab({ distributions }: { distributions: any[] }) {
  if (distributions.length === 0) {
    return (
      <div className="border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No distributions received yet.</p>
      </div>
    );
  }

  const totalNet = distributions
    .filter((d: any) => d.status === 'completed')
    .reduce((sum: number, d: any) => sum + parseFloat(d.net_amount || '0'), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg text-[#1a2744]">Distributions</h2>
        <p className="text-sm text-gray-500">
          Total received: <span className="font-mono text-[#1a2744]">{fmtFull(totalNet)}</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 border-b border-gray-200">Offering</th>
              <th className="px-3 py-2 border-b border-gray-200">Type</th>
              <th className="px-3 py-2 border-b border-gray-200">Status</th>
              <th className="px-3 py-2 border-b border-gray-200 text-right">Gross</th>
              <th className="px-3 py-2 border-b border-gray-200 text-right">Net</th>
              <th className="px-3 py-2 border-b border-gray-200">Currency</th>
              <th className="px-3 py-2 border-b border-gray-200">Period</th>
              <th className="px-3 py-2 border-b border-gray-200">Paid</th>
              <th className="px-3 py-2 border-b border-gray-200">Tx</th>
            </tr>
          </thead>
          <tbody>
            {distributions.map((d: any) => {
              const meta = d.meta || {};
              const txHash = meta.tx_hash;
              const unitPaymentId = meta.unit_payment_id;
              return (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link
                      href={`/syndication/offerings/${d.offering_id}`}
                      className="text-[#1a2744] underline"
                    >
                      {d.offering_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {DIST_TYPE_LABELS[d.distribution_type] || d.distribution_type}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 text-xs ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmtFull(parseFloat(d.gross_amount || '0'))}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtFull(parseFloat(d.net_amount || '0'))}</td>
                  <td className="px-3 py-2 font-mono">{d.currency || 'USD'}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {d.period_start || d.period_end
                      ? `${fmtDate(d.period_start)} - ${fmtDate(d.period_end)}`
                      : '\u2014'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{fmtDate(d.paid_at)}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {txHash ? (
                      <a
                        href={`https://arbiscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {String(txHash).slice(0, 8)}...
                      </a>
                    ) : unitPaymentId ? (
                      <span className="text-gray-400">ACH {String(unitPaymentId).slice(0, 8)}</span>
                    ) : '\u2014'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentsTab({ documents }: { documents: any[] }) {
  if (documents.length === 0) {
    return (
      <div className="border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No documents available.</p>
      </div>
    );
  }

  const grouped = documents.reduce((acc: Record<string, any[]>, doc: any) => {
    const key = doc.offering_name || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([offeringName, docs]) => (
        <div key={offeringName}>
          <h3 className="font-serif text-base text-[#1a2744] mb-2">{offeringName}</h3>
          <div className="border border-gray-200 divide-y divide-gray-100">
            {(docs as any[]).map((doc: any) => (
              <div key={doc.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#1a2744]">{doc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                    <span className="mx-2">{'\u00B7'}</span>
                    {fmtDate(doc.created_at)}
                    <span className="mx-2">{'\u00B7'}</span>
                    <span className={doc.visibility === 'public' ? 'text-green-600' : 'text-blue-600'}>
                      {doc.visibility}
                    </span>
                  </p>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-[#1a2744] text-[#1a2744] px-3 py-1 text-xs hover:bg-[#1a2744] hover:text-white transition-colors"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
