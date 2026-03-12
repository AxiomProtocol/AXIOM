import React, { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { ConnectWalletButton } from '../../components/design-law/ConnectWalletButton';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '../../lib/web3/useWallet';

type Tab = 'holdings' | 'capitalCalls' | 'distributions';

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
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Investor Portal | Axiom Protocol</title>
      </Head>

      <div className="border-b border-dl-border pb-4 mb-6">
        <h1 className="font-dl-serif text-2xl text-dl-navy">Investor Portal</h1>
        <p className="text-sm text-dl-gray mt-1 font-dl-mono">
          {isConnected && address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : 'Not connected'}
        </p>
      </div>

      {!isConnected && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-serif text-lg text-dl-navy mb-2">Connect Your Wallet</p>
          <p className="text-sm text-dl-gray mb-6">
            Connect and sign in with your wallet to view your investment portfolio,
            distributions, capital calls, and documents.
          </p>
          <div className="flex justify-center">
            <ConnectWalletButton />
          </div>
        </div>
      )}

      {isConnected && loading && (
        <div className="border border-dl-border p-8 text-center">
          <p className="text-sm text-dl-gray">Loading your portfolio...</p>
        </div>
      )}

      {isConnected && error && (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {isConnected && !loading && !error && data && !data.profile && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-serif text-lg text-dl-navy mb-2">No Investor Profile Found</p>
          <p className="text-sm text-dl-gray">
            Your connected wallet is not linked to any investor profile.
            If you believe this is an error, contact the offering operator to link your wallet address.
          </p>
          <p className="text-xs text-dl-gray mt-2 font-dl-mono">{data.wallet}</p>
        </div>
      )}

      {isConnected && !loading && !error && data?.profile && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray uppercase tracking-wide">Total Invested</p>
              <p className="font-dl-mono text-lg text-dl-navy mt-1">
                {fmtFull(data.summary?.totalInvested || 0)}
              </p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray uppercase tracking-wide">Distributions Received</p>
              <p className="font-dl-mono text-lg text-dl-navy mt-1">
                {fmtFull(data.summary?.totalDistributed || 0)}
              </p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray uppercase tracking-wide">Pending Calls</p>
              <p className="font-dl-mono text-lg text-dl-navy mt-1">
                {fmtFull(data.summary?.pendingCalls || 0)}
              </p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray uppercase tracking-wide">Holdings</p>
              <p className="font-dl-mono text-lg text-dl-navy mt-1">
                {data.summary?.holdingCount || 0}
              </p>
            </div>
            <div className="border border-dl-border p-4">
              <p className="text-xs text-dl-gray uppercase tracking-wide">Active Offerings</p>
              <p className="font-dl-mono text-lg text-dl-navy mt-1">
                {data.summary?.activeOfferings || 0}
              </p>
            </div>
          </div>

          <div className="border-b border-dl-border mb-6 flex gap-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm border-b-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-dl-navy text-dl-navy font-medium'
                    : 'border-transparent text-dl-gray hover:text-dl-navy'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 text-xs text-dl-gray">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'holdings' && (
            <HoldingsTab
              holdings={data.holdings}
              subscriptions={data.subscriptions}
              documents={data.documents}
            />
          )}
          {activeTab === 'capitalCalls' && <CapitalCallsTab capitalCalls={data.capitalCalls} />}
          {activeTab === 'distributions' && <DistributionsTab distributions={data.distributions} />}
        </>
      )}
    </DesignLawLayout>
  );
}

