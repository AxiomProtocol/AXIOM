import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  DesignLawLayout,
  SectionHeading,
  DisclosureBlock,
} from '../../components/design-law';
import { DecisionsPanel } from '../../components/sentinel';
import type { ProtocolIntelligenceData } from '../api/capital/protocol-intelligence';
import { GLOSSARY, MATURITY_LABELS } from '../../lib/glossary';

function fmtUsd(v: number): string {
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtRatio(v: number): string {
  return (v * 100).toFixed(2) + '%';
}
function fmtTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }) + ' ET';
  } catch { return iso; }
}
function policyColor(mode: string): string {
  switch (mode) {
    case 'NORMAL':     return 'text-dl-forest';
    case 'CAUTION':    return 'text-dl-gold';
    case 'RESTRICTED':
    case 'EMERGENCY':  return 'text-dl-error';
    default:           return 'text-dl-gray';
  }
}
function regimeColor(r: string): string {
  switch (r) {
    case 'TREND_UP':           return 'text-dl-forest';
    case 'TREND_DOWN':         return 'text-dl-error';
    case 'HIGH_VOL_DISLOCATION': return 'text-dl-gold';
    default:                   return 'text-dl-gray';
  }
}
function stanceColor(s: string): string {
  switch (s) {
    case 'RISK_ON':    return 'text-dl-forest';
    case 'DEFENSIVE':  return 'text-dl-gold';
    case 'HALTED':     return 'text-dl-error';
    default:           return 'text-dl-gray';
  }
}

const PROTOCOL_THESIS = [
  {
    key: 'gold',
    label: 'Gold Reserve Rail',
    ticker: 'AXAU / PAXG',
    maturity: MATURITY_LABELS[GLOSSARY.AXM_TOKEN.maturity],
    rationale:
      'AXAU is an on-chain instrument backed by PAXG-denominated gold reserves, with a per-unit backing snapshot published on-chain by NAVEngine on Arbitrum One. The design rationale is to provide institutional-grade reserve exposure to allocated gold without custody fragmentation — each unit is traceable, auditable, and redeemable against a known reserve position.',
    principle:
      '"Reserve instruments must be transparent, redeemable, and traceable end-to-end — from the gold bar to the on-chain unit."',
    why: 'Gold is the oldest hard-money reserve asset and the reference floor for the protocol treasury. Denominating primary reserves in allocated physical gold aligns long-term protocol solvency with a non-correlated, non-sovereign store of value.',
  },
  {
    key: 'stablecoin',
    label: 'Stablecoin Settlement Layer',
    ticker: 'AXUSD',
    maturity: MATURITY_LABELS[GLOSSARY.AXUSD.maturity],
    rationale:
      'Unified AXUSD is the protocol settlement token issued under the ERC-3643 (T-REX) standard, enforcing on-chain identity verification and modular compliance at the contract level. It serves as the primary unit of account for all protocol-internal transactions, reserve accounting, and participant obligations, providing a stable denominator for the full capital stack.',
    principle:
      '"Settlement rails must carry identity — a stablecoin without know-your-counterparty controls is an unauditable liability."',
    why: 'A purpose-built settlement token enables the protocol to enforce compliance rules at the asset layer rather than the application layer, making every transfer an auditable event rather than an anonymous balance change.',
  },
  {
    key: 'realestate',
    label: 'Real Estate NAV',
    ticker: 'Land Acquisition Pipeline',
    maturity: MATURITY_LABELS[GLOSSARY.PHYSICAL_ASSET_PIPELINE.maturity],
    rationale:
      'The physical asset pipeline is a framework for bridging digital capital into real-world asset acquisition, beginning with land and residential property. Properties are evaluated through the IVCEE underwriting engine and MIRDT regime intelligence before any capital deployment recommendation is produced. Acquired assets generate NAV-backed on-chain representation via the LandNAVOracle, tying real-world appraisal to on-chain accounting.',
    principle:
      '"Physical assets are the terminal inflation hedge — the protocol must have a credible path from digital capital to land ownership."',
    why: 'Real estate is historically the primary vehicle for community wealth accumulation. Embedding a formal acquisition and tokenization framework into the protocol creates a direct link between protocol governance and real-world asset formation.',
  },
  {
    key: 'depin',
    label: 'DePIN Infrastructure',
    ticker: 'Node Operator Network',
    maturity: MATURITY_LABELS['CONFIGURED_INACTIVE'],
    rationale:
      'The Decentralized Physical Infrastructure (DePIN) layer supports a network of node operators who provide computational and data services in exchange for protocol incentives. Operators are registered on-chain, subject to governance-approved parameters, and earn rewards denominated in AXUSD. The DePIN layer diversifies protocol revenue sources beyond financial rails and creates a real-world operational footprint.',
    principle:
      '"A protocol that only moves money is fragile — infrastructure operators create durable network effects that transcend market cycles."',
    why: 'DePIN aligns incentives between infrastructure operators and token holders by making network operation a direct source of protocol value. It also provides a decentralized distribution channel for protocol services.',
  },
];

