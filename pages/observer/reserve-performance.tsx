import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import type { ReserveAssetsResponse, PriceMovingAsset, StableAsset } from '../api/observer/reserve-assets';

const OBSERVER_TABS = [
  { id: 'overview',             label: 'Overview',             href: '/observer' },
  { id: 'treasury',             label: 'Treasury',             href: '/observer/treasury' },
  { id: 'governance',           label: 'Governance',           href: '/observer/governance' },
  { id: 'risk',                 label: 'Risk',                 href: '/observer/risk' },
  { id: 'assets',               label: 'Assets',               href: '/observer/assets' },
  { id: 'controls',             label: 'Controls',             href: '/observer/controls' },
  { id: 'reports',              label: 'Reports',              href: '/observer/reports' },
  { id: 'capital-bridge',       label: 'Capital Bridge',       href: '/observer/capital-bridge' },
  { id: 'node-economy',         label: 'Node Economy',         href: '/observer/node-economy' },
  { id: 'reserve-performance',  label: 'Reserve Performance',  href: '/observer/reserve-performance' },
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

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, width = 140, height = 36 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const pts   = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const isUp  = data[data.length - 1] >= data[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? '#2E5E47' : '#8B1A1A'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── 24h change badge ─────────────────────────────────────────────────────────

function ChangeBadge({ pct, usd }: { pct: string | null; usd: string | null }) {
  if (!pct) return <span className="font-dl-mono text-xs text-dl-gray">24h: —</span>;
  const n     = parseFloat(pct);
  const isUp  = n >= 0;
  const sign  = isUp ? '+' : '';
  const color = isUp ? 'text-dl-forest' : 'text-red-700';
  return (
    <div className={`font-dl-mono text-xs ${color}`}>
      {sign}{pct}% 24h
      {usd && (
        <span className="text-dl-gray ml-1">
          ({sign}${Math.abs(parseFloat(usd)).toFixed(2)}/token)
        </span>
      )}
    </div>
  );
}

// ─── Price-Moving asset card ──────────────────────────────────────────────────

const SYMBOL_COLOR: Record<string, string> = {
  ETH:  'text-dl-navy',
  PAXG: 'text-dl-gold',
  AXAU: 'text-dl-gold',
  AXM:  'text-dl-forest',
};

function PriceMovingCard({ asset }: { asset: PriceMovingAsset }) {
  const color = SYMBOL_COLOR[asset.symbol] ?? 'text-dl-navy';
  const balNum = parseFloat(asset.balance);
  const priceNum = asset.price ? parseFloat(asset.price) : null;

  return (
    <div className="border border-dl-border p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`font-dl-mono text-xl font-bold ${color}`}>{asset.symbol}</span>
          <p className="text-xs text-dl-gray mt-0.5">{asset.label}</p>
        </div>
        {asset.sparkline && asset.sparkline.length > 1 && (
          <Sparkline data={asset.sparkline} />
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-baseline">
          <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">Balance</span>
          <span className="font-dl-mono text-sm text-dl-navy font-medium">
            {balNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {asset.symbol}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">Mark Price</span>
          <div className="text-right">
            <div className="font-dl-mono text-sm text-dl-gray">
              {priceNum ? `$${priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
            </div>
            <ChangeBadge pct={asset.price24hChangePct} usd={asset.price24hChangeUsd} />
          </div>
        </div>
        <div className="flex justify-between items-baseline border-t border-dl-border pt-2">
          <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">USD Value</span>
          <span className={`font-dl-mono text-lg font-bold ${asset.valueUsd ? 'text-dl-gold' : 'text-dl-gray'}`}>
            {asset.valueUsd ? `$${asset.valueUsd}` : '—'}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-dl-border space-y-1">
        <p className="font-dl-mono text-xs text-dl-gray">
          <span className="uppercase tracking-wide">Location: </span>{asset.location}
        </p>
        <p className="font-dl-mono text-xs text-dl-gray">
          <span className="uppercase tracking-wide">Price: </span>{asset.priceSource}
        </p>
        <p className="font-dl-mono text-xs text-dl-gray">
          <span className="uppercase tracking-wide">Balance: </span>{asset.balanceSource}
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
          {asset.arbiscanUrls.map((url, i) => {
            const addr = asset.contracts[i] ?? '';
            return (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                className="font-dl-mono text-xs text-dl-navy underline underline-offset-2">
                {addr.slice(0, 6)}…{addr.slice(-4)}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Stable asset table ───────────────────────────────────────────────────────

function StableTable({ asset }: { asset: StableAsset }) {
  const totalNum = parseFloat(asset.totalBalance);
  return (
    <div className="border border-dl-border">
      <div className="px-6 py-4 border-b border-dl-border flex items-baseline justify-between">
        <div>
          <span className="font-dl-mono text-base font-bold text-dl-navy">{asset.symbol}</span>
          <span className="text-sm text-dl-gray ml-2">{asset.label}</span>
        </div>
        <div className="text-right">
          <span className="font-dl-mono text-lg font-bold text-dl-gold">
            ${totalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="font-dl-mono text-xs text-dl-gray ml-1">USD</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dl-border">
          <thead>
            <tr className="bg-dl-bg-alt">
              <th className="px-6 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase tracking-wide">Location</th>
              <th className="px-6 py-3 text-left font-dl-mono text-xs text-dl-gray uppercase tracking-wide">Contract</th>
              <th className="px-6 py-3 text-right font-dl-mono text-xs text-dl-gray uppercase tracking-wide">Balance</th>
              <th className="px-6 py-3 text-right font-dl-mono text-xs text-dl-gray uppercase tracking-wide">USD Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dl-border">
            {asset.locationBreakdown.map((row) => {
              const bal = parseFloat(row.balance);
              return (
                <tr key={row.contract}>
                  <td className="px-6 py-3 text-sm text-dl-gray">{row.label}</td>
                  <td className="px-6 py-3">
                    <a href={row.arbiscanUrl} target="_blank" rel="noopener noreferrer"
                      className="font-dl-mono text-xs text-dl-navy underline underline-offset-2">
                      {row.contract.slice(0, 8)}…{row.contract.slice(-6)}
                    </a>
                  </td>
                  <td className="px-6 py-3 text-right font-dl-mono text-sm text-dl-navy">
                    {bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {asset.symbol}
                  </td>
                  <td className="px-6 py-3 text-right font-dl-mono text-sm text-dl-navy">
                    ${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-dl-bg-alt border-t-2 border-dl-border">
              <td className="px-6 py-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wide" colSpan={2}>
                Total {asset.symbol}
              </td>
              <td className="px-6 py-3 text-right font-dl-mono text-sm font-bold text-dl-navy">
                {totalNum.toLocaleString('en-US', { minimumFractionDigits: 2 })} {asset.symbol}
              </td>
              <td className="px-6 py-3 text-right font-dl-mono text-sm font-bold text-dl-gold">
                ${asset.totalValueUsd}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Metric strip ─────────────────────────────────────────────────────────────

function Metric({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="border border-dl-border p-4">
      <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">{label}</p>
      <p className={`font-dl-mono text-2xl font-bold mt-1 ${highlight ? 'text-dl-gold' : 'text-dl-navy'}`}>{value}</p>
      {sub && <p className="text-xs text-dl-gray mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  const priceMovTotal = data?.priceMov
    .map(a => a.valueUsd ? parseFloat(a.valueUsd.replace(/,/g, '')) : 0)
    .reduce((a, b) => a + b, 0) ?? 0;
  const stableTotal = data?.stable
    .map(a => parseFloat(a.totalValueUsd.replace(/,/g, '')))
    .reduce((a, b) => a + b, 0) ?? 0;
  const priceMovCount = data?.priceMov.filter(a => a.valueUsd).length ?? 0;

  return (
    <DesignLawLayout>
      <Head>
        <title>Reserve Performance | Institutional Observer | Axiom Protocol</title>
        <meta name="description" content="Live reserve asset balances, mark prices, 24h change, and USD valuations across all Axiom Protocol treasury positions." />
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
            {[0, 1, 2, 3].map(n => <div key={n} className="border border-dl-border h-20 bg-dl-bg-alt" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(n => <div key={n} className="border border-dl-border h-52 bg-dl-bg-alt" />)}
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
          {/* ── Summary metrics ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Metric
              label="Total Reserve Value"
              value={`$${data.totals.totalValueUsd}`}
              sub="All tracked positions at mark price"
              highlight
            />
            <Metric
              label="Price-Moving Assets"
              value={`$${priceMovTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub={`${priceMovCount} positions with live mark price`}
            />
            <Metric
              label="Stable Positions"
              value={`$${stableTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub="USDC reserves + AXUSD treasury holding"
            />
            <Metric
              label="Coverage Ratio"
              value={data.totals.coverageRatioPct ? `${data.totals.coverageRatioPct}%` : '—'}
              sub={data.totals.coverageNote}
            />
          </div>

          {/* ── Price-Moving Assets ───────────────────────────────────────── */}
          <div className="mb-8">
            <SectionHeading>Price-Moving Positions</SectionHeading>
            <p className="text-xs text-dl-gray mb-4">
              Assets whose USD value fluctuates with market price — ETH, gold-backed instruments, and governance token.
              24h change sourced from CoinGecko. Sparklines show 30-day daily price via Alchemy Historical.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {data.priceMov.map(asset => (
                <PriceMovingCard key={asset.symbol} asset={asset} />
              ))}
            </div>
          </div>

          {/* ── Stable Positions ──────────────────────────────────────────── */}
          <div className="mb-8">
            <SectionHeading>Stable Positions</SectionHeading>
            <p className="text-xs text-dl-gray mb-4">
              USD-pegged assets held across PSM contracts, backstop vault, and treasury contracts. No mark-price risk.
            </p>
            <div className="space-y-4">
              {data.stable.map(asset => (
                <StableTable key={asset.symbol} asset={asset} />
              ))}
            </div>
          </div>

          {/* ── Data Sources ──────────────────────────────────────────────── */}
          <div className="border border-dl-border p-6">
            <SectionHeading>Data Sources & Methodology</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-sm text-dl-gray">
              <div>
                <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide mb-2">Price Oracles</p>
                <ul className="space-y-1.5">
                  <li><span className="font-dl-mono text-dl-navy">ETH</span> — CoinGecko free API (ethereum/usd) · 24h change included</li>
                  <li><span className="font-dl-mono text-dl-navy">PAXG / AXAU</span> — Chainlink XAU/USD on Arbitrum One (
                    <a href="https://arbiscan.io/address/0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c" target="_blank" rel="noopener noreferrer" className="font-dl-mono text-xs underline">0x1F95…a2c</a>
                  ) via AXAUFulfillmentService · 24h % from CoinGecko pax-gold</li>
                  <li><span className="font-dl-mono text-dl-navy">AXM</span> — On-chain EulerSwap AXUSD/AXM pool reserve ratio (spot)</li>
                  <li><span className="font-dl-mono text-dl-navy">USDC / AXUSD</span> — $1.00 stable peg (no oracle required)</li>
                </ul>
              </div>
              <div>
                <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide mb-2">Balance Sources</p>
                <ul className="space-y-1.5">
                  <li><span className="font-dl-mono text-dl-navy">ETH</span> — Deployer EOA eth_getBalance</li>
                  <li><span className="font-dl-mono text-dl-navy">PAXG</span> — BitGoTreasuryExtension.getReserveAssetBalances() (custodian DB)</li>
                  <li><span className="font-dl-mono text-dl-navy">AXAU</span> — AXAUFulfillmentService.getVaultBuffer() (deployer buffer)</li>
                  <li><span className="font-dl-mono text-dl-navy">AXM</span> — Treasury Revenue + Staking Emissions ERC-20 balanceOf</li>
                  <li><span className="font-dl-mono text-dl-navy">USDC</span> — 4 contracts: Canonical PSM + Legacy PSM + Backstop + Deployer EOA</li>
                  <li><span className="font-dl-mono text-dl-navy">AXUSD</span> — Treasury Revenue contract ERC-20 balanceOf</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-dl-border space-y-0.5">
              <p className="font-dl-mono text-xs text-dl-gray">
                Network: Arbitrum One (Chain ID 42161) · Deployer EOA: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
              </p>
              <p className="font-dl-mono text-xs text-dl-gray">
                All balances fetched live at request time. No caching applied. AXAU price is backing XAU/USD — actual NAV may differ.
              </p>
              {fetchedAt && (
                <p className="font-dl-mono text-xs text-dl-gray">
                  Fetched: {fetchedAt.toUTCString()}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </DesignLawLayout>
  );
}