function HoldingsTab({ holdings, subscriptions, documents }: { holdings: any[]; subscriptions: any[]; documents: any[] }) {
  return (
    <div className="space-y-8">
      {holdings.length > 0 && (
        <div>
          <h2 className="font-dl-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-2">Capital Table Positions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-dl-border">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-dl-gray uppercase tracking-wide">
                  <th className="px-3 py-2 border-b border-dl-border">Offering</th>
                  <th className="px-3 py-2 border-b border-dl-border">Type</th>
                  <th className="px-3 py-2 border-b border-dl-border">Status</th>
                  <th className="px-3 py-2 border-b border-dl-border">Share Class</th>
                  <th className="px-3 py-2 border-b border-dl-border text-right">Ownership</th>
                  <th className="px-3 py-2 border-b border-dl-border text-right">Contributed</th>
                  <th className="px-3 py-2 border-b border-dl-border text-right">Distributions</th>
                  <th className="px-3 py-2 border-b border-dl-border text-right">Pref Return</th>
                  <th className="px-3 py-2 border-b border-dl-border text-right">Proj. IRR</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h: any) => (
                  <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Link href={`/syndication/offerings/${h.offering_id}`} className="text-dl-navy underline">
                        {h.offering_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs font-dl-mono">{h.offering_type || '\u2014'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 text-xs ${STATUS_COLORS[h.offering_status] || 'bg-gray-100 text-gray-600'}`}>
                        {h.offering_status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-dl-mono">{h.share_class || 'common'}</td>
                    <td className="px-3 py-2 text-right font-dl-mono">{pct(h.ownership_pct)}</td>
                    <td className="px-3 py-2 text-right font-dl-mono">{fmtFull(parseFloat(h.capital_contributed || '0'))}</td>
                    <td className="px-3 py-2 text-right font-dl-mono">{fmtFull(parseFloat(h.distributions_received || '0'))}</td>
                    <td className="px-3 py-2 text-right font-dl-mono">{pct(h.preferred_return)}</td>
                    <td className="px-3 py-2 text-right font-dl-mono">{pct(h.projected_irr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subscriptions.length > 0 && (
        <div>
          <h2 className="font-dl-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-2">Subscriptions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-dl-border">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-dl-gray uppercase tracking-wide">
                  <th className="px-3 py-2 border-b border-dl-border">Offering</th>
                  <th className="px-3 py-2 border-b border-dl-border">Status</th>
                  <th className="px-3 py-2 border-b border-dl-border text-right">Amount</th>
                  <th className="px-3 py-2 border-b border-dl-border">Currency</th>
                  <th className="px-3 py-2 border-b border-dl-border">Method</th>
                  <th className="px-3 py-2 border-b border-dl-border">Submitted</th>
                  <th className="px-3 py-2 border-b border-dl-border">Funded</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Link href={`/syndication/offerings/${s.offering_id}`} className="text-dl-navy underline">
                        {s.offering_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 text-xs ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                        {s.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-dl-mono">{fmtFull(parseFloat(s.amount || '0'))}</td>
                    <td className="px-3 py-2 font-dl-mono">{s.payment_currency || 'USD'}</td>
                    <td className="px-3 py-2">{s.funding_method || '\u2014'}</td>
                    <td className="px-3 py-2 font-dl-mono text-xs">{fmtDate(s.submitted_at)}</td>
                    <td className="px-3 py-2 font-dl-mono text-xs">{fmtDate(s.funded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {documents.length > 0 && (
        <div>
          <h2 className="font-dl-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-2">Documents</h2>
          <DocumentsSection documents={documents} />
        </div>
      )}

      {holdings.length === 0 && subscriptions.length === 0 && (
        <div className="border border-dl-border p-8 text-center">
          <p className="font-dl-serif text-base text-dl-navy mb-1">No Active Subscriptions</p>
          <p className="text-sm text-dl-gray">
            You do not have any active subscriptions or capital table positions.
            Contact the offering operator if you believe this is an error.
          </p>
        </div>
      )}
    </div>
  );
}

function DocumentsSection({ documents }: { documents: any[] }) {
  const grouped = documents.reduce((acc: Record<string, any[]>, doc: any) => {
    const key = doc.offering_name || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([offeringName, docs]) => (
        <div key={offeringName}>
          <h3 className="font-dl-serif text-base text-dl-navy mb-2">{offeringName}</h3>
          <div className="border border-dl-border divide-y divide-gray-100">
            {(docs as any[]).map((doc: any) => (
              <div key={doc.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-dl-navy">{doc.name}</p>
                  <p className="text-xs text-dl-gray mt-0.5">
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
                    className="border border-dl-navy text-dl-navy px-3 py-1 text-xs hover:bg-dl-navy hover:text-white"
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

function CapitalCallsTab({ capitalCalls }: { capitalCalls: any[] }) {
  if (capitalCalls.length === 0) {
    return (
      <div className="border border-dl-border p-8 text-center">
        <p className="text-sm text-dl-gray">No capital calls issued.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-dl-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-2">Capital Calls</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-dl-border">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-dl-gray uppercase tracking-wide">
              <th className="px-3 py-2 border-b border-dl-border">Offering</th>
              <th className="px-3 py-2 border-b border-dl-border">Status</th>
              <th className="px-3 py-2 border-b border-dl-border text-right">Amount Called</th>
              <th className="px-3 py-2 border-b border-dl-border">Currency</th>
              <th className="px-3 py-2 border-b border-dl-border">Due Date</th>
              <th className="px-3 py-2 border-b border-dl-border">Sent</th>
              <th className="px-3 py-2 border-b border-dl-border">Reference</th>
            </tr>
          </thead>
          <tbody>
            {capitalCalls.map((cc: any) => {
              const meta = cc.meta || {};
              const isOverdue = cc.due_date && cc.status === 'sent' && new Date(cc.due_date) < new Date();
              return (
                <tr key={cc.id} className={`border-b border-gray-100 ${isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-2">
                    <Link href={`/syndication/offerings/${cc.offering_id}`} className="text-dl-navy underline">
                      {cc.offering_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 text-xs ${STATUS_COLORS[cc.status] || 'bg-gray-100 text-gray-600'}`}>
                      {cc.status}
                    </span>
                    {isOverdue && <span className="ml-1 text-xs text-red-600">OVERDUE</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-dl-mono">{fmtFull(parseFloat(cc.amount_called || '0'))}</td>
                  <td className="px-3 py-2 font-dl-mono">{cc.currency || 'USD'}</td>
                  <td className="px-3 py-2 font-dl-mono text-xs">{fmtDate(cc.due_date)}</td>
                  <td className="px-3 py-2 font-dl-mono text-xs">{fmtDate(cc.sent_at)}</td>
                  <td className="px-3 py-2 font-dl-mono text-xs">{meta.memoCode || '\u2014'}</td>
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
      <div className="border border-dl-border p-8 text-center">
        <p className="text-sm text-dl-gray">No distributions received yet.</p>
      </div>
    );
  }

  const totalNet = distributions
    .filter((d: any) => d.status === 'completed')
    .reduce((sum: number, d: any) => sum + parseFloat(d.net_amount || '0'), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 border-b border-dl-border pb-2">
        <h2 className="font-dl-serif text-lg text-dl-navy">Distributions</h2>
        <p className="text-sm text-dl-gray">
          Total received: <span className="font-dl-mono text-dl-navy">{fmtFull(totalNet)}</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-dl-border">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-dl-gray uppercase tracking-wide">
              <th className="px-3 py-2 border-b border-dl-border">Offering</th>
              <th className="px-3 py-2 border-b border-dl-border">Type</th>
              <th className="px-3 py-2 border-b border-dl-border">Status</th>
              <th className="px-3 py-2 border-b border-dl-border text-right">Gross</th>
              <th className="px-3 py-2 border-b border-dl-border text-right">Net</th>
              <th className="px-3 py-2 border-b border-dl-border">Currency</th>
              <th className="px-3 py-2 border-b border-dl-border">Period</th>
              <th className="px-3 py-2 border-b border-dl-border">Paid</th>
              <th className="px-3 py-2 border-b border-dl-border">Tx</th>
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
                    <Link href={`/syndication/offerings/${d.offering_id}`} className="text-dl-navy underline">
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
                  <td className="px-3 py-2 text-right font-dl-mono">{fmtFull(parseFloat(d.gross_amount || '0'))}</td>
                  <td className="px-3 py-2 text-right font-dl-mono">{fmtFull(parseFloat(d.net_amount || '0'))}</td>
                  <td className="px-3 py-2 font-dl-mono">{d.currency || 'USD'}</td>
                  <td className="px-3 py-2 font-dl-mono text-xs">
                    {d.period_start || d.period_end
                      ? `${fmtDate(d.period_start)} - ${fmtDate(d.period_end)}`
                      : '\u2014'}
                  </td>
                  <td className="px-3 py-2 font-dl-mono text-xs">{fmtDate(d.paid_at)}</td>
                  <td className="px-3 py-2 font-dl-mono text-xs">
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
                      <span className="text-dl-gray">ACH {String(unitPaymentId).slice(0, 8)}</span>
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
