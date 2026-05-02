/**
 * /assets/dashboard — External Supported Assets Dashboard
 *
 * Composed read-only view of the 5 external supported assets:
 *   USDC, PAXG, XAUT, WBTC, cbETH.
 *
 * Sections:
 *   1. Spot reference strip (server-rendered, gold + silver + per-token spot)
 *   2. Wallet view (client-side, /api/portfolio/external)
 *   3. Gold comparison: AXAU vs PAXG vs XAUT
 *   4. Stable comparison: AXUSD vs USDC
 *   5. Strategic crypto: WBTC + cbETH facts
 *   6. Disclosures
 *
 * Hard rules (mirrors all upstream services):
 *   - Read-only. No writes, no swaps, no deposits, no banking rails anywhere.
 *   - Axiom does NOT issue or custody any of the 5 external assets.
 *   - AXAU is the Axiom-issued gold rail; AXUSD is the Axiom-issued stable.
 *   - Null-on-failure pricing, never silent fallback.
 *   - AXAG is not live and is not issued.
 */

import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import {
  getAssetMetadata,
  getAssetUsdValue,
  listSupportedAssets,
  SUPPORTED_SYMBOLS,
  type AssetMetadata,
  type SupportedSymbol,
} from '../../lib/assets/externalAssetService';
import { _internal as portfolioInternal } from '../../lib/portfolio/realAssetsPortfolio';

interface SpotRow {
  symbol: SupportedSymbol;
  name: string;
  category: string;
  unitPriceUsd: number | null;
  unit: string;
  source: string;
  error?: string;
}

interface AxauSpot {
  usdPerTroyOz: number | null;
  source: string;
  error?: string;
}

interface PageProps {
  assets: AssetMetadata[];
  spots: SpotRow[];
  axauSpot: AxauSpot;
  fetchedAt: string;
}

interface PortfolioPosition {
  symbol: string;
  name: string;
  category: string;
  issuer: string;
  chain: string;
  formattedBalance: string;
  quantity: number;
  unit: string;
  unitPriceUsd: number | null;
  estimatedUsdValue: number | null;
  allocationPct: number | null;
  warnings: string[];
}

interface PortfolioResponse {
  schemaVersion: string;
  readOnly: boolean;
  noCustodyStatement: string;
  data: {
    walletAddress: string;
    positions: PortfolioPosition[];
    totals: {
      totalUsdValue: number | null;
      byCategory: Record<string, number | null>;
    };
    warnings: string[];
    disclosures: string[];
    fetchedAt: string;
  };
}

const COLOR = {
  navy: '#1e3a5f',
  navyLight: '#2a4a73',
  border: '#c9d4dc',
  borderAlt: '#dde4ea',
  bg: '#ffffff',
  bgAlt: '#f8f9fb',
  text: '#111827',
  muted: '#6b7280',
  amber: '#92400e',
  amberBg: '#fef3c7',
  green: '#166534',
  red: '#991b1b',
};