const DISCLOSURE_TEXT =
  'ADVISORY NOTICE: This document is an informational briefing compiled from live protocol data. ' +
  'It does not constitute investment advice, a prospectus, or an offer of securities. ' +
  'All capital decisions are the sole responsibility of the acting party. ' +
  'Sentinel operates in advisory-only mode — no automated transactions are executed. ' +
  'AME policy mode and Sentinel decisions are deterministic outputs of the protocol risk framework, ' +
  'not forward-looking projections. Data is sourced from the development database and may not ' +
  'reflect real-time production state. Protocol is in Bootstrap Phase.';

export default function ProtocolIntelligencePage() {
  const [data, setData] = useState<ProtocolIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/capital/protocol-intelligence')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const t = data?.treasury;
  const a = data?.ame;
  const s = data?.sentinel;

  return (
    <DesignLawLayout>
      <Head>
        <title>Protocol Intelligence | Axiom Capital</title>
        <meta name="description" content="Unified institutional briefing covering Treasury Composition, AME Policy, Sentinel Decision Log, and Protocol Thesis." />
        <meta name="robots" content="noindex" />
      </Head>

      {/* ── Document header ─────────────────────────────────────────────── */}
      <div className="border-b border-dl-border pb-6 mb-10">
        <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest mb-2">
          Axiom Capital · Institutional Briefing
        </p>
        <h1 className="font-dl-serif text-4xl text-dl-navy mb-3">
          Protocol Intelligence
        </h1>
        <p className="text-dl-gray text-sm max-w-2xl leading-relaxed mb-4">
          A unified read-only briefing combining the live Treasury Composition, the Adaptive Metrics
          Engine policy state, the Sentinel capital authorization log, and the design rationale for
          each asset class supported by the protocol.
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <span className="font-dl-mono text-xs text-dl-gray">
            GENERATED:{' '}
            <span className="text-dl-navy">
              {data?.generatedAt ? fmtTs(data.generatedAt) : '—'}
            </span>
          </span>
          <span className="font-dl-mono text-xs text-dl-gray">
            STATUS:{' '}
            <span className={loading ? 'text-dl-gold' : error ? 'text-dl-error' : 'text-dl-forest'}>
              {loading ? 'LOADING' : error ? 'ERROR' : 'LIVE'}
            </span>
          </span>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-dl-gray py-16 text-center font-dl-mono">
          Fetching live protocol data…
        </p>
      )}

      {error && (
        <div className="border border-dl-error px-5 py-4 mb-8">
          <p className="text-sm text-dl-error font-dl-mono">
            Data unavailable — {error}. Retry by refreshing the page.
          </p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              CHAPTER 1 — TREASURY COMPOSITION
          ═══════════════════════════════════════════════════════════════ */}
          <section className="mb-14" aria-labelledby="ch1">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-dl-mono text-xs text-dl-gray">01</span>
              <SectionHeading>
                <span id="ch1">Treasury Composition</span>
              </SectionHeading>
            </div>
            <p className="text-sm text-dl-gray mb-6">
              Current reserve holdings and capital adequacy metrics sourced from the most recent
              administrative solvency snapshot.
            </p>

            {t?.dataStatus !== 'ok' ? (
              <div className="border border-dl-border px-5 py-6">
                <p className="text-sm text-dl-gray font-dl-mono">
                  {t?.dataStatus === 'empty'
                    ? 'No treasury snapshot has been recorded yet. Values will populate after the first administrative ingestion.'
                    : 'Treasury data unavailable — retry in progress.'}
                </p>
              </div>
            ) : (
              <>
                {/* Top-line metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-dl-border mb-6">
                  {[
                    { label: 'Treasury Total', value: fmtUsd(t.treasuryTotalUsd) },
                    { label: 'Treasury Liquid', value: fmtUsd(t.treasuryLiquidUsd) },
                    { label: 'Reserves', value: fmtUsd(t.reservesTotalUsd) },
                    { label: 'Liabilities', value: fmtUsd(t.liabilitiesTotalUsd) },
                    { label: 'Coverage Ratio', value: fmtRatio(t.coverageRatio) },
                    { label: 'Reserve Ratio', value: fmtRatio(t.reserveRatio) },
                  ].map((m, i) => (
                    <div
                      key={m.label}
                      className={`px-4 py-3 ${i < 5 ? 'border-r border-dl-border' : ''}`}
                    >
                      <p className="text-xs text-dl-gray mb-1">{m.label}</p>
                      <p className="font-dl-mono text-sm font-semibold text-dl-navy">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Policy / Regime / Gate strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 border border-dl-border mb-6 bg-dl-bg-alt">
                  <div className="px-4 py-3 border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Policy Mode</p>
                    <p className={`font-dl-mono text-sm font-semibold ${policyColor(t.policyMode)}`}>
                      {t.policyMode}
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Regime State</p>
                    <p className="font-dl-mono text-sm font-semibold text-dl-navy">{t.regimeState}</p>
                  </div>
                  <div className="px-4 py-3 border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Hard Brake</p>
                    <p className={`font-dl-mono text-sm font-semibold ${t.hardBrake === 'ON' ? 'text-dl-error' : 'text-dl-forest'}`}>
                      {t.hardBrake}
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-dl-gray mb-1">Gate Status</p>
                    <p className="font-dl-mono text-sm font-semibold text-dl-navy">{t.gateStatus}</p>
                  </div>
                </div>

                {/* Composition table */}
                {t.composition.length > 0 && (
                  <div className="border border-dl-border">
                    <div className="px-4 py-2 bg-dl-bg-alt border-b border-dl-border">
                      <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">
                        Asset Composition
                      </p>
                    </div>
                    <dl className="divide-y divide-dl-border">
                      {t.composition.map((c) => (
                        <div key={c.label} className="flex items-center justify-between px-4 py-2">
                          <dt className="text-sm text-dl-navy">{c.label}</dt>
                          <dd className="font-dl-mono text-sm text-dl-navy text-right">
                            {fmtUsd(c.valueUsd)}
                            <span className="ml-3 text-xs text-dl-gray">
                              {c.pct.toFixed(1)}%
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Snapshot provenance */}
                <div className="mt-4 flex flex-wrap gap-6">
                  {t.asOfUtc && (
                    <p className="font-dl-mono text-xs text-dl-gray">
                      Snapshot as of: <span className="text-dl-navy">{fmtTs(t.asOfUtc)}</span>
                    </p>
                  )}
                  {t.snapshotId && (
                    <p className="font-dl-mono text-xs text-dl-gray">
                      Snapshot ID: <span className="text-dl-navy">{t.snapshotId}</span>
                    </p>
                  )}
                </div>
              </>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              CHAPTER 2 — AME POLICY BRIEF
          ═══════════════════════════════════════════════════════════════ */}
          <section className="mb-14" aria-labelledby="ch2">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-dl-mono text-xs text-dl-gray">02</span>
              <SectionHeading>
                <span id="ch2">Adaptive Metrics Engine — Policy Brief</span>
              </SectionHeading>
            </div>
            <p className="text-sm text-dl-gray mb-6">
              Current operating posture of the deterministic financial computation engine that
              governs yield permission, waterfall distribution, and capital deployment gates.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: plain-language explanation */}
              <div className="border border-dl-border px-6 py-5 space-y-4">
                <p className="font-dl-serif text-base text-dl-navy mb-2">
                  What the Adaptive Metrics Engine does
                </p>
                <p className="text-sm text-dl-gray leading-relaxed">
                  The Adaptive Metrics Engine (AME) is a deterministic computation layer that
                  continuously evaluates the protocol&apos;s capital adequacy across multiple
                  dimensions — coverage ratio, reserve ratio, loss-buffer depth, and liquidity
                  depth — and maps the combined reading onto a regime band and a policy mode.
                </p>
                <p className="text-sm text-dl-gray leading-relaxed">
                  When all metrics are within target thresholds the engine holds the policy mode at
                  NORMAL, permitting standard yield distribution and capital deployment. As metrics
                  deteriorate, the engine steps the mode toward CAUTION, then RESTRICTED, and
                  ultimately EMERGENCY — each transition applying progressively tighter constraints
                  on what operations are permitted.
                </p>
                <p className="text-sm text-dl-gray leading-relaxed">
                  The hard brake is a binary circuit-breaker that can be tripped by a single
                  critical threshold breach. When armed it suspends all discretionary capital
                  actions regardless of the policy mode, functioning as the last line of
                  automated protection before governance intervention is required.
                </p>
              </div>

              {/* Right: live state */}
              <div className="border border-dl-border px-6 py-5">
                <p className="font-dl-serif text-base text-dl-navy mb-4">
                  Current Engine State
                </p>

                {a?.dataStatus === 'error' ? (
                  <p className="text-sm text-dl-gray font-dl-mono">
                    AME state unavailable — retry in progress.
                  </p>
                ) : a?.dataStatus === 'empty' || a?.policyMode === null ? (
                  <p className="text-sm text-dl-gray font-dl-mono">
                    No evaluation recorded yet. AME will populate on first automated cycle.
                  </p>
                ) : (
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-xs text-dl-gray mb-1">Policy Mode</dt>
                      <dd className={`font-dl-mono text-xl font-semibold ${policyColor(a.policyMode!)}`}>
                        {a.policyMode}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-dl-gray mb-1">Hard Brake</dt>
                      <dd className={`font-dl-mono text-sm font-semibold ${a.hardBrakeActive ? 'text-dl-error' : 'text-dl-forest'}`}>
                        {a.hardBrakeActive ? 'ARMED' : 'RELEASED'}
                      </dd>
                    </div>
                    {a.recordedAt && (
                      <div>
                        <dt className="text-xs text-dl-gray mb-1">Last Evaluation</dt>
                        <dd className="font-dl-mono text-xs text-dl-navy">
                          {fmtTs(a.recordedAt)}
                        </dd>
                      </div>
                    )}
                    {a.evaluationId && (
                      <div>
                        <dt className="text-xs text-dl-gray mb-1">Evaluation ID</dt>
                        <dd className="font-dl-mono text-xs text-dl-gray break-all">
                          {a.evaluationId}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}

                {/* Policy mode reference */}
                <div className="mt-6 border-t border-dl-border pt-4">
                  <p className="text-xs text-dl-gray mb-3 font-dl-mono uppercase tracking-wider">
                    Mode Reference
                  </p>
                  <div className="space-y-2">
                    {[
                      { mode: 'BOOTSTRAP',  desc: 'Initialization. Metrics are informational. No stabilization actions active.',       color: 'text-dl-gray'  },
                      { mode: 'NORMAL',     desc: 'All metrics within target. Standard operations permitted.',                          color: 'text-dl-forest'},
                      { mode: 'CAUTION',    desc: 'Advisory threshold crossed. Enhanced monitoring active.',                            color: 'text-dl-gold'  },
                      { mode: 'RESTRICTED', desc: 'Intervention threshold breached. Capital deployment paused.',                        color: 'text-dl-error' },
                      { mode: 'EMERGENCY',  desc: 'Critical breach. All non-essential operations suspended. Governance required.',      color: 'text-dl-error' },
                    ].map(({ mode, desc, color }) => (
                      <div key={mode} className="flex gap-2">
                        <span className={`font-dl-mono text-xs w-24 shrink-0 ${color}`}>{mode}</span>
                        <span className="text-xs text-dl-gray leading-snug">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              CHAPTER 3 — SENTINEL DECISION LOG
          ═══════════════════════════════════════════════════════════════ */}
          <section className="mb-14" aria-labelledby="ch3">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-dl-mono text-xs text-dl-gray">03</span>
              <SectionHeading>
                <span id="ch3">Sentinel Decision Log</span>
              </SectionHeading>
            </div>
            <p className="text-sm text-dl-gray mb-6">
              Live capital authorization feed. Sentinel operates in advisory-only mode — all
              outputs are informational. No automated transactions are executed.
            </p>

            {s?.dataStatus === 'error' ? (
              <div className="border border-dl-border px-5 py-4 mb-6">
                <p className="text-sm text-dl-error font-dl-mono">
                  Sentinel data unavailable — retry in progress.
                </p>
              </div>
            ) : (
              <>
                {/* 7-day summary strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 border border-dl-border mb-6">
                  <div className="px-4 py-3 border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Market Regime</p>
                    <p className={`font-dl-mono text-sm font-semibold ${regimeColor(s?.regime ?? '')}`}>
                      {s?.regime ?? '—'}
                    </p>
                    {!!s?.regimeConfidence && (
                      <p className="text-xs text-dl-gray mt-0.5">
                        {s.regimeConfidence}% confidence
                      </p>
                    )}
                  </div>
                  <div className="px-4 py-3 border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">System Stance</p>
                    <p className={`font-dl-mono text-sm font-semibold ${stanceColor(s?.systemStance ?? '')}`}>
                      {s?.systemStance ?? '—'}
                    </p>
                  </div>
                  <div className="px-4 py-3 border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Approved (7 d)</p>
                    <p className="font-dl-mono text-sm font-semibold text-dl-forest">
                      {s?.approvedLast7d ?? 0}
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-dl-gray mb-1">Denied (7 d)</p>
                    <p className="font-dl-mono text-sm font-semibold text-dl-error">
                      {s?.deniedLast7d ?? 0}
                    </p>
                  </div>
                </div>

                {/* Signals summary */}
                <div className="grid grid-cols-2 border border-dl-border mb-6 bg-dl-bg-alt">
                  <div className="px-4 py-3 border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Total Signals</p>
                    <p className="font-dl-mono text-sm text-dl-navy">{s?.totalSignals ?? 0}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-dl-gray mb-1">Qualified Signals</p>
                    <p className="font-dl-mono text-sm text-dl-navy">{s?.qualifiedSignals ?? 0}</p>
                  </div>
                </div>

                {/* Decisions table via shared component */}
                <DecisionsPanel decisions={s?.decisions ?? []} />

                <p className="font-dl-mono text-xs text-dl-gray mt-3">
                  Showing 20 most recent decisions. Full audit trail available at{' '}
                  <a href="/sentinel/audit" className="underline text-dl-navy">
                    /sentinel/audit
                  </a>.
                </p>
              </>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════════════
              CHAPTER 4 — PROTOCOL THESIS
          ═══════════════════════════════════════════════════════════════ */}
          <section className="mb-14" aria-labelledby="ch4">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-dl-mono text-xs text-dl-gray">04</span>
              <SectionHeading>
                <span id="ch4">Protocol Thesis</span>
              </SectionHeading>
            </div>
            <p className="text-sm text-dl-gray mb-6">
              Design rationale for the four asset classes supported by the Axiom Protocol
              capital stack. All copy uses approved institutional vocabulary.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {PROTOCOL_THESIS.map((item) => (
                <div key={item.key} className="border border-dl-border px-6 py-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest mb-1">
                        {item.ticker}
                      </p>
                      <p className="font-dl-serif text-lg text-dl-navy">{item.label}</p>
                    </div>
                    <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5 whitespace-nowrap">
                      {item.maturity}
                    </span>
                  </div>
                  <p className="text-sm text-dl-gray leading-relaxed mb-4">{item.rationale}</p>
                  <div className="border-l-2 border-dl-gold pl-4 mb-4">
                    <p className="text-sm text-dl-navy font-dl-serif italic leading-snug">
                      {item.principle}
                    </p>
                  </div>
                  <div className="bg-dl-bg-alt border border-dl-border px-4 py-3">
                    <p className="text-xs text-dl-gray mb-1 font-dl-mono uppercase tracking-wider">
                      Design rationale
                    </p>
                    <p className="text-xs text-dl-gray leading-relaxed">{item.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <DisclosureBlock text={DISCLOSURE_TEXT} />
        </>
      )}
    </DesignLawLayout>
  );
}
