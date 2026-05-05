import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import type { ReserveAssetsResponse, ReserveAsset } from '../api/observer/reserve-assets';

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

function Sparkline({ data, width = 140, height = 36 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? '#2E5E47' : '#8B1A1A';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function ChangeLabel({ data }: { data: number[] | null }) {
  if (!data || data.length < 2) return <span className="text-dl-gray font-dl-mono text-xs">—</span>;
  const first = data[0];
  const last  = data[data.length - 1];
  if (first === 0) return null;
  const pct  = ((last - first) / first) * 100;
  const sign = pct >= 0 ? '+' : '';
  const cls  = pct >= 0 ? 'text-dl-forest' : 'text-red-700';
  return <span className={`font-dl-mono text-xs ${cls}`}>{sign}{pct.toFixed(2)}% 30d</span>;
}

const SYMBOL_COLORS: Record<string, string> = {
  ETH:  'text-dl-navy',
  PAXG: 'text-dl-gold',
  AXAU: 'text-dl-gold',
  AXM:  'text-dl-forest',
  USDC: 'text-dl-navy',
  AXUSD: 'text-dl-forest',
};

function AssetCard({ asset }: { asset: ReserveAsset }) {
  const color = SYMBOL_COLORS[asset.symbol] ?? 'text-dl-navy';
  return (
    <div className="border border-dl-border p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`font-dl-mono text-lg font-bold ${color}`}>{asset.symbol}</span>
          <p className="text-xs text-dl-gray mt-0.5">{asset.label}</p>
        </div>
        {asset.sparkline && asset.sparkline.length > 1 && (
          <div className="flex flex-col items-end gap-1">
            <Sparkline data={asset.sparkline} />
            <ChangeLabel data={asset.sparkline} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-dl-gray font-dl-mono uppercase tracking-wide">Balance</span>
          <span className="font-dl-mono text-sm text-dl-navy font-medium">
            {parseFloat(asset.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {asset.symbol}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-dl-gray font-dl-mono uppercase tracking-wide">Mark Price</span>
          <span className="font-dl-mono text-sm text-dl-gray">
            {asset.price ? `$${parseFloat(asset.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </span>
        </div>
        <div className="flex justify-between items-baseline border-t border-dl-border pt-2">
          <span className="text-xs text-dl-gray font-dl-mono uppercase tracking-wide">USD Value</span>
          <span className={`font-dl-mono text-base font-bold ${asset.valueUsd ? 'text-dl-gold' : 'text-dl-gray'}`}>
            {asset.valueUsd ? `$${asset.valueUsd}` : '—'}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-dl-border space-y-1.5">
        <p className="text-xs text-dl-gray">
          <span className="font-dl-mono uppercase tracking-wide">Location: </span>
          {asset.location}
        </p>
        <p className="text-xs text-dl-gray">
          <span className="font-dl-mono uppercase tracking-wide">Price source: </span>
          {asset.priceSource}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {asset.arbiscanUrls.map((url, i) => {
            const addr = asset.contracts[i] ?? '';
            return (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-dl-mono text-xs text-dl-navy underline underline-offset-2"
              >
                {addr.slice(0, 6)}…{addr.slice(-4)}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricStrip({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-dl-border p-4">
      <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">{label}</p>
      <p className={`font-dl-mono text-2xl font-bold mt-1 ${highlight ? 'text-dl-gold' : 'text-dl-navy'}`}>{value}</p>
      {sub && <p className="text-xs text-dl-gray mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReservePerformance() {
  const [data, setData]       = useState<ReserveAssetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res    = await fetch('/api/observer/reserve-assets');
        const result = await res.json() as ReserveAssetsResponse;
        if (result.success) {
          setData(result);
        } else {
          setError(result.error ?? 'Failed to load reserve data');
        }
      } catch (e: any) {
        setError(e?.message ?? 'Network error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const fetchedAt = data?.timestamp ? new Date(data.timestamp) : null;

  return (
    <DesignLawLayout>
      <Head>
        <title>Reserve Performance | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Live reserve asset balances, mark prices, and USD valuations across all Axiom Protocol treasury positions." />
      </Head>

      <h1 className="font-dl-serif text-3xl text-dl-navy">Reserve Performance</h1>
      <p className="text-dl-gray mt-1 mb-6">
        Live on-chain reserve asset balances, mark prices, and USD valuations — Arbitrum One
      </p>

      <ObserverNav current="reserve-performance" />

      {loading && (
        <div className="space-y-4">
          <p className="text-sm text-dl-gray font-dl-mono">Fetching live on-chain data…</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="border border-dl-border p-4 h-20 bg-dl-bg-alt" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="border border-dl-border p-5 h-48 bg-dl-bg-alt" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="border border-dl-border p-6">
          <p className="font-dl-mono text-sm text-red-700">Error: {error}</p>
          <p className="text-xs text-dl-gray mt-2">
            On-chain RPC calls may be temporarily unavailable. Try refreshing in a moment.
          </p>
        </div>
      )}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricStrip
              label="Total Reserve Value"
              value={`$${data.totals.totalValueUsd}`}
              sub="All tracked assets at mark price"
              highlight
            />
            <MetricStrip
              label="AXUSD Treasury Holding"
              value={`$${data.totals.axusdSupply}`}
              sub="AXUSD at Treasury Revenue contract"
            />
            <MetricStrip
              label="Coverage Ratio"
              value={data.totals.coverageRatioPct ? `${data.totals.coverageRatioPct}%` : '—'}
              sub="Hard-asset collateral / AXUSD holding"
            />
            <MetricStrip
              label="Reserve Assets"
              value={String(data.assets.filter(a => a.valueUsd).length)}
              sub="Positions with live mark price"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {data.assets.map(asset => (
              <AssetCard key={asset.symbol} asset={asset} />
            ))}
          </div>

          <div className="border border-dl-border p-6 mb-6">
            <SectionHeading>Composition Breakdown</SectionHeading>
            <p className="text-xs text-dl-gray mb-4">
              Proportional USD value across all reserve positions at current mark prices.
            </p>
            <div className="space-y-3">
              {data.assets
                .filter(a => a.valueUsd)
                .sort((a, b) => parseFloat(b.valueUsd!.replace(/,/g, '')) - parseFloat(a.valueUsd!.replace(/,/g, '')))
                .map(asset => {
                  const total = parseFloat(data.totals.totalValueUsd.replace(/,/g, ''));
                  const val   = parseFloat(asset.valueUsd!.replace(/,/g, ''));
                  const pct   = total > 0 ? (val / total) * 100 : 0;
                  const color = SYMBOL_COLORS[asset.symbol] ?? 'text-dl-navy';
                  return (
                    <div key={asset.symbol}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`font-dl-mono text-sm font-medium ${color}`}>{asset.symbol}</span>
                        <span className="font-dl-mono text-sm text-dl-gray">
                          ${asset.valueUsd} · {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-dl-bg-alt h-1.5">
                        <div
                          className="h-1.5 bg-dl-navy"
                          style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="border border-dl-border p-6">
            <SectionHeading>Data Sources & Methodology</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h4 className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide mb-2">Price Oracles</h4>
                <ul className="space-y-1.5 text-sm text-dl-gray">
                  <li><span className="font-dl-mono text-dl-navy">ETH</span> — Alchemy Prices API (WETH by-symbol)</li>
                  <li><span className="font-dl-mono text-dl-navy">PAXG / AXAU</span> — Chainlink XAU/USD on Arbitrum One ({
                    <a href="https://arbiscan.io/address/0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c" target="_blank" rel="noopener noreferrer" className="font-dl-mono text-xs underline">0x1F95…a2c</a>
                  })</li>
                  <li><span className="font-dl-mono text-dl-navy">AXM</span> — EulerSwap AXUSD/AXM pool reserve ratio</li>
                  <li><span className="font-dl-mono text-dl-navy">USDC / AXUSD</span> — $1.00 stable peg (no oracle required)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide mb-2">Balance Sources</h4>
                <ul className="space-y-1.5 text-sm text-dl-gray">
                  <li><span className="font-dl-mono text-dl-navy">ETH / PAXG / AXAU</span> — Deployer EOA ({
                    <a href={`https://arbiscan.io/address/0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`} target="_blank" rel="noopener noreferrer" className="font-dl-mono text-xs underline">0x8d78…C96</a>
                  })</li>
                  <li><span className="font-dl-mono text-dl-navy">AXM</span> — Treasury Revenue + Staking Emissions contracts</li>
                  <li><span className="font-dl-mono text-dl-navy">USDC</span> — Canonical PSM + Legacy PSM + Backstop Vault (3 contracts aggregated)</li>
                  <li><span className="font-dl-mono text-dl-navy">AXUSD</span> — Treasury Revenue contract ERC-20 balance</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-dl-border">
              <p className="text-xs text-dl-gray font-dl-mono">
                Deployer EOA: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96 · Network: Arbitrum One (Chain ID 42161)
              </p>
              <p className="text-xs text-dl-gray font-dl-mono mt-0.5">
                All data fetched live at request time. No caching. Balances reflect on-chain state at block query time.
              </p>
              <p className="text-xs text-dl-gray font-dl-mono mt-0.5">
                AXAU price shown as backing XAU/USD price — actual instrument NAV may differ based on protocol coverage ratio.
              </p>
              {fetchedAt && (
                <p className="text-xs text-dl-gray font-dl-mono mt-2">
                  Last fetched: {fetchedAt.toUTCString()}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </DesignLawLayout>
  );
}
