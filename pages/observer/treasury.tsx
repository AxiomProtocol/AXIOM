import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { ProofLink } from '../../components/observer/ObserverLayout';
import { TreasuryData, RoutingRule, DrawSchedule, TreasuryEvent } from '../../server/services/observer/types';
import type { CdpBalancesResponse } from '../api/observer/cdp-balances';

const OBSERVER_TABS = [
  { id: 'overview', label: 'Overview', href: '/observer' },
  { id: 'treasury', label: 'Treasury', href: '/observer/treasury' },
  { id: 'governance', label: 'Governance', href: '/observer/governance' },
  { id: 'risk', label: 'Risk', href: '/observer/risk' },
  { id: 'assets', label: 'Assets', href: '/observer/assets' },
  { id: 'controls', label: 'Controls', href: '/observer/controls' },
  { id: 'reports', label: 'Reports', href: '/observer/reports' },
  { id: 'capital-bridge', label: 'Capital Bridge', href: '/observer/capital-bridge' },
  { id: 'node-economy', label: 'Node Economy', href: '/observer/node-economy' },
  { id: 'reserve-performance', label: 'Reserve Performance', href: '/observer/reserve-performance' },
];

function ObserverNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-0 border-b border-dl-border mb-8">
      {OBSERVER_TABS.map(tab => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`px-4 py-2 text-sm ${tab.id === current ? 'border-b-2 border-dl-navy text-dl-navy font-medium' : 'text-dl-gray'}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export default function ObserverTreasury() {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cdp, setCdp] = useState<CdpBalancesResponse | null>(null);
  const [cdpLoading, setCdpLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/observer/treasury');
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchCdp() {
      try {
        const res = await fetch('/api/observer/cdp-balances');
        const result = await res.json() as CdpBalancesResponse;
        setCdp(result);
      } catch {
        // silently handle
      } finally {
        setCdpLoading(false);
      }
    }
    fetchCdp();
  }, []);

  return (
    <DesignLawLayout>
      <Head>
        <title>Treasury | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Bucket balances, routing rules, and draw schedules" />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy">Treasury</h1>
      <p className="text-dl-gray mt-1 mb-6">Bucket balances, routing rules, and draw schedules</p>

      <ObserverNav current="treasury" />

      {loading ? (
        <p className="text-sm text-dl-gray font-dl-mono">Loading data...</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {data.buckets && Object.entries(data.buckets).map(([bucket, value]: [string, string]) => (
              <div key={bucket} className="border border-dl-border p-4">
                <h3 className="text-sm font-dl-mono text-dl-gray uppercase tracking-wide capitalize">{bucket}</h3>
                <p className="mt-2 text-2xl font-dl-mono text-dl-gold">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="border border-dl-border p-6">
              <SectionHeading>Routing Rules</SectionHeading>
              <div className="space-y-4">
                {(data.routingRules || []).map((rule: RoutingRule) => (
                  <div key={rule.bucket} className="flex justify-between items-center border-b border-dl-border pb-3">
                    <div>
                      <p className="font-medium capitalize">{rule.bucket}</p>
                      <p className="text-sm text-dl-gray">Min Reserve: {rule.minReserve}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-dl-mono font-medium text-dl-gold">{rule.allocationPercent}%</p>
                      <p className="text-sm text-dl-gray">Allocation</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-dl-border p-6">
              <SectionHeading>Draw Schedule</SectionHeading>
              <div className="space-y-3">
                {(data.drawSchedule || []).map((draw: DrawSchedule, idx: number) => (
                  <div key={idx} className="flex justify-between items-center border-b border-dl-border pb-3">
                    <div>
                      <p className="font-medium">{draw.purpose}</p>
                      <p className="text-sm text-dl-gray">{draw.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-dl-mono font-medium text-dl-navy">{draw.amount}</p>
                      <p className="text-sm text-dl-gray">{draw.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Recent Transactions</SectionHeading>
            {!data.events || data.events.length === 0 ? (
              <p className="text-dl-gray">No recent transactions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dl-border">
                  <thead>
                    <tr className="bg-dl-bg-alt">
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Type</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Amount</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Bucket</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Time</th>
                      <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dl-border">
                    {(data.events || []).map((tx: TreasuryEvent) => (
                      <tr key={tx.txHash}>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-dl-mono ${
                            tx.type === 'deposit' ? 'bg-dl-bg-alt text-dl-forest' : 'bg-dl-bg-alt text-dl-error'
                          }`}>
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-dl-mono font-medium">{tx.amount}</td>
                        <td className="px-4 py-3 text-sm capitalize">{tx.bucket || '-'}</td>
                        <td className="px-4 py-3 text-sm text-dl-gray">{tx.timestamp}</td>
                        <td className="px-4 py-3 text-sm">
                          <ProofLink type="tx" value={tx.txHash} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── CDP Server Wallets ─────────────────────────────────────────── */}
          <div className="border border-dl-border mt-6">
            <div className="px-6 py-4 border-b border-dl-border flex items-center justify-between">
              <div>
                <SectionHeading>CDP Server Wallets</SectionHeading>
                <p className="text-xs text-dl-gray mt-0.5">Live ETH and USDC balances on Base mainnet — Coinbase CDP managed accounts</p>
              </div>
              <Link href="/cdp-wallets" className="font-dl-mono text-xs text-dl-navy underline underline-offset-2 shrink-0 ml-4">
                Manage Wallets
              </Link>
            </div>
            <div className="p-6">
              {cdpLoading ? (
                <p className="text-sm text-dl-gray font-dl-mono">Fetching live balances...</p>
              ) : !cdp?.isLive || cdp.wallets.length === 0 ? (
                <p className="text-sm text-dl-gray">
                  {cdp?.error ?? 'No CDP wallets configured.'}{' '}
                  <Link href="/cdp-wallets" className="text-dl-navy underline text-xs">Create a wallet</Link>
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-dl-border">
                    <thead>
                      <tr className="bg-dl-bg-alt">
                        <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Name</th>
                        <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Address</th>
                        <th className="px-4 py-3 text-right font-dl-mono text-xs text-dl-gray uppercase">ETH Balance</th>
                        <th className="px-4 py-3 text-right font-dl-mono text-xs text-dl-gray uppercase">USDC Balance</th>
                        <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Network</th>
                        <th className="px-4 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase">Explorer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dl-border">
                      {cdp.wallets.map((w) => (
                        <tr key={w.address}>
                          <td className="px-4 py-3 text-sm font-dl-mono text-dl-navy">
                            {w.name ?? 'Unnamed'}
                          </td>
                          <td className="px-4 py-3 text-sm font-dl-mono text-dl-gray">
                            {w.address.slice(0, 8)}…{w.address.slice(-6)}
                          </td>
                          <td className="px-4 py-3 text-sm font-dl-mono text-dl-navy text-right">
                            {w.ethBalance} ETH
                          </td>
                          <td className="px-4 py-3 text-sm font-dl-mono text-dl-forest text-right">
                            ${w.usdcBalance}
                          </td>
                          <td className="px-4 py-3 text-xs font-dl-mono text-dl-gray">
                            Base
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <a
                              href={w.basescanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-dl-mono text-dl-navy underline"
                            >
                              Basescan
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-dl-gray mt-3 font-dl-mono">
                    Fetched {new Date(cdp.fetchedAt).toLocaleTimeString()} · Base mainnet · Coinbase CDP
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-dl-gray">Failed to load treasury data</p>
      )}
    </DesignLawLayout>
  );
}