const CATEGORY_LABEL: Record<string, string> = {
  STABLE: 'Reserve-grade stable',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BTC: 'BTC reference',
  STAKED_ETH: 'Staked ETH (yield-bearing)',
};

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  const assets = listSupportedAssets();

  const spotResults = await Promise.allSettled(
    SUPPORTED_SYMBOLS.map((s) => getAssetUsdValue(s, 1)),
  );
  const spots: SpotRow[] = SUPPORTED_SYMBOLS.map((symbol, idx) => {
    const meta = getAssetMetadata(symbol);
    const r = spotResults[idx];
    if (r.status === 'fulfilled') {
      return {
        symbol,
        name: meta.name,
        category: meta.category,
        unitPriceUsd: r.value.unitPriceUsd,
        unit: meta.unit,
        source: r.value.oracleSource,
        ...(r.value.error ? { error: r.value.error } : {}),
      };
    }
    return {
      symbol,
      name: meta.name,
      category: meta.category,
      unitPriceUsd: null,
      unit: meta.unit,
      source: 'unavailable',
      error: r.reason instanceof Error ? r.reason.message : 'Spot fetch failed',
    };
  });

  // AXAU implied per-token (LBMA gold reference) for gold comparison.
  //
  // AXAU's token model is ≈1 troy ounce of gold per token, so the implied USD
  // per AXAU equals the LBMA gold spot. Three honest sources, in order:
  //   1. Direct CoinGecko pax-gold via the dedicated AXAU helper (cached 60s).
  //   2. PAXG spot already fetched in this SSR pass (same underlying: 1 token =
  //      1 troy oz LBMA gold, identical reference number).
  //   3. XAUT spot already fetched in this SSR pass (Tether Gold = 1 troy oz
  //      LBMA gold, equivalent reference).
  // If all three are unavailable, return null with a structured error — never
  // a synthetic value.
  let axauSpot: AxauSpot;
  try {
    const a = await portfolioInternal.getAxauUsdPerToken();
    if (a.usd !== null && isFinite(a.usd) && a.usd > 0) {
      axauSpot = {
        usdPerTroyOz: a.usd,
        source: a.source,
        ...(a.error ? { error: a.error } : {}),
      };
    } else {
      const paxgRow = spots.find((s) => s.symbol === 'PAXG');
      const xautRow = spots.find((s) => s.symbol === 'XAUT');
      if (paxgRow && paxgRow.unitPriceUsd && paxgRow.unitPriceUsd > 0) {
        axauSpot = {
          usdPerTroyOz: paxgRow.unitPriceUsd,
          source: 'Implied from PAXG spot (1 token ≈ 1 troy oz LBMA gold)',
        };
      } else if (xautRow && xautRow.unitPriceUsd && xautRow.unitPriceUsd > 0) {
        axauSpot = {
          usdPerTroyOz: xautRow.unitPriceUsd,
          source: 'Implied from XAUT spot (1 token ≈ 1 troy oz LBMA gold)',
        };
      } else {
        axauSpot = {
          usdPerTroyOz: null,
          source: a.source,
          error:
            a.error ??
            'AXAU reference USD price unavailable and no LBMA gold reference (PAXG/XAUT) was retrievable. No fallback used.',
        };
      }
    }
  } catch (err) {
    const paxgRow = spots.find((s) => s.symbol === 'PAXG');
    const xautRow = spots.find((s) => s.symbol === 'XAUT');
    if (paxgRow && paxgRow.unitPriceUsd && paxgRow.unitPriceUsd > 0) {
      axauSpot = {
        usdPerTroyOz: paxgRow.unitPriceUsd,
        source: 'Implied from PAXG spot (1 token ≈ 1 troy oz LBMA gold)',
      };
    } else if (xautRow && xautRow.unitPriceUsd && xautRow.unitPriceUsd > 0) {
      axauSpot = {
        usdPerTroyOz: xautRow.unitPriceUsd,
        source: 'Implied from XAUT spot (1 token ≈ 1 troy oz LBMA gold)',
      };
    } else {
      axauSpot = {
        usdPerTroyOz: null,
        source: 'unavailable',
        error: err instanceof Error ? err.message : 'AXAU spot failed',
      };
    }
  }

  return {
    props: {
      assets,
      spots,
      axauSpot,
      fetchedAt: new Date().toISOString(),
    },
  };
};

function fmtUsd(n: number | null, opts: Intl.NumberFormatOptions = { maximumFractionDigits: 2 }): string {
  if (n === null || !isFinite(n)) return '—';
  return `$${n.toLocaleString(undefined, opts)}`;
}

