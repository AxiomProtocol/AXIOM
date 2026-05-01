/**
 * AXAU Phase 2C — Commodity Disclosure page
 *
 * Public, read-only disclosure surface that consumes
 * /api/axau/commodity-disclosure and renders all six health sections,
 * known limitations, deferred-rails disclaimer, and required disclaimers.
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../components/design-law';
import type {
  CommodityDisclosure,
  RiskLabel,
  SectionStatus,
} from '../lib/axau/commodityDisclosure';

const RISK_STYLES: Record<RiskLabel, { bg: string; text: string; border: string }> = {
  HEALTHY:  { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-300' },
  WATCH:    { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
  DEGRADED: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' },
  CRITICAL: { bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-300' },
};

function RiskPill({ label }: { label: RiskLabel }) {
  const s = RISK_STYLES[label];
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-dl-mono border ${s.bg} ${s.text} ${s.border}`}>
      {label}
    </span>
  );
}

function NotesList({ notes }: { notes: string[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-sm text-dl-gray">
      {notes.map((n, i) => (
        <li key={i} className="font-dl-mono">• {n}</li>
      ))}
    </ul>
  );
}

function SectionCard({
  title,
  status,
  children,
}: {
  title: string;
  status: SectionStatus;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-dl-border bg-dl-bg p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-dl-serif text-lg text-dl-navy">{title}</h3>
        <RiskPill label={status.label} />
      </div>
      {children && <div className="mt-3">{children}</div>}
      <NotesList notes={status.notes} />
    </div>
  );
}

function Datum({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 py-1 border-b border-dl-border last:border-b-0">
      <dt className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">{label}</dt>
      <dd className="text-sm text-dl-navy font-dl-mono break-all text-right">
        {value ?? <span className="text-dl-gray">—</span>}
      </dd>
    </div>
  );
}

function fmtAge(min: number | null): string {
  if (min === null) return '—';
  if (min < 60)   return `${min.toFixed(1)} min`;
  return `${(min / 60).toFixed(1)} h`;
}

function fmtSec(sec: number | null): string {
  if (sec === null) return '—';
  if (sec < 0)      return '—';
  if (sec < 60)     return `${sec}s`;
  if (sec < 3600)   return `${(sec / 60).toFixed(1)} min`;
  return `${(sec / 3600).toFixed(1)} h`;
}

export default function AxauDisclosurePage() {
  const [data, setData] = useState<CommodityDisclosure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/axau/commodity-disclosure', { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.detail || body?.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as CommodityDisclosure;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <>
      <Head>
        <title>AXAU Commodity Disclosure — Axiom Protocol</title>
        <meta
          name="description"
          content="AXAU live commodity disclosure: backing, NAV engine, oracle, liquidity, mint/redeem, and solvency snapshot health."
        />
      </Head>
      <DesignLawLayout>
        <SectionHeading>AXAU Commodity Status Console</SectionHeading>
        <p className="text-sm text-dl-gray font-dl-mono -mt-2">
          Live health surface for the AXAU reserve instrument. Crypto-native, read-only —
          no swaps are executed from this page.
        </p>

        {loading && (
          <div className="border border-dl-border bg-dl-bg p-5 mt-6">
            <p className="text-sm text-dl-gray font-dl-mono">Loading live disclosure…</p>
          </div>
        )}

        {error && !loading && (
          <div className="border border-red-300 bg-red-50 p-5 mt-6">
            <p className="text-sm text-red-800 font-dl-mono">
              Disclosure unavailable: {error}
            </p>
            <p className="mt-2 text-xs text-red-700">
              The endpoint is read-only; this error reflects an upstream RPC, oracle, or database
              issue — no on-chain action is implied.
            </p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6 mt-6">
            {/* AXAU status summary */}
            <div className={`border p-5 ${RISK_STYLES[data.overall.label].bg} ${RISK_STYLES[data.overall.label].border}`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-dl-serif text-2xl text-dl-navy">AXAU status summary</h2>
                <RiskPill label={data.overall.label} />
              </div>
              <p className="mt-2 text-xs text-dl-gray font-dl-mono">
                Generated {new Date(data.generatedAt).toISOString()} · schema {data.schemaVersion}
              </p>
              <NotesList notes={data.overall.notes} />
            </div>

            {/* Backing & reserve */}
            <SectionCard title="Backing and reserve" status={data.sections.backingReserve}>
              <dl>
                <Datum label="Total supply"           value={data.sections.backingReserve.totalSupply} />
                <Datum label="Total backing (USD)"    value={data.sections.backingReserve.totalBackingUsd} />
                <Datum label="Backing NAV / token"    value={data.sections.backingReserve.backingNavPerToken} />
                <Datum label="Coverage ratio"         value={data.sections.backingReserve.coverageRatioPct} />
                <Datum label="Coverage (bps)"         value={data.sections.backingReserve.coverageRatioBps} />
                <Datum label="Solvent"                value={
                  data.sections.backingReserve.isSolvent === null
                    ? null
                    : data.sections.backingReserve.isSolvent ? 'YES' : 'NO'} />
                <Datum label="Gold reserve asset"     value={data.sections.backingReserve.goldReserveAsset} />
                <Datum label="Gold units"             value={data.sections.backingReserve.goldTotalUnits} />
                <Datum label="Gold value (USD)"       value={data.sections.backingReserve.goldValueUsd} />
                <Datum label="PAXG buffer"            value={data.sections.backingReserve.paxgBufferBalance} />
                <Datum label="Buffer capacity"        value={data.sections.backingReserve.paxgBufferCapacity} />
                <Datum label="Pending PAXG required"  value={data.sections.backingReserve.pendingPaxgRequired} />
              </dl>
            </SectionCard>

            {/* NAVEngine */}
            <SectionCard title="NAVEngine health" status={data.sections.navEngine}>
              <dl>
                <Datum label="Degraded"            value={
                  data.sections.navEngine.navEngineDegraded === null
                    ? null
                    : data.sections.navEngine.navEngineDegraded ? 'YES' : 'NO'} />
                <Datum label="Degraded reason"     value={data.sections.navEngine.navEngineDegradedReason} />
                <Datum label="Mint NAV / token"    value={data.sections.navEngine.mintNavPerToken} />
                <Datum label="Backing NAV / token" value={data.sections.navEngine.backingNavPerToken} />
              </dl>
            </SectionCard>

            {/* Oracle */}
            <SectionCard title="Oracle freshness (XAU/USD)" status={data.sections.oracle}>
              <dl>
                <Datum label="Stale"               value={
                  data.sections.oracle.isStale === null
                    ? null
                    : data.sections.oracle.isStale ? 'YES' : 'NO'} />
                <Datum label="Age"                 value={fmtSec(data.sections.oracle.ageSec)} />
                <Datum label="Max staleness"       value={fmtSec(data.sections.oracle.maxStalenessSec)} />
                <Datum label="Threshold source"    value={data.sections.oracle.thresholdSource} />
                <Datum label="Last updated"        value={data.sections.oracle.lastUpdatedAtIso} />
                <Datum label="Spot price (USD)"    value={data.sections.oracle.priceUsd?.toFixed(2)} />
              </dl>
            </SectionCard>

            {/* Liquidity */}
            <SectionCard title="Liquidity health" status={data.sections.liquidity}>
              <dl>
                <Datum label="AXAU price (USD)"      value={data.sections.liquidity.axauPriceUsd?.toFixed(6)} />
                <Datum label="Gold price (USD)"      value={data.sections.liquidity.goldPriceUsd?.toFixed(2)} />
                <Datum label="Deviation (bps)"       value={data.sections.liquidity.priceDeviationBps} />
                <Datum label="Arb opportunity"       value={
                  data.sections.liquidity.arbitrageOpportunity === null
                    ? null
                    : data.sections.liquidity.arbitrageOpportunity ? 'YES' : 'NO'} />
                <Datum label="Arb direction"         value={data.sections.liquidity.arbitrageDirection} />
                <Datum label="Liquidity sub-grade"   value={data.sections.liquidity.liquidityHealth} />
                <Datum label="Simulation only"       value="YES" />
                <Datum label="Slippage modeled"      value="NO (not_modeled)" />
                <Datum label="Pool depth modeled"    value="NO (not_modeled)" />
              </dl>
              <p className="mt-3 text-xs text-dl-gray italic">
                Route quotes shown elsewhere in the protocol are deterministic simulations,
                not executable swap quotes.
              </p>
            </SectionCard>

            {/* Mint / Redeem */}
            <SectionCard title="Mint / Redeem availability" status={data.sections.mintRedeem}>
              <dl>
                <Datum label="Mint paused"     value={
                  data.sections.mintRedeem.mintPaused === null
                    ? null
                    : data.sections.mintRedeem.mintPaused ? 'YES' : 'NO'} />
                <Datum label="Redeem paused"   value={
                  data.sections.mintRedeem.redeemPaused === null
                    ? null
                    : data.sections.mintRedeem.redeemPaused ? 'YES' : 'NO'} />
                <Datum label="Mint fee (bps)"  value={data.sections.mintRedeem.mintFeeBps} />
                <Datum label="Redeem fee (bps)" value={data.sections.mintRedeem.redeemFeeBps} />
                <Datum label="Total minted"    value={data.sections.mintRedeem.totalMinted} />
                <Datum label="Total redeemed"  value={data.sections.mintRedeem.totalRedeemed} />
              </dl>
            </SectionCard>

            {/* Solvency snapshot */}
            <SectionCard title="Solvency snapshot freshness" status={data.sections.solvencySnapshot}>
              <dl>
                <Datum label="Latest snapshot"     value={data.sections.solvencySnapshot.latestSnapshotAt} />
                <Datum label="Age"                 value={fmtAge(data.sections.solvencySnapshot.latestSnapshotAgeMinutes)} />
                <Datum label="Target max age"     value={`${data.sections.solvencySnapshot.maxAgeMinutes} min`} />
                <Datum label="Snapshots (72h)"     value={data.sections.solvencySnapshot.totalSnapshots72h} />
                <Datum label="Latest checksum"     value={data.sections.solvencySnapshot.latestChecksum} />
              </dl>
            </SectionCard>

            {/* Known limitations */}
            <div className="border border-dl-border bg-dl-bg p-5">
              <h3 className="font-dl-serif text-lg text-dl-navy">Known limitations</h3>
              <ul className="mt-3 space-y-2 text-sm text-dl-gray">
                {data.knownLimitations.map((s, i) => (
                  <li key={i} className="font-dl-mono">• {s}</li>
                ))}
              </ul>
            </div>

            {/* Deferred rails */}
            <div className="border border-orange-300 bg-orange-50 p-5">
              <h3 className="font-dl-serif text-lg text-dl-navy">{data.deferredRails.headline}</h3>
              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-orange-900">
                {data.deferredRails.items.map((s, i) => (
                  <li key={i} className="font-dl-mono">• {s}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-orange-800 italic">
                These rails are not in scope for the AXAU launch and are not available through
                this protocol.
              </p>
            </div>

            {/* Disclaimers */}
            <div className="border border-dl-border bg-dl-bg p-5">
              <h3 className="font-dl-serif text-lg text-dl-navy">Disclosures</h3>
              <ol className="mt-3 space-y-2 text-sm text-dl-navy list-decimal list-inside">
                {data.disclaimers.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </DesignLawLayout>
    </>
  );
}
