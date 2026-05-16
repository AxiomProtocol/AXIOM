import React, { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { ConnectWalletButton } from '../../components/design-law/ConnectWalletButton';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
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

const DOC_TYPE_ICONS: Record<string, string> = {
  ppm: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  operating_agreement: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  subscription_agreement: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  k1: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  quarterly_report: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
};

export default function InvestorPortal() {
  const { isConnected, address } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('holdings');
  const [portfolio, setPortfolio] = useState<any | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

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

  const loadPortfolio = useCallback(async (wallet: string) => {
    setPortfolioLoading(true);
    try {
      const res = await fetch(`/api/alchemy/wallet-portfolio?wallet=${encodeURIComponent(wallet)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setPortfolio(json.data);
      }
    } catch {
      // Non-fatal — on-chain panel degrades gracefully
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      loadPortal();
      loadPortfolio(address);
    } else {
      setLoading(false);
    }
  }, [isConnected, address, loadPortal, loadPortfolio]);

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

      <div className="relative w-full h-32 sm:h-40 lg:h-48 -mt-6 sm:-mt-8 -mx-4 sm:-mx-6 mb-6 overflow-hidden" style={{ width: 'calc(100% + 2rem)' }}>
        <Image
          src="/images/syndication/portal_welcome.png"
          alt="Investor Portal"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex gap-2 mb-2 flex-wrap">
            <span className="text-xs font-dl-mono border border-white/40 text-white/80 px-2 py-0.5">Accredited Investors Only</span>
            <span className="text-xs font-dl-mono border border-white/40 text-white/80 px-2 py-0.5">SEC Reg D 506(c)</span>
          </div>
          <h1 className="font-dl-serif text-xl sm:text-2xl text-white">Investor Portal</h1>
          <p className="font-dl-mono text-xs text-gray-300 mt-1">
            {isConnected && data?.profile
              ? `Welcome, ${data.profile.legal_name || data.profile.entity_name || address?.slice(0, 6) + '...' + address?.slice(-4)}`
              : isConnected && address
              ? `${address.slice(0, 6)}...${address.slice(-4)}`
              : 'Connect your wallet to view your portfolio'}
          </p>
        </div>
      </div>

      <div className="border border-dl-border mb-5 px-5 py-3 bg-dl-bg-alt">
        <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">
          This portal displays holdings, capital calls, and distribution records for verified accredited investors participating in Axiom Protocol syndication offerings. All projected distributions are estimates — not contractual guarantees. Capital call notices are binding per the terms of each offering's subscription agreement.
        </p>
        <p className="font-dl-mono text-xs text-dl-gray mt-2 pt-2 border-t border-dl-border leading-relaxed">
          Settlement model: Subscriptions received off-chain (ACH/wire) or on-chain via AXUSD on Arbitrum One. Capital deployment is ops-mediated — physical property closings and asset management are executed by the Axiom operations team. On-chain vaults (AXIOMCreditMarket v7, FixFlip/DSCR ERC4626 vaults) provide immutable LP position records. Distributions follow subscription agreement terms; K-1 documentation maintained per SEC Reg D 506(c) requirements.
        </p>
      </div>

      {!isConnected && (
        <div className="border border-dl-border p-6 sm:p-8 text-center">
          <div className="mx-auto w-16 h-16 mb-4 border-2 border-dl-border flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dl-muted">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M2 10h20" />
              <path d="M6 14h.01" />
            </svg>
          </div>
          <p className="font-dl-serif text-lg text-dl-navy mb-2">Connect Your Wallet</p>
          <p className="text-sm text-dl-gray mb-6 max-w-md mx-auto">
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
        <div className="border border-dl-border p-6 sm:p-8 text-center">
          <div className="mx-auto w-16 h-16 mb-4 border-2 border-dl-border flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dl-muted">
              <circle cx="12" cy="8" r="4" />
              <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
          </div>
          <p className="font-dl-serif text-lg text-dl-navy mb-2">No Investor Profile Found</p>
          <p className="text-sm text-dl-gray max-w-md mx-auto">
            Your connected wallet is not linked to any investor profile.
            If you believe this is an error, contact the offering operator to link your wallet address.
          </p>
          <p className="text-xs text-dl-gray mt-2 font-dl-mono">{data.wallet}</p>
        </div>
      )}

      {isConnected && !loading && !error && data?.profile && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <div className="border border-dl-border p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-dl-gray uppercase tracking-wide">Total Invested</p>
              <p className="font-dl-mono text-base sm:text-lg text-dl-navy mt-1">
                {fmtFull(data.summary?.totalInvested || 0)}
              </p>
            </div>
            <div className="border border-dl-border p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-dl-gray uppercase tracking-wide">Distributions</p>
              <p className="font-dl-mono text-base sm:text-lg text-dl-navy mt-1">
                {fmtFull(data.summary?.totalDistributed || 0)}
              </p>
            </div>
            <div className="border border-dl-border p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-dl-gray uppercase tracking-wide">Pending Calls</p>
              <p className="font-dl-mono text-base sm:text-lg text-dl-navy mt-1">
                {fmtFull(data.summary?.pendingCalls || 0)}
              </p>
            </div>
            <div className="border border-dl-border p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-dl-gray uppercase tracking-wide">Holdings</p>
              <p className="font-dl-mono text-base sm:text-lg text-dl-navy mt-1">
                {data.summary?.holdingCount || 0}
              </p>
            </div>
            <div className="border border-dl-border p-3 sm:p-4 col-span-2 lg:col-span-1">
              <p className="text-[10px] sm:text-xs text-dl-gray uppercase tracking-wide">Active Offerings</p>
              <p className="font-dl-mono text-base sm:text-lg text-dl-navy mt-1">
                {data.summary?.activeOfferings || 0}
              </p>
            </div>
          </div>

          <div className="border-b border-dl-border mb-6 flex gap-0 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm border-b-2 whitespace-nowrap min-h-[44px] ${
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
              portfolio={portfolio}
              portfolioLoading={portfolioLoading}
              walletAddress={address ?? null}
              onRefresh={address ? () => loadPortfolio(address) : undefined}
              refreshing={portfolioLoading}
            />
          )}
          {activeTab === 'capitalCalls' && <CapitalCallsTab capitalCalls={data.capitalCalls} />}
          {activeTab === 'distributions' && <DistributionsTab distributions={data.distributions} />}
        </>
      )}
    </DesignLawLayout>
  );
}

const TOKEN_META: Record<string, { label: string; axiom: boolean; color: string }> = {
  AXAU:  { label: 'Axiom Gold Unit',   axiom: true,  color: 'text-yellow-700' },
  AXUSD: { label: 'Axiom USD',         axiom: true,  color: 'text-emerald-700' },
  AXM:   { label: 'Axiom Governance',  axiom: true,  color: 'text-dl-navy' },
  PAXG:  { label: 'PAX Gold',          axiom: false, color: 'text-yellow-600' },
  USDC:  { label: 'USD Coin',          axiom: false, color: 'text-blue-700' },
  WETH:  { label: 'Wrapped ETH',       axiom: false, color: 'text-dl-gray' },
};

function fmtToken(formatted: string, decimals = 6): string {
  const n = parseFloat(formatted);
  if (isNaN(n)) return '0.000000';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function OnChainBalancesSection({ portfolio, portfolioLoading, walletAddress, onRefresh, refreshing }: {
  portfolio: any | null;
  portfolioLoading: boolean;
  walletAddress: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const arbscanBase = 'https://arbiscan.io';

  if (portfolioLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-dl-border pb-2">
          <h2 className="font-dl-serif text-lg text-dl-navy">On-Chain Wallet Balances</h2>
          <span className="font-dl-mono text-xs text-dl-muted">Arbitrum One · fetching...</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="border border-dl-border p-3 animate-pulse">
              <div className="h-3 bg-gray-200 mb-2 w-12" />
              <div className="h-5 bg-gray-200 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!portfolio) return null;

  const tokens = portfolio.tokens as Record<string, { symbol: string; address: string; formatted: string; hasBalance: boolean }>;
  const eth = portfolio.eth as { symbol: string; formatted: string; hasBalance: boolean };
  const fetchedAt = new Date(portfolio.fetchedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const allEntries: Array<{ symbol: string; formatted: string; hasBalance: boolean; address?: string; isEth?: boolean }> = [
    { symbol: 'ETH', formatted: eth.formatted, hasBalance: eth.hasBalance, isEth: true },
    ...Object.values(tokens),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 border-b border-dl-border pb-2">
        <h2 className="font-dl-serif text-lg text-dl-navy">On-Chain Wallet Balances</h2>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-dl-mono text-xs text-dl-muted">Arbitrum One · live</p>
            <p className="font-dl-mono text-[10px] text-dl-muted">as of {fetchedAt}</p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="border border-dl-border px-3 py-1.5 font-dl-mono text-xs text-dl-navy hover:bg-dl-bg-alt disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Refresh on-chain balances"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? 'animate-spin' : ''}
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
        {allEntries.map(entry => {
          const meta = TOKEN_META[entry.symbol];
          const isAxiom = meta?.axiom ?? false;
          const labelColor = meta?.color ?? 'text-dl-gray';
          const decimalsShown = entry.symbol === 'USDC' ? 2 : entry.symbol === 'ETH' ? 6 : 4;

          return (
            <div
              key={entry.symbol}
              className={`border p-3 ${isAxiom ? 'border-dl-navy bg-dl-bg-alt' : 'border-dl-border'} ${!entry.hasBalance ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-dl-mono text-xs font-semibold ${isAxiom ? 'text-dl-navy' : 'text-dl-gray'}`}>
                  {entry.symbol}
                </span>
                {isAxiom && (
                  <span className="text-[9px] font-dl-mono border border-dl-navy text-dl-navy px-1 py-0.5 leading-none">AXM</span>
                )}
              </div>
              <p className={`font-dl-mono text-sm ${entry.hasBalance ? labelColor : 'text-dl-muted'}`}>
                {fmtToken(entry.formatted, decimalsShown)}
              </p>
              {meta?.label && (
                <p className="font-dl-mono text-[9px] text-dl-muted mt-1 truncate">{meta.label}</p>
              )}
              {entry.address && (
                <a
                  href={`${arbscanBase}/token/${entry.address}?a=${walletAddress ?? ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-dl-mono text-[9px] text-dl-muted hover:text-dl-navy mt-0.5 block truncate"
                >
                  {entry.address.slice(0, 8)}...{entry.address.slice(-6)}
                </a>
              )}
              {entry.isEth && walletAddress && (
                <a
                  href={`${arbscanBase}/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-dl-mono text-[9px] text-dl-muted hover:text-dl-navy mt-0.5 block"
                >
                  View on Arbiscan
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="border border-dl-border bg-dl-bg-alt px-4 py-2 flex flex-wrap items-center gap-4">
        {(['AXAU', 'AXUSD', 'AXM'] as const).map(sym => {
          const t = tokens[sym];
          const hasAny = t?.hasBalance;
          return (
            <div key={sym} className="flex items-center gap-2">
              <span className={`w-2 h-2 inline-block ${hasAny ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="font-dl-mono text-xs text-dl-gray">{sym} {hasAny ? 'held' : 'none'}</span>
            </div>
          );
        })}
        <span className="font-dl-mono text-[10px] text-dl-muted ml-auto">
          Balances are on-chain reads · not custody
        </span>
      </div>
    </div>
  );
}

function HoldingsTab({
  holdings,
  subscriptions,
  documents,
  portfolio,
  portfolioLoading,
  walletAddress,
  onRefresh,
  refreshing,
}: {
  holdings: any[];
  subscriptions: any[];
  documents: any[];
  portfolio: any | null;
  portfolioLoading: boolean;
  walletAddress: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="space-y-8">
      <OnChainBalancesSection portfolio={portfolio} portfolioLoading={portfolioLoading} walletAddress={walletAddress} onRefresh={onRefresh} refreshing={refreshing} />

      {holdings.length > 0 && (
        <div>
          <h2 className="font-dl-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-2">Capital Table Positions</h2>

          <div className="hidden lg:block overflow-x-auto">
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

          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
            {holdings.map((h: any) => (
              <div key={h.id} className="border border-dl-border p-4">
                <div className="flex items-start justify-between mb-2">
                  <Link href={`/syndication/offerings/${h.offering_id}`} className="font-dl-serif text-base text-dl-navy underline leading-tight pr-2">
                    {h.offering_name}
                  </Link>
                  <span className={`inline-block px-2 py-0.5 text-[10px] whitespace-nowrap ${STATUS_COLORS[h.offering_status] || 'bg-gray-100 text-gray-600'}`}>
                    {h.offering_status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-dl-mono">
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Ownership</p>
                    <p className="text-dl-navy">{pct(h.ownership_pct)}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Contributed</p>
                    <p className="text-dl-navy">{fmtFull(parseFloat(h.capital_contributed || '0'))}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Distributions</p>
                    <p className="text-green-700">{fmtFull(parseFloat(h.distributions_received || '0'))}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Pref Return</p>
                    <p className="text-dl-navy">{pct(h.preferred_return)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subscriptions.length > 0 && (
        <div>
          <h2 className="font-dl-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-2">Subscriptions</h2>

          <div className="hidden md:block overflow-x-auto">
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

          <div className="md:hidden grid grid-cols-1 gap-3">
            {subscriptions.map((s: any) => (
              <div key={s.id} className="border border-dl-border p-4">
                <div className="flex items-start justify-between mb-2">
                  <Link href={`/syndication/offerings/${s.offering_id}`} className="font-dl-serif text-sm text-dl-navy underline pr-2">
                    {s.offering_name}
                  </Link>
                  <span className={`inline-block px-2 py-0.5 text-[10px] whitespace-nowrap ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                    {s.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-dl-mono">
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Amount</p>
                    <p className="text-dl-navy">{fmtFull(parseFloat(s.amount || '0'))}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Currency</p>
                    <p className="text-dl-navy">{s.payment_currency || 'USD'}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Submitted</p>
                    <p className="text-dl-navy">{fmtDate(s.submitted_at)}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Funded</p>
                    <p className="text-dl-navy">{fmtDate(s.funded_at)}</p>
                  </div>
                </div>
              </div>
            ))}
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
        <div className="border border-dl-border p-6 sm:p-8 text-center">
          <div className="mx-auto w-16 h-16 mb-4 border-2 border-dl-border flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dl-muted">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <p className="font-dl-serif text-base text-dl-navy mb-1">No Active Subscriptions</p>
          <p className="text-sm text-dl-gray max-w-md mx-auto">
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
              <div key={doc.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 border border-dl-border flex items-center justify-center mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dl-muted">
                      <path d={DOC_TYPE_ICONS[doc.doc_type] || DOC_TYPE_ICONS.ppm} />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-dl-navy truncate">{doc.name}</p>
                    <p className="text-xs text-dl-gray mt-0.5">
                      {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                      <span className="mx-2">{'\u00B7'}</span>
                      {fmtDate(doc.created_at)}
                      <span className="mx-2 hidden sm:inline">{'\u00B7'}</span>
                      <span className={`hidden sm:inline ${doc.visibility === 'public' ? 'text-green-600' : 'text-blue-600'}`}>
                        {doc.visibility}
                      </span>
                    </p>
                  </div>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 border border-dl-navy text-dl-navy px-3 py-2 text-xs min-h-[44px] flex items-center hover:bg-dl-navy hover:text-white"
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
  const openCalls = capitalCalls.filter((cc: any) => cc.status === 'sent' || cc.status === 'pending');

  if (capitalCalls.length === 0) {
    return (
      <div className="border border-dl-border p-6 sm:p-8 text-center">
        <div className="mx-auto w-16 h-16 mb-4 border-2 border-dl-border flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dl-muted">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <p className="font-dl-serif text-base text-dl-navy mb-1">No Capital Calls</p>
        <p className="text-sm text-dl-gray">No capital calls have been issued.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-dl-serif text-lg text-dl-navy mb-3 border-b border-dl-border pb-2">Capital Calls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {capitalCalls.map((cc: any) => {
            const meta = cc.meta || {};
            const isOverdue = cc.due_date && cc.status === 'sent' && new Date(cc.due_date) < new Date();
            return (
              <div key={cc.id} className={`border p-4 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-dl-border'}`}>
                <div className="flex items-start justify-between mb-2">
                  <Link href={`/syndication/offerings/${cc.offering_id}`} className="font-dl-serif text-sm text-dl-navy underline pr-2">
                    {cc.offering_name}
                  </Link>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`inline-block px-2 py-0.5 text-[10px] ${STATUS_COLORS[cc.status] || 'bg-gray-100 text-gray-600'}`}>
                      {cc.status}
                    </span>
                    {isOverdue && <span className="text-[10px] text-red-600 font-bold">OVERDUE</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-dl-mono">
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Amount</p>
                    <p className="text-dl-navy">{fmtFull(parseFloat(cc.amount_called || '0'))}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Currency</p>
                    <p className="text-dl-navy">{cc.currency || 'USD'}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Due Date</p>
                    <p className={isOverdue ? 'text-red-600' : 'text-dl-navy'}>{fmtDate(cc.due_date)}</p>
                  </div>
                  <div>
                    <p className="text-dl-muted text-[10px] uppercase">Ref</p>
                    <p className="text-dl-navy">{meta.memoCode || '\u2014'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {openCalls.length > 0 && (
        <div className="border border-dl-border bg-dl-bg-alt px-5 py-4">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">Capital Call Funding</p>
          <p className="text-sm text-dl-gray leading-relaxed">
            ACH/wire banking infrastructure is currently offline. Contribution instructions will be updated when rails are restored.
            Contact Operations to coordinate funding for open capital calls.
          </p>
        </div>
      )}
    </div>
  );
}

function DistributionsTab({ distributions }: { distributions: any[] }) {
  if (distributions.length === 0) {
    return (
      <div className="border border-dl-border p-6 sm:p-8 text-center">
        <div className="mx-auto w-16 h-16 mb-4 border-2 border-dl-border flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dl-muted">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <p className="font-dl-serif text-base text-dl-navy mb-1">No Distributions Yet</p>
        <p className="text-sm text-dl-gray">No distributions have been received yet.</p>
      </div>
    );
  }

  const totalNet = distributions
    .filter((d: any) => d.status === 'completed')
    .reduce((sum: number, d: any) => sum + parseFloat(d.net_amount || '0'), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 border-b border-dl-border pb-2 gap-1">
        <h2 className="font-dl-serif text-lg text-dl-navy">Distributions</h2>
        <p className="text-sm text-dl-gray">
          Total received: <span className="font-dl-mono text-dl-navy">{fmtFull(totalNet)}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {distributions.map((d: any) => {
          const meta = d.meta || {};
          const txHash = meta.tx_hash;
          const bankingPaymentId = meta.unit_payment_id;
          return (
            <div key={d.id} className="border border-dl-border p-4">
              <div className="flex items-start justify-between mb-2">
                <Link href={`/syndication/offerings/${d.offering_id}`} className="font-dl-serif text-sm text-dl-navy underline pr-2">
                  {d.offering_name}
                </Link>
                <span className={`inline-block px-2 py-0.5 text-[10px] whitespace-nowrap ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                  {d.status}
                </span>
              </div>
              <p className="text-[10px] text-dl-muted uppercase mb-2 font-dl-mono">
                {DIST_TYPE_LABELS[d.distribution_type] || d.distribution_type}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-dl-mono">
                <div>
                  <p className="text-dl-muted text-[10px] uppercase">Gross</p>
                  <p className="text-dl-navy">{fmtFull(parseFloat(d.gross_amount || '0'))}</p>
                </div>
                <div>
                  <p className="text-dl-muted text-[10px] uppercase">Net</p>
                  <p className="text-green-700">{fmtFull(parseFloat(d.net_amount || '0'))}</p>
                </div>
                <div>
                  <p className="text-dl-muted text-[10px] uppercase">Period</p>
                  <p className="text-dl-navy text-[10px]">
                    {d.period_start || d.period_end
                      ? `${fmtDate(d.period_start)} - ${fmtDate(d.period_end)}`
                      : '\u2014'}
                  </p>
                </div>
                <div>
                  <p className="text-dl-muted text-[10px] uppercase">Tx</p>
                  {txHash ? (
                    <a href={`https://arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-[10px]">
                      {String(txHash).slice(0, 10)}...
                    </a>
                  ) : bankingPaymentId ? (
                    <span className="text-dl-gray text-[10px]">ACH {String(bankingPaymentId).slice(0, 8)}</span>
                  ) : <span className="text-dl-navy">{'\u2014'}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