function fmtQty(n: number | null, max = 6): string {
  if (n === null || !isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
}

function fmtPct(n: number | null): string {
  if (n === null || !isFinite(n)) return '—';
  return `${n.toFixed(2)}%`;
}

export default function AssetsDashboard({ assets, spots, axauSpot, fetchedAt }: PageProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [submittedAddress, setSubmittedAddress] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist last-used wallet address locally (read-only display preference)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('axiom.assetsDashboard.address');
      if (saved && /^0x[a-fA-F0-9]{40}$/.test(saved)) {
        setWalletAddress(saved);
      }
    } catch {
      // localStorage unavailable; ignore
    }
  }, []);

  async function loadPortfolio(addr: string) {
    setLoading(true);
    setError(null);
    setPortfolio(null);
    try {
      const res = await fetch(`/api/portfolio/external?address=${addr}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? `Request failed (${res.status})`);
        setLoading(false);
        return;
      }
      setPortfolio(json as PortfolioResponse);
      setSubmittedAddress(addr);
      try {
        localStorage.setItem('axiom.assetsDashboard.address', addr);
      } catch {
        // ignore
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = walletAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError('Invalid wallet address. Must be 0x followed by 40 hex characters.');
      return;
    }
    void loadPortfolio(addr);
  }

  // Build comparison rows
  const usdcMeta = assets.find((a) => a.symbol === 'USDC');
  const paxgMeta = assets.find((a) => a.symbol === 'PAXG');
  const xautMeta = assets.find((a) => a.symbol === 'XAUT');
  const wbtcMeta = assets.find((a) => a.symbol === 'WBTC');
  const cbethMeta = assets.find((a) => a.symbol === 'cbETH');

  const paxgSpot = spots.find((s) => s.symbol === 'PAXG');
  const xautSpot = spots.find((s) => s.symbol === 'XAUT');
  const usdcSpot = spots.find((s) => s.symbol === 'USDC');
  const wbtcSpot = spots.find((s) => s.symbol === 'WBTC');
  const cbethSpot = spots.find((s) => s.symbol === 'cbETH');

  return (
    <DesignLawLayout>
      <Head>
        <title>Asset Dashboard — Supported External Assets · Axiom Protocol</title>
        <meta
          name="description"
          content="Read-only composed dashboard of the five external supported assets (USDC, PAXG, XAUT, WBTC, cbETH) with wallet view and AXAU/AXUSD comparisons. Axiom does not issue or custody these assets."
        />
      </Head>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{
        background: COLOR.bgAlt,
        border: `1px solid ${COLOR.borderAlt}`,
        padding: '20px 24px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: COLOR.navy, margin: 0 }}>
            Asset Dashboard
          </h1>
          <span style={{
            background: COLOR.navy,
            color: '#fff',
            padding: '4px 10px',
            fontFamily: '"Courier New", monospace',
            fontSize: 11,
            letterSpacing: '0.08em',
          }}>
            READ_ONLY
          </span>
        </div>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: COLOR.text, marginTop: 12, marginBottom: 0, maxWidth: 820 }}>
          Composed view of the five external assets supported by Axiom on a read-only basis: USDC,
          PAXG, XAUT, WBTC, and cbETH. Includes spot reference, wallet-aware composition, and
          side-by-side comparisons against the Axiom-issued products AXAU (gold rail) and AXUSD
          (stable layer). Axiom does not issue or custody any external asset shown.
        </p>
        <div style={{
          marginTop: 14,
          padding: '10px 14px',
          background: COLOR.amberBg,
          border: `1px solid ${COLOR.borderAlt}`,
          fontFamily: '"Courier New", monospace',
          fontSize: 12,
          color: COLOR.amber,
        }}>
          AXAG is not live and is not issued. The Axiom-issued products are AXUSD and AXAU.
          Everything else on this page is external.
        </div>
      </div>

      {/* ── Section 1: Spot reference strip ─────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeading>Spot Reference</SectionHeading>
        <p style={{ color: COLOR.muted, fontFamily: 'Georgia, serif', fontSize: 14, marginTop: -4, marginBottom: 12 }}>
          Reference USD per token. Null when an upstream feed is unavailable — no fallback values.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <SpotCard
            label="AXAU (gold rail, implied)"
            value={fmtUsd(axauSpot.usdPerTroyOz)}
            sub={`Ref: ${axauSpot.source}`}
            error={axauSpot.error}
            highlight
          />
          {spots.map((s) => (
            <SpotCard
              key={s.symbol}
              label={`${s.symbol} (${CATEGORY_LABEL[s.category] ?? s.category})`}
              value={fmtUsd(s.unitPriceUsd)}
              sub={`Ref: ${s.source}`}
              error={s.error}
            />
          ))}
        </div>
      </section>

      {/* ── Section 2: Wallet view ──────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeading>Wallet View</SectionHeading>
        <p style={{ color: COLOR.muted, fontFamily: 'Georgia, serif', fontSize: 14, marginTop: -4, marginBottom: 12 }}>
          Enter any EVM wallet address. Axiom reads ERC-20 balances directly from the chain.
          No transactions are sent. No funds move. Axiom does not custody, manage, or
          control any returned balance.
        </p>
        <form
          onSubmit={onSubmit}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch', marginBottom: 16 }}
        >
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x... (42 hex characters)"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            style={{
              flex: '1 1 360px',
              minWidth: 0,
              padding: '10px 14px',
              fontFamily: '"Courier New", monospace',
              fontSize: 13,
              border: `1px solid ${COLOR.border}`,
              background: COLOR.bg,
              color: COLOR.text,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? COLOR.muted : COLOR.navy,
              color: '#fff',
              fontFamily: '"Courier New", monospace',
              fontSize: 13,
              letterSpacing: '0.08em',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'LOADING…' : 'LOAD POSITIONS'}
          </button>
        </form>

        {error ? (
          <div style={{
            padding: '10px 14px',
            background: '#fee2e2',
            border: `1px solid ${COLOR.red}`,
            color: COLOR.red,
            fontFamily: '"Courier New", monospace',
            fontSize: 13,
            marginBottom: 12,
          }}>
            {error}
          </div>
        ) : null}

        {portfolio ? (
          <PortfolioPanel portfolio={portfolio} address={submittedAddress ?? ''} />
        ) : (
          <div style={{
            padding: '24px',
            background: COLOR.bgAlt,
            border: `1px dashed ${COLOR.border}`,
            color: COLOR.muted,
            fontFamily: 'Georgia, serif',
            fontSize: 14,
            textAlign: 'center',
          }}>
            No wallet loaded. Enter an address above to compose live read-only positions across the
            five supported assets.
          </div>
        )}
      </section>

      {/* ── Section 3: Gold comparison — AXAU vs PAXG vs XAUT ──────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeading>Gold Asset Comparison</SectionHeading>
        <p style={{ color: COLOR.muted, fontFamily: 'Georgia, serif', fontSize: 14, marginTop: -4, marginBottom: 12 }}>
          AXAU (Axiom-issued) versus the two external gold tokens supported by Axiom (PAXG, XAUT).
          AXAU references PAX-Gold gold reserves; PAXG and XAUT are independent issuer products.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: '"Courier New", monospace',
            fontSize: 13,
            minWidth: 720,
          }}>
            <thead>
              <tr style={{ background: COLOR.bgAlt, borderBottom: `2px solid ${COLOR.border}` }}>
                <Th>Attribute</Th>
                <Th>AXAU (Axiom)</Th>
                <Th>PAXG</Th>
                <Th>XAUT</Th>
              </tr>
            </thead>
            <tbody>
              <Row label="Issuer" cells={[
                'Axiom Protocol',
                paxgMeta?.issuer ?? '—',
                xautMeta?.issuer ?? '—',
              ]} />
              <Row label="Issuer regulator" cells={[
                'Per AXAU disclosure',
                paxgMeta?.issuerRegulator ?? '—',
                xautMeta?.issuerRegulator ?? '—',
              ]} />
              <Row label="Reserve standard" cells={[
                'LBMA Good Delivery gold (PAX-Gold reserves)',
                paxgMeta?.reserveStandard ?? '—',
                xautMeta?.reserveStandard ?? '—',
              ]} />
              <Row label="Unit" cells={[
                '1 AXAU referenced to 1 troy oz of LBMA Good Delivery gold',
                paxgMeta?.unit ?? '—',
                xautMeta?.unit ?? '—',
              ]} />
              <Row label="Spot reference USD/oz" cells={[
                fmtUsd(axauSpot.usdPerTroyOz),
                fmtUsd(paxgSpot?.unitPriceUsd ?? null),
                fmtUsd(xautSpot?.unitPriceUsd ?? null),
              ]} />
              <Row label="Axiom issues?" cells={['YES', 'NO', 'NO']} />
              <Row label="Axiom custodies reserves?" cells={['NO (PAX-Gold reserves)', 'NO', 'NO']} />
              <Row label="Detail page" cells={[
                <Link key="axau" href="/axau" style={{ color: COLOR.navy }}>/axau</Link>,
                <Link key="paxg" href="/assets/paxg" style={{ color: COLOR.navy }}>/assets/paxg</Link>,
                <Link key="xaut" href="/assets/xaut" style={{ color: COLOR.navy }}>/assets/xaut</Link>,
              ]} />
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 4: Stable comparison — AXUSD vs USDC ───────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeading>Stable Asset Comparison</SectionHeading>
        <p style={{ color: COLOR.muted, fontFamily: 'Georgia, serif', fontSize: 14, marginTop: -4, marginBottom: 12 }}>
          AXUSD (Axiom-issued settlement layer) versus USDC (external supported reference stable).
          The two are independent — USDC support does not change AXUSD mechanics.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: '"Courier New", monospace',
            fontSize: 13,
            minWidth: 600,
          }}>
            <thead>
              <tr style={{ background: COLOR.bgAlt, borderBottom: `2px solid ${COLOR.border}` }}>
                <Th>Attribute</Th>
                <Th>AXUSD (Axiom)</Th>
                <Th>USDC</Th>
              </tr>
            </thead>
            <tbody>
              <Row label="Issuer" cells={['Axiom Protocol', usdcMeta?.issuer ?? '—']} />
              <Row label="Issuer regulator" cells={[
                'Per AXUSD disclosure (designed to align with the GENIUS Act)',
                usdcMeta?.issuerRegulator ?? '—',
              ]} />
              <Row label="Reserve standard" cells={[
                'Per AXUSD disclosure',
                usdcMeta?.reserveStandard ?? '—',
              ]} />
              <Row label="Spot reference USD" cells={[
                'Pegged 1:1 (per AXUSD design)',
                fmtUsd(usdcSpot?.unitPriceUsd ?? null),
              ]} />
              <Row label="Axiom issues?" cells={['YES', 'NO']} />
              <Row label="Axiom custodies reserves?" cells={['Per AXUSD disclosure', 'NO']} />
              <Row label="Detail page" cells={[
                <Link key="axusd" href="/axusd-3643" style={{ color: COLOR.navy }}>/axusd-3643</Link>,
                <Link key="usdc" href="/assets/usdc" style={{ color: COLOR.navy }}>/assets/usdc</Link>,
              ]} />
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 5: Strategic crypto facts ─────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeading>Strategic Crypto References</SectionHeading>
        <p style={{ color: COLOR.muted, fontFamily: 'Georgia, serif', fontSize: 14, marginTop: -4, marginBottom: 12 }}>
          WBTC (BTC reference) and cbETH (yield-bearing staked ETH wrapper). Neither is issued or
          custodied by Axiom. cbETH is explicitly NOT a 1:1 ETH wrapper — its conversion rate to ETH
          changes over time as staking rewards accrue.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: '"Courier New", monospace',
            fontSize: 13,
            minWidth: 600,
          }}>
            <thead>
              <tr style={{ background: COLOR.bgAlt, borderBottom: `2px solid ${COLOR.border}` }}>
                <Th>Attribute</Th>
                <Th>WBTC</Th>
                <Th>cbETH</Th>
              </tr>
            </thead>
            <tbody>
              <Row label="Issuer" cells={[wbtcMeta?.issuer ?? '—', cbethMeta?.issuer ?? '—']} />
              <Row label="Issuer regulator" cells={[
                wbtcMeta?.issuerRegulator ?? '—',
                cbethMeta?.issuerRegulator ?? '—',
              ]} />
              <Row label="Reserve standard" cells={[
                wbtcMeta?.reserveStandard ?? '—',
                cbethMeta?.reserveStandard ?? '—',
              ]} />
              <Row label="Unit" cells={[wbtcMeta?.unit ?? '—', cbethMeta?.unit ?? '—']} />
              <Row label="Spot reference USD/token" cells={[
                fmtUsd(wbtcSpot?.unitPriceUsd ?? null),
                fmtUsd(cbethSpot?.unitPriceUsd ?? null),
              ]} />
              <Row label="Axiom issues?" cells={['NO', 'NO']} />
              <Row label="Axiom custodies?" cells={['NO', 'NO']} />
              <Row label="Detail page" cells={[
                <Link key="wbtc" href="/assets/wbtc" style={{ color: COLOR.navy }}>/assets/wbtc</Link>,
                <Link key="cbeth" href="/assets/cbeth" style={{ color: COLOR.navy }}>/assets/cbeth</Link>,
              ]} />
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 6: Disclosures ─────────────────────────────────────── */}
      <section style={{ marginBottom: 24 }}>
        <SectionHeading>Disclosures</SectionHeading>
        <ul style={{ paddingLeft: 22, color: COLOR.text, fontSize: 14, lineHeight: 1.8 }}>
          <li>Axiom does <strong>not</strong> issue any of the five external assets shown.</li>
          <li>Axiom does <strong>not</strong> custody the underlying reserves of these assets.</li>
          <li>No swaps, lending, deposits, withdrawals, or banking rails are offered for these assets.</li>
          <li>Read-only support: metadata, balance reads, reference USD valuation, disclosure, portfolio inclusion.</li>
          <li>Redemption rights for any external asset depend on the underlying issuer&apos;s terms.</li>
          <li>cbETH is explicitly NOT a 1:1 ETH wrapper. No yield is offered or implied by Axiom.</li>
          <li>AXAG is not live and is not issued.</li>
        </ul>
      </section>

      <p style={{ marginTop: 24, color: COLOR.muted, fontSize: 12, fontFamily: '"Courier New", monospace' }}>
        Generated {fetchedAt} · Schema: assets-dashboard-v1 ·{' '}
        <Link href="/assets" style={{ color: COLOR.navy }}>← All Supported Assets</Link>
        {' · '}
        <Link href="/api/portfolio/external?address=0x0000000000000000000000000000000000000000" style={{ color: COLOR.navy }}>
          /api/portfolio/external
        </Link>
      </p>
    </DesignLawLayout>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SpotCard({
  label,
  value,
  sub,
  error,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  error?: string;
  highlight?: boolean;
}) {
  return (
    <div style={{
      border: `1px solid ${highlight ? COLOR.navy : COLOR.borderAlt}`,
      background: highlight ? COLOR.bgAlt : COLOR.bg,
      padding: '12px 14px',
    }}>
      <div style={{
        fontFamily: '"Courier New", monospace',
        fontSize: 10,
        color: COLOR.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Georgia, serif',
        fontSize: 22,
        color: error ? COLOR.red : COLOR.navy,
        marginBottom: 4,
      }}>
        {value}
      </div>
      <div style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: COLOR.muted }}>
        {sub}
      </div>
      {error ? (
        <div style={{ marginTop: 6, fontFamily: '"Courier New", monospace', fontSize: 10, color: COLOR.red }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

function PortfolioPanel({ portfolio, address }: { portfolio: PortfolioResponse; address: string }) {
  const { data } = portfolio;
  const total = data.totals.totalUsdValue;

  return (
    <div>
      <div style={{
        background: COLOR.bgAlt,
        border: `1px solid ${COLOR.borderAlt}`,
        padding: '14px 18px',
        marginBottom: 12,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}>
        <Stat label="Wallet" value={`${address.slice(0, 6)}…${address.slice(-4)}`} mono />
        <Stat label="Positions" value={String(data.positions.length)} />
        <Stat label="Total USD value" value={fmtUsd(total)} highlight />
        <Stat label="As of" value={new Date(data.fetchedAt).toLocaleString()} mono />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: '"Courier New", monospace',
          fontSize: 13,
          minWidth: 720,
        }}>
          <thead>
            <tr style={{ background: COLOR.bgAlt, borderBottom: `2px solid ${COLOR.border}` }}>
              <Th>Asset</Th>
              <Th>Issuer</Th>
              <Th>Chain</Th>
              <Th align="right">Balance</Th>
              <Th align="right">Spot USD</Th>
              <Th align="right">USD value</Th>
              <Th align="right">Allocation</Th>
            </tr>
          </thead>
          <tbody>
            {data.positions.map((p) => (
              <tr key={p.symbol} style={{ borderBottom: `1px solid ${COLOR.borderAlt}` }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: COLOR.text }}>
                  <Link
                    href={`/assets/${p.symbol.toLowerCase()}`}
                    style={{ color: COLOR.navy, textDecoration: 'underline' }}
                  >
                    {p.symbol}
                  </Link>
                </td>
                <td style={{ padding: '10px 12px', color: COLOR.muted }}>{p.issuer}</td>
                <td style={{ padding: '10px 12px', color: COLOR.muted }}>{p.chain}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: COLOR.text }}>{fmtQty(p.quantity)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: COLOR.text }}>
                  {fmtUsd(p.unitPriceUsd, { maximumFractionDigits: 4 })}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: COLOR.text }}>
                  {fmtUsd(p.estimatedUsdValue)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: COLOR.muted }}>
                  {fmtPct(p.allocationPct)}
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${COLOR.border}`, background: COLOR.bgAlt }}>
              <td style={{ padding: '10px 12px', fontWeight: 600, color: COLOR.navy }} colSpan={5}>
                TOTAL
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: COLOR.navy, fontWeight: 600 }}>
                {fmtUsd(total)}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: COLOR.muted }}>
                {total !== null ? '100.00%' : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {total === null ? (
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          background: COLOR.amberBg,
          border: `1px solid ${COLOR.borderAlt}`,
          fontFamily: '"Courier New", monospace',
          fontSize: 12,
          color: COLOR.amber,
        }}>
          Total is null because at least one position has an unknown USD value.
          Axiom does not silently zero-fill unknowns.
        </div>
      ) : null}

      {data.warnings.length > 0 ? (
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          background: COLOR.bgAlt,
          border: `1px solid ${COLOR.borderAlt}`,
          fontFamily: '"Courier New", monospace',
          fontSize: 12,
          color: COLOR.amber,
        }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Warnings:</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <div style={{
        fontFamily: '"Courier New", monospace',
        fontSize: 10,
        color: COLOR.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: mono ? '"Courier New", monospace' : 'Georgia, serif',
        fontSize: highlight ? 20 : 14,
        color: highlight ? COLOR.navy : COLOR.text,
      }}>
        {value}
      </div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{
      padding: '10px 12px',
      textAlign: align ?? 'left',
      color: COLOR.navy,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </th>
  );
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr style={{ borderBottom: `1px solid ${COLOR.borderAlt}` }}>
      <td style={{ padding: '10px 12px', color: COLOR.navy, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {label}
      </td>
      {cells.map((c, i) => (
        <td key={i} style={{ padding: '10px 12px', color: COLOR.text, verticalAlign: 'top' }}>
          {c}
        </td>
      ))}
    </tr>
  );
}
