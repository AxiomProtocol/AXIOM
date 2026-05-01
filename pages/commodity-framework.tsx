/**
 * /commodity-framework — Commodity Expansion Framework
 *
 * Public, read-only governance page. Renders the full Axiom Protocol
 * Commodity Expansion Framework (documents/commodities/COMMODITY_EXPANSION_FRAMEWORK.md)
 * as a structured public page using Design Law layout.
 *
 * Static: no API calls, no contract reads, no DB writes, no new dependencies.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetStaticProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  effectiveDate: string;
}

type StatusLabel = 'NOT LAUNCHED' | 'DEFERRED' | 'PROHIBITED' | 'LIVE';
type ApprovalBand = 'APPROVED' | 'CONDITIONAL' | 'DEFERRED' | 'REJECTED';

// ─── Static data (sourced from COMMODITY_EXPANSION_FRAMEWORK.md v1.0.0) ───────

const CANDIDATE_CATEGORIES = [
  {
    id: 'A',
    title: 'Precious Metals',
    subtitle: 'Silver (XAG), Platinum (XPT), Palladium (XPD)',
    status: 'NOT LAUNCHED' as StatusLabel,
    summary:
      'Precious metals share AXAU\'s core infrastructure pattern. Chainlink publishes XAG/USD, XPT/USD, and XPD/USD feeds on Arbitrum One. Tokenized precious metal instruments provide a custody-eligible reserve asset class. Silver (AXAG) is the highest-readiness candidate given the maturity of its Chainlink feed.',
    notes: [
      'Silver: most technically ready — existing XAG/USD feed on Arbitrum One',
      'Platinum and palladium: deferred pending deeper oracle and liquidity analysis',
    ],
  },
  {
    id: 'B',
    title: 'Base Metals',
    subtitle: 'Copper (XCU), Aluminum',
    status: 'NOT LAUNCHED' as StatusLabel,
    summary:
      'Base metal markets are dominated by futures contracts rather than spot physical delivery, introducing roll risk and storage cost considerations not present in the gold and silver model. Chainlink does not publish a production-grade XCU/USD feed on Arbitrum One.',
    notes: [
      'Deferred until a production-grade Chainlink feed exists on Arbitrum One',
      'No base metal instrument may advance past Stage 1 without an oracle meeting Section 5 requirements',
    ],
  },
  {
    id: 'C',
    title: 'Energy-Linked',
    subtitle: 'Oil (WTI/Brent), Natural Gas',
    status: 'NOT LAUNCHED' as StatusLabel,
    summary:
      'Energy commodities cannot be physically settled in a wallet-to-wallet manner equivalent to PAXG. Redemption likely requires a third-party intermediary for physical delivery or fiat conversion, which conflicts with this framework\'s non-fiat-redemption standard. Energy prices are significantly more volatile than gold.',
    notes: [
      'Classified as deferred — technically eligible in principle but requires structural resolution on the redemption model',
      'Must solve physical delivery or adopt a warehouse-receipt model before passing Stage 2',
    ],
  },
  {
    id: 'D',
    title: 'Agricultural Commodities',
    subtitle: 'Grain, Cotton, Coffee, Cocoa',
    status: 'NOT LAUNCHED' as StatusLabel,
    summary:
      'Agricultural commodities are perishable or subject to quality degradation over time, introducing reserve adequacy risks not present in gold. Chainlink does not maintain production-grade agricultural commodity feeds on Arbitrum One. Market liquidity is highly seasonal.',
    notes: [
      'Deferred — requires production oracle, non-perishable or durability-certified custody model',
      'Must demonstrate a redemption path that does not require USD fiat settlement',
    ],
  },
  {
    id: 'E',
    title: 'Land-Backed Reserve Units',
    subtitle: 'Real property portfolio instrument (distinct from AXAU land vault component)',
    status: 'NOT LAUNCHED' as StatusLabel,
    summary:
      'The highest-priority category for Phase 3 evaluation. Axiom Protocol already has partial infrastructure: AXLandVault, LandNAVOracleMultiSig, Physical Asset Pipeline, and Field Capture System. A standalone land reserve instrument distinct from AXAU\'s secondary land vault component is the most architecturally adjacent expansion.',
    notes: [
      'Requires finalized LandNAVOracle methodology with external attestation',
      'Governance must approve NAV update frequency and staleness thresholds',
      'Redemption model must not promise USD — returns land receipt tokens or staged auction mechanism',
    ],
  },
];

const APPROVAL_STAGES = [
  {
    stage: 1,
    name: 'Candidate Submission',
    artifact: 'Commodity Candidate Brief (CCB)',
    description:
      'Any AXM governance token holder submits a CCB to the governance forum. Minimum 7-day comment period. No community vote required — Stage 1 is informational.',
  },
  {
    stage: 2,
    name: 'Technical Diligence',
    artifact: 'Technical Diligence Report (TDR)',
    description:
      'Structured review against Sections 4–9. Risk score computed per Section 10. Scores 17+ terminate the workflow at this stage. Passing TDR (score 10 or below) or CONDITIONAL TDR (11–16 with remediation plan) advances to Stage 3.',
  },
  {
    stage: 3,
    name: 'Governance Vote',
    artifact: 'Governance Approval Record (GAR)',
    description:
      'On-chain governance proposal referencing CCB and TDR by hash or IPFS CID. Voting follows current AXM governance rules (quorum, approval threshold, window). Passing vote produces a GAR with approved parameters.',
  },
  {
    stage: 4,
    name: 'Launch Gate',
    artifact: 'Launch Readiness Certificate (LRC)',
    description:
      'Full pre-flight checklist executed against a deployed staging environment. Every hard blocker must pass. Soft gates require governance waiver if failing. LRC issuance is the only condition under which an instrument may be described as LIVE.',
  },
];

const RISK_DIMENSIONS = [
  {
    id: 'D1',
    name: 'Oracle Risk',
    description: 'Quality, maturity, and availability of the price feed for the reserve asset',
    axauScore: 1,
    axauNote: 'Production Chainlink XAU/USD on Arbitrum One, 2+ year history',
  },
  {
    id: 'D2',
    name: 'Custody Risk',
    description: 'Quality, segregation, and auditability of the reserve asset custody arrangement',
    axauScore: 1,
    axauNote: 'Paxos Trust Company, regulated, PAXG directly redeemable on-chain',
  },
  {
    id: 'D3',
    name: 'Liquidity Risk',
    description: 'Depth and redemption liquidity of the reserve asset market',
    axauScore: 2,
    axauNote: 'PAXG on-chain, deep gold spot market; limited AMM depth for AXAU at launch',
  },
  {
    id: 'D4',
    name: 'Reserve Risk',
    description: 'Stability and integrity of the underlying reserve asset as collateral',
    axauScore: 1,
    axauNote: 'Physical gold, LBMA accredited, non-perishable, centuries of preservation',
  },
  {
    id: 'D5',
    name: 'Regulatory Risk',
    description: 'Legal and regulatory clarity surrounding the instrument',
    axauScore: 2,
    axauNote: 'Strong commodity precedent; stablecoin framework developing; legal review in progress',
  },
];

const SCORE_BANDS: { range: string; band: ApprovalBand; outcome: string }[] = [
  { range: '5 – 10', band: 'APPROVED', outcome: 'Proceed to Stage 3 (Governance Vote)' },
  { range: '11 – 16', band: 'CONDITIONAL', outcome: 'Proceed to Stage 3 with documented remediation plan for each dimension scoring 3 or above' },
  { range: '17 – 21', band: 'DEFERRED', outcome: 'Workflow terminates at Stage 2; candidate must be substantially revised before re-submission' },
  { range: '22 – 25', band: 'REJECTED', outcome: 'Structurally incompatible with this framework; framework amendment required to reconsider' },
];

const HARD_BLOCKERS = [
  { id: 'HB-01', gate: 'Oracle not stale', detail: 'isStale must be false; oracle age below configured threshold' },
  { id: 'HB-02', gate: 'NAVEngine not degraded', detail: 'navEngineDegraded must be false; backing NAV per token must be a valid positive number' },
  { id: 'HB-03', gate: 'Coverage ratio 105% or above', detail: 'coverageRatioBps must be at or above 10,500' },
  { id: 'HB-04', gate: 'Custody attestation within 30 days', detail: 'Signed attestation from designated custodian, published on-chain or via public IPFS CID' },
  { id: 'HB-05', gate: 'Liquidity engine deployed and validated', detail: 'Phase 2B-equivalent engine returns valid response with all required fields; NaN/Infinity edge cases tested' },
  { id: 'HB-06', gate: 'Disclosure endpoint live at HTTP 200', detail: 'GET /api/<instrument>/commodity-disclosure returns 200 with all 10 required sections' },
  { id: 'HB-07', gate: 'Disclosure page renders all risk sections', detail: 'All six section cards visible with correct risk labels' },
  { id: 'HB-08', gate: 'No unreviewed contract changes since last audit', detail: 'Deployed bytecodes match reviewed artifacts; deployment hashes match the LRC' },
  { id: 'HB-09', gate: 'End-to-end mint and redeem tested on mainnet', detail: 'Test transaction hashes from mainnet staging; amounts above oracle-enforced minimum' },
  { id: 'HB-10', gate: 'Deferred rails disclaimer published', detail: 'deferredRails.items includes all inapplicable redemption paths; page renders deferred rails card' },
];

const SOFT_GATES = [
  { id: 'SG-01', gate: 'Solvency snapshot under 20 minutes old', note: 'Stalled cron is a known operational risk; waiver requires operator monitoring commitment' },
  { id: 'SG-02', gate: 'Buffer covers 100% of pending redemption demand', note: 'Partial buffer at launch may be acceptable if total pending demand is zero' },
  { id: 'SG-03', gate: 'Emergency pause runbook acknowledged by operator', note: 'Acknowledgment should be recorded on-chain or in the operator console' },
  { id: 'SG-04', gate: 'External security review of automated control layers completed', note: 'Instruments reusing AXAU\'s existing contracts without modification pass by inheritance' },
  { id: 'SG-05', gate: 'User-facing FAQ describing redemption model published', note: 'Must state: "Redemption returns [reserve asset token], not USD."' },
];

const DEFERRED_COMMODITIES = [
  {
    commodity: 'Silver (XAG)',
    reason: 'Viable — awaiting governance prioritization after AXAU establishes full operational pattern',
    conditions: 'Governance vote to commence Stage 1; Chainlink XAG/USD feed on Arbitrum One already meets oracle standards',
  },
  {
    commodity: 'Platinum (XPT)',
    reason: 'Chainlink XPT/USD on Arbitrum One has limited history; custody model less established than gold',
    conditions: '12+ months of production Chainlink XPT/USD history on Arbitrum One; qualified custodian issuing on-chain receipt token',
  },
  {
    commodity: 'Palladium (XPD)',
    reason: 'High volatility; limited Chainlink feed history on Arbitrum One; thin market depth',
    conditions: 'Same as platinum; additionally, demonstration of sufficient market depth for a viable liquidity engine',
  },
  {
    commodity: 'Copper (XCU)',
    reason: 'No production Chainlink XCU/USD feed on Arbitrum One; market dominated by futures not spot',
    conditions: 'Production Chainlink XCU/USD feed on Arbitrum One with 12+ months uptime; spot physical custody solution',
  },
  {
    commodity: 'Land-backed reserve unit',
    reason: 'Infrastructure partially built (AXLandVault, LandNAVOracle); requires finalized NAV methodology and external attestation',
    conditions: 'Finalized LandNAVOracle methodology with external attestation; governance-approved update frequency and staleness thresholds; redemption model that does not promise USD',
  },
  {
    commodity: 'Oil (WTI/Brent)',
    reason: 'Redemption model challenge: physical oil delivery to a wallet address is not possible in a standard ERC-20 redemption',
    conditions: 'Qualified custodian issuing a warehouse-receipt ERC-20 token redeemable for physical barrels without USD fiat intermediary; or governance approval of an alternative redemption model',
  },
  {
    commodity: 'Natural gas',
    reason: 'Same as oil, compounded by storage and transport infrastructure requirements',
    conditions: 'Same as oil',
  },
  {
    commodity: 'Agricultural commodities',
    reason: 'No production oracle; perishability risk; seasonal liquidity; no warehouse-receipt ERC-20 standard established',
    conditions: 'Production Chainlink feed on Arbitrum One; non-perishable or durability-certified custody model; demonstrated non-fiat redemption path',
  },
];

const PROHIBITED_TYPES = [
  {
    type: 'Algorithmic reserves',
    reason: 'Cannot meet the coverage ratio standard or reserve asset eligibility standard. Algorithmic stability mechanisms have demonstrated systemic failure modes incompatible with disclosure-grade transparency.',
  },
  {
    type: 'Uncollateralized instruments',
    reason: 'A future claim on a commodity (e.g., a promise to deliver without current custody) is a futures contract, not a reserve instrument. This framework governs only fully-reserved, spot-backed instruments.',
  },
  {
    type: 'Privacy coin backing',
    reason: 'A reserve asset whose on-chain balance cannot be independently verified by any party with a standard RPC connection cannot meet the independently auditable standard. Privacy coins by design obscure balances.',
  },
  {
    type: 'Unregistered securities as backing',
    reason: 'Exposes the protocol and participants to regulatory enforcement risk that cannot be mitigated by disclosure alone. Must obtain no-action letter, registered exemption, or equivalent legal clearance first.',
  },
  {
    type: 'Synthetic derivatives without physical backing',
    reason: 'Leveraged derivative positions, perpetual futures, or options contracts introduce mark-to-market volatility, funding rate risk, and liquidation risk incompatible with a reserve instrument\'s stability requirements.',
  },
];

const AXAU_COMPONENTS = [
  { name: 'AXAUTokenLite3643', description: 'ERC-3643 compliant reserve instrument token', ref: '0xbcCA4D937d427829914498423aE6E04C846dB0Bb' },
  { name: 'AXGoldVault', description: 'Holds PAXG reserve, exposes goldSnapshot()', ref: '0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8' },
  { name: 'NAVEngine', description: 'Computes coverage ratio, backing NAV, mint NAV', ref: '0x80F8634a43B26a2bd403396A42465F138aeCC519' },
  { name: 'MintRedeemController', description: 'Enforces oracle freshness, mint/redeem pausing, fee schedule', ref: '0x682Ed413767b6275e29fc706391474F2C5Cc1A2A' },
  { name: 'Chainlink XAU/USD', description: 'Primary oracle on Arbitrum One', ref: '0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c' },
  { name: 'Phase 2A stabilization report', description: '72-hour aggregate health report', ref: 'lib/axau/stabilizationReport.ts' },
  { name: 'Phase 2B liquidity engine', description: 'Price deviation, arbitrage classification, route simulation', ref: 'lib/axau/liquidityEngine.ts' },
  { name: 'Phase 2C commodity disclosure', description: 'Public aggregated status console', ref: 'lib/axau/commodityDisclosure.ts' },
];

// ─── Badge components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusLabel }) {
  const styles: Record<StatusLabel, string> = {
    'NOT LAUNCHED': 'text-dl-gray border-dl-gray',
    'DEFERRED':     'text-dl-gold border-dl-gold',
    'PROHIBITED':   'text-red-700 border-red-400',
    'LIVE':         'text-dl-forest border-dl-forest',
  };
  return (
    <span className={`font-dl-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${styles[status]}`}>
      {status}
    </span>
  );
}

function BandBadge({ band }: { band: ApprovalBand }) {
  const styles: Record<ApprovalBand, string> = {
    APPROVED:    'text-dl-forest border-dl-forest',
    CONDITIONAL: 'text-dl-gold border-dl-gold',
    DEFERRED:    'text-dl-gold border-dl-gold',
    REJECTED:    'text-red-700 border-red-400',
  };
  return (
    <span className={`font-dl-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${styles[band]}`}>
      {band}
    </span>
  );
}

function ScoreDot({ score }: { score: number }) {
  const color =
    score === 1 ? 'bg-green-500' :
    score === 2 ? 'bg-green-400' :
    score === 3 ? 'bg-yellow-400' :
    score === 4 ? 'bg-orange-500' : 'bg-red-600';
  return (
    <span className="inline-flex items-center gap-1 font-dl-mono text-sm text-dl-navy">
      <span className={`inline-block w-2.5 h-2.5 ${color}`} />
      {score}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function FrameworkSection({
  id,
  label,
  title,
  children,
}: {
  id: string;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border border-dl-border scroll-mt-20">
      <div className="border-b border-dl-border bg-dl-bg px-5 py-3 flex items-baseline gap-3">
        <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">{label}</span>
        <h2 className="font-dl-serif text-xl text-dl-navy">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  return {
    props: { effectiveDate: '2026-05-01' },
    revalidate: 86400,
  };
};

export default function CommodityFrameworkPage({ effectiveDate }: PageProps) {
  const TOC = [
    { id: 'purpose',          label: '1. Purpose' },
    { id: 'categories',       label: '2. Candidate Categories' },
    { id: 'workflow',         label: '3. Approval Workflow' },
    { id: 'reserve',          label: '4. Reserve Standards' },
    { id: 'oracle',           label: '5. Oracle Standards' },
    { id: 'custody',          label: '6. Custody Standards' },
    { id: 'redemption',       label: '7. Redemption Model' },
    { id: 'liquidity',        label: '8. Liquidity Model' },
    { id: 'compliance',       label: '9. Compliance & Disclosure' },
    { id: 'risk-rubric',      label: '10. Risk Scoring Rubric' },
    { id: 'launch-gate',      label: '11. Launch Readiness Gate' },
    { id: 'deferred',         label: '12. Deferred & Prohibited' },
    { id: 'axau-reference',   label: '13. AXAU Reference' },
  ];

  return (
    <>
      <Head>
        <title>Commodity Expansion Framework — Axiom Protocol</title>
        <meta
          name="description"
          content="Governance-grade, repeatable framework for evaluating future commodity-backed reserve instruments on the Axiom Protocol after AXAU. Version 1.0.0."
        />
      </Head>

      <DesignLawLayout>

        {/* ── Breadcrumb & title ──────────────────────────────────────────── */}
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Disclosure / Governance Framework
          </p>
          <SectionHeading>Commodity Expansion Framework</SectionHeading>
          <div className="flex flex-wrap gap-4 mt-3">
            <span className="font-dl-mono text-xs text-dl-gray">Document class: Governance Framework</span>
            <span className="font-dl-mono text-xs text-dl-gray">Version: 1.0.0</span>
            <span className="font-dl-mono text-xs text-dl-gray">Effective: {effectiveDate}</span>
            <span className="font-dl-mono text-xs text-dl-forest uppercase tracking-wider border border-dl-forest px-1.5 py-0.5">Active</span>
          </div>
        </div>

        {/* ── Status alert ────────────────────────────────────────────────── */}
        <div className="border border-dl-gold bg-yellow-50 px-5 py-4 mb-8">
          <p className="font-dl-mono text-xs text-yellow-800 uppercase tracking-wider mb-1">Governance Notice</p>
          <p className="text-sm text-dl-ink leading-relaxed">
            This document governs the evaluation and approval process only — not the launch, deployment,
            or approval of any specific commodity. No commodity described or named in this framework is
            live, approved, or committed to a delivery timeline unless separately confirmed by a completed
            governance vote, a passing launch gate, and a live public commodity disclosure endpoint.
          </p>
        </div>

        {/* ── Executive summary ───────────────────────────────────────────── */}
        <div className="border border-dl-border px-5 py-5 mb-8">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">Executive Summary</h2>
          <p className="text-base text-dl-ink leading-relaxed mb-3">
            AXAU (the Axiom Gold Reserve Instrument) is the first commodity-backed reserve instrument
            on the Axiom Protocol. This framework establishes the governance-grade, repeatable evaluation
            process for every future commodity instrument — starting from AXAU as the reference
            implementation and requiring that each new instrument meet or exceed its standards across
            oracle quality, custody model, liquidity engine, redemption architecture, compliance
            disclosure, and risk classification.
          </p>
          <p className="text-base text-dl-ink leading-relaxed mb-3">
            Commodities are evaluated through a four-stage pipeline: Candidate Submission, Technical
            Diligence, Governance Vote, and Launch Gate. Each stage requires a signed artifact before
            the next stage opens. The risk scoring rubric scores five dimensions (oracle, custody,
            liquidity, reserve, regulatory) on a 1–5 scale with equal weight, producing a composite
            score that maps to one of four approval bands.
          </p>
          <p className="text-base text-dl-ink leading-relaxed">
            Redemption under all instruments governed by this framework returns the underlying reserve
            asset — not USD, not a bank transfer. ACH transfers, wire transfers, and all fiat-denominated
            redemption pathways are explicitly deferred unless separately authorized by governance with
            a specific legal and compliance review.
          </p>
        </div>

        {/* ── Table of contents ───────────────────────────────────────────── */}
        <div className="border border-dl-border px-5 py-5 mb-8">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">Table of Contents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6">
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="font-dl-mono text-sm text-dl-navy hover:underline py-0.5"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* ── Sections ────────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* 1. Purpose */}
          <FrameworkSection id="purpose" label="Section 1" title="Purpose">
            <p className="text-base text-dl-ink leading-relaxed mb-4">
              This framework governs the evaluation and approval process — not the launch of any
              commodity. AXAU is the proof of concept and the floor. Every future instrument must
              meet or exceed AXAU's standards across every dimension.
            </p>
            <h3 className="font-dl-serif text-base text-dl-navy mb-2">What this framework does not do</h3>
            <ul className="space-y-1 text-sm text-dl-ink">
              {[
                'Does not authorize any new token issuance',
                'Does not approve any automated control layer deployment',
                'Does not create any legal obligation to pursue any specific commodity',
                'Does not constitute investment advice or a solicitation of any kind',
                'Does not supersede applicable law, regulation, or legal counsel',
              ].map((item, i) => (
                <li key={i} className="font-dl-mono text-dl-gray">— {item}</li>
              ))}
            </ul>
          </FrameworkSection>

          {/* 2. Candidate Categories */}
          <FrameworkSection id="categories" label="Section 2" title="Commodity Candidate Categories">
            <p className="text-sm text-dl-gray font-dl-mono mb-5">
              Five candidate categories. All are candidates only — none is launched, approved, or committed to any timeline.
            </p>
            <div className="space-y-4">
              {CANDIDATE_CATEGORIES.map((cat) => (
                <div key={cat.id} className="border border-dl-border p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="font-dl-mono text-xs text-dl-gray mr-2">Category {cat.id}</span>
                      <span className="font-dl-serif text-base text-dl-navy">{cat.title}</span>
                      <p className="font-dl-mono text-xs text-dl-gray mt-0.5">{cat.subtitle}</p>
                    </div>
                    <StatusBadge status={cat.status} />
                  </div>
                  <p className="text-sm text-dl-ink leading-relaxed mb-2">{cat.summary}</p>
                  <ul className="space-y-0.5">
                    {cat.notes.map((note, i) => (
                      <li key={i} className="font-dl-mono text-xs text-dl-gray">— {note}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </FrameworkSection>

          {/* 3. Approval Workflow */}
          <FrameworkSection id="workflow" label="Section 3" title="Approval Workflow">
            <p className="text-sm text-dl-gray font-dl-mono mb-5">
              Four-stage pipeline. No stage may be skipped. Each stage produces a required artifact before the next opens.
            </p>
            <div className="space-y-4">
              {APPROVAL_STAGES.map((s) => (
                <div key={s.stage} className="border border-dl-border p-4">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">Stage {s.stage}</span>
                    <span className="font-dl-serif text-base text-dl-navy">{s.name}</span>
                  </div>
                  <p className="text-sm text-dl-ink leading-relaxed mb-2">{s.description}</p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 text-xs">
                    <span className="font-dl-mono text-dl-gray uppercase tracking-wider">Artifact</span>
                    <span className="font-dl-mono text-dl-navy">{s.artifact}</span>
                  </div>
                </div>
              ))}
            </div>
          </FrameworkSection>

          {/* 4. Reserve Standards */}
          <FrameworkSection id="reserve" label="Section 4" title="Minimum Reserve Standards">
            <p className="text-base text-dl-ink leading-relaxed mb-4">
              The reserve asset must be on-chain representable, price-oracle addressable, non-rehypothecable
              by default, independently auditable, and transfer-capable without a fiat intermediary.
            </p>
            <h3 className="font-dl-serif text-base text-dl-navy mb-3">Coverage ratio requirements</h3>
            <div className="border border-dl-border overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="border-b border-dl-border bg-dl-bg">
                  <tr>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Coverage band</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Classification</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Required action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { band: '110% +', cls: 'HEALTHY', action: 'None' },
                    { band: '105% – 109.99%', cls: 'WATCH', action: 'Monitor; no action required' },
                    { band: '100% – 104.99%', cls: 'DEGRADED', action: 'Governance notification within 24 hours' },
                    { band: 'Below 100%', cls: 'CRITICAL', action: 'Mint pause mandatory; remediation plan within 6 hours' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-dl-border last:border-b-0">
                      <td className="p-3 font-dl-mono text-dl-navy">{row.band}</td>
                      <td className="p-3 font-dl-mono text-xs text-dl-navy">{row.cls}</td>
                      <td className="p-3 text-dl-ink">{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="font-dl-mono text-xs text-dl-gray">
              AXAU reference: PAXG (Paxos Gold) on Arbitrum One. AXGoldVault holds the reserve.
              NAVEngine computes coverage in real time from the Chainlink XAU/USD feed.
            </p>
          </FrameworkSection>

          {/* 5. Oracle Standards */}
          <FrameworkSection id="oracle" label="Section 5" title="Oracle Standards">
            <p className="text-base text-dl-ink leading-relaxed mb-4">
              The oracle is the single most critical technical dependency for a commodity reserve
              instrument. A missing or absent oracle is an unconditional hard blocker for launch.
              No instrument may proceed to Stage 3 if a production-grade oracle does not exist on
              the target network.
            </p>
            <div className="border border-dl-border overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="border-b border-dl-border bg-dl-bg">
                  <tr>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Requirement</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Minimum standard</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">AXAU reference</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { req: 'Provider', min: 'Chainlink Data Feed (preferred) or documented Tier 1 equivalent', axau: 'Chainlink XAU/USD on Arbitrum One' },
                    { req: 'Heartbeat', min: '24 hours or faster', axau: '24 hours' },
                    { req: 'Deviation threshold', min: '0.5% or tighter', axau: '0.5%' },
                    { req: 'Staleness ceiling', min: 'Configurable; default 27 hours', axau: '97,200 seconds' },
                    { req: 'Production history', min: 'Minimum 12 months on target network', axau: 'Multi-year history' },
                    { req: 'Answer decimals', min: '8 decimals (Chainlink standard)', axau: '8' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-dl-border last:border-b-0">
                      <td className="p-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">{row.req}</td>
                      <td className="p-3 text-sm text-dl-ink">{row.min}</td>
                      <td className="p-3 font-dl-mono text-xs text-dl-navy">{row.axau}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-dl-ink">
              Staleness is enforced at two levels: the service-level
              {' '}<span className="font-dl-mono">ORACLE_STALE_THRESHOLD_SECONDS</span> (default 97,200 s) and
              the on-chain MintRedeemController threshold. Both must agree — if they differ, the
              more conservative (shorter) value governs.
            </p>
          </FrameworkSection>

          {/* 6. Custody Standards */}
          <FrameworkSection id="custody" label="Section 6" title="Custody Standards">
            <p className="text-base text-dl-ink leading-relaxed mb-4">
              Three acceptable custodian models, in descending order of preference:
            </p>
            <div className="space-y-3 mb-4">
              {[
                {
                  rank: 1,
                  model: 'Qualified custodian with on-chain representation',
                  detail: 'Regulated trust company issuing an ERC-20 receipt token directly redeemable for the physical asset. AXAU pattern: Paxos Trust Company / PAXG.',
                },
                {
                  rank: 2,
                  model: 'Exchange-grade multi-party authorization',
                  detail: 'Institutional-grade multi-party authorization (minimum 3-of-5 keyholders, geographically distributed) with segregated account and independent proof-of-reserve.',
                },
                {
                  rank: 3,
                  model: 'Deployer-controlled operational buffer',
                  detail: 'Acceptable as supplemental operational buffer only — not as the primary reserve custody model.',
                },
              ].map((m) => (
                <div key={m.rank} className="border border-dl-border p-4">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="font-dl-mono text-xs text-dl-gray">Model {m.rank}</span>
                    <span className="font-dl-serif text-sm text-dl-navy">{m.model}</span>
                  </div>
                  <p className="text-sm text-dl-ink">{m.detail}</p>
                </div>
              ))}
            </div>
            <h3 className="font-dl-serif text-base text-dl-navy mb-2">Prohibited arrangements</h3>
            <ul className="space-y-1">
              {[
                'Single private key with no multi-party authorization recovery path',
                'Exchange hot wallet without account segregation',
                'Custodians under active regulatory enforcement or with lapsed operating license',
              ].map((item, i) => (
                <li key={i} className="font-dl-mono text-xs text-dl-gray">— {item}</li>
              ))}
            </ul>
          </FrameworkSection>

          {/* 7. Redemption Model */}
          <FrameworkSection id="redemption" label="Section 7" title="Redemption Model Standards">
            <div className="border border-dl-gold bg-yellow-50 px-4 py-3 mb-5">
              <p className="font-dl-mono text-xs text-yellow-800 uppercase tracking-wider mb-1">Core Principle</p>
              <p className="text-sm text-dl-ink">
                Redemption must return the underlying reserve asset — not USD, not a stablecoin,
                not a bank wire. A commodity reserve instrument that promises USD on redemption
                is a stablecoin with extra steps. ACH transfers, wire transfers, and all
                fiat-denominated redemption pathways are explicitly deferred for all instruments
                governed by this framework.
              </p>
            </div>
            <div className="border border-dl-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-dl-border bg-dl-bg">
                  <tr>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Property</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Requirement</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">AXAU reference</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { prop: 'Redemption asset', req: 'Underlying reserve token — not USD, not a bank transfer', axau: 'PAXG' },
                    { prop: 'Mechanism', req: 'On-chain transaction; no operator approval required for standard redemption', axau: 'MintRedeemController.redeem()' },
                    { prop: 'Pricing', req: 'Backing NAV per token at time of redemption, computed by on-chain NAVEngine', axau: 'backingNavPerAXAUWad()' },
                    { prop: 'Latency', req: 'Immediate settlement (same block or next block) for standard redemptions', axau: 'Same block' },
                    { prop: 'Fiat path', req: 'NOT provided by the protocol; user\'s responsibility through third-party venue', axau: 'Not applicable' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-dl-border last:border-b-0">
                      <td className="p-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">{row.prop}</td>
                      <td className="p-3 text-sm text-dl-ink">{row.req}</td>
                      <td className="p-3 font-dl-mono text-xs text-dl-navy">{row.axau}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FrameworkSection>

          {/* 8. Liquidity Model */}
          <FrameworkSection id="liquidity" label="Section 8" title="Liquidity Model Standards">
            <p className="text-base text-dl-ink leading-relaxed mb-4">
              Every commodity reserve instrument must have a deployed and validated read-only
              liquidity engine (Phase 2B-equivalent) before launch. All liquidity outputs are
              simulation-only — slippage and pool depth are not modeled at Phase 2.
            </p>
            <h3 className="font-dl-serif text-base text-dl-navy mb-3">Simulation baseline thresholds</h3>
            <div className="border border-dl-border overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="border-b border-dl-border bg-dl-bg">
                  <tr>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Threshold</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Default</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { t: 'Arbitrage trigger', v: '50 bps', n: 'Below this, deviation is within normal spread; no arbitrage flag' },
                    { t: 'HEALTHY band ceiling', v: '100 bps', n: 'Deviation within 100 bps of NAV is considered normal' },
                    { t: 'WATCH band ceiling', v: '200 bps', n: 'Deviation between 100 and 200 bps — arbitrage opportunity may exist' },
                    { t: 'CRITICAL threshold', v: '200 bps+', n: 'Systemic dislocation requiring operator review' },
                    { t: 'Route notional', v: '1,000 AXUSD equivalent', n: 'Actual execution size may differ' },
                    { t: 'Depth floor (simulation)', v: '10,000 AXUSD equivalent', n: 'Notional floor for feasibility classification; actual depth not measured' },
                    { t: 'Modeled slippage', v: '0 bps', n: 'All outputs must carry simulationOnly: true' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-dl-border last:border-b-0">
                      <td className="p-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">{row.t}</td>
                      <td className="p-3 font-dl-mono text-sm text-dl-navy">{row.v}</td>
                      <td className="p-3 text-sm text-dl-ink">{row.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="font-dl-mono text-xs text-dl-gray">
              On-chain pool depth modeling (AMM integration, real slippage) is a Phase 3 requirement — not in scope for the foundation liquidity layer.
            </p>
          </FrameworkSection>

          {/* 9. Compliance & Disclosure */}
          <FrameworkSection id="compliance" label="Section 9" title="Compliance and Disclosure Standards">
            <div className="space-y-4">
              <div className="border border-dl-border p-4">
                <h3 className="font-dl-serif text-base text-dl-navy mb-2">Regulatory framework positioning</h3>
                <p className="text-sm text-dl-ink leading-relaxed mb-3">
                  All commodity reserve instruments are structured with reference to payment stablecoin
                  regulatory frameworks under active consideration. No instrument may represent itself
                  as compliant with any specific regulatory framework without completed external legal
                  attestation. Approved language:
                </p>
                <div className="border-l-2 border-dl-gold pl-4 font-dl-mono text-xs text-dl-gray italic">
                  "Structured with reference to applicable stablecoin and digital asset regulatory
                  frameworks. Compliance posture remains subject to legal and operational review.
                  External attestation has not been completed."
                </div>
              </div>

              <div className="border border-dl-border p-4">
                <h3 className="font-dl-serif text-base text-dl-navy mb-3">Institutional vocabulary</h3>
                <div className="border border-dl-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-dl-border bg-dl-bg">
                      <tr>
                        <th className="text-left font-dl-serif text-dl-navy p-3">Avoid</th>
                        <th className="text-left font-dl-serif text-dl-navy p-3">Use instead</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Smart contracts', 'Automated control layers'],
                        ['Multi-sig', 'Multi-party authorization'],
                        ['DeFi / decentralized finance', 'On-chain financial rails'],
                        ['Tokenization', 'Asset onboarding and issuance'],
                        ['Staking', 'Participation lockup'],
                      ].map(([avoid, use], i) => (
                        <tr key={i} className="border-b border-dl-border last:border-b-0">
                          <td className="p-3 font-dl-mono text-xs text-red-700 line-through">{avoid}</td>
                          <td className="p-3 font-dl-mono text-xs text-dl-forest">{use}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border border-dl-border p-4">
                <h3 className="font-dl-serif text-base text-dl-navy mb-2">Language prohibitions</h3>
                <ul className="space-y-1">
                  {[
                    'Promises of fixed yield or guaranteed returns',
                    'APY claims presented as certain outcomes (use "Variable" or omit)',
                    'Absolutist positioning ("the only platform", "the sole solution")',
                    'The word "bankless" as a product descriptor',
                    'Any statement that USD fiat redemption is available unless separately authorized',
                    'Asterisks or hashtags in body text',
                  ].map((item, i) => (
                    <li key={i} className="font-dl-mono text-xs text-dl-gray">— {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </FrameworkSection>

          {/* 10. Risk Scoring Rubric */}
          <FrameworkSection id="risk-rubric" label="Section 10" title="Risk Scoring Rubric">
            <div className="space-y-4">
              <div className="border border-dl-border p-4">
                <p className="text-sm text-dl-ink leading-relaxed mb-3">
                  Each commodity candidate is scored across five dimensions, each scored 1 (lowest risk)
                  to 5 (highest risk). All five dimensions carry equal weight (20% each). The composite
                  score is the unweighted sum of all five scores. No dimension may be omitted — a
                  missing dimension is treated as a score of 5.
                </p>
                <div className="grid grid-cols-5 gap-1 mb-3">
                  {[1,2,3,4,5].map((s) => (
                    <div key={s} className="border border-dl-border px-2 py-1 text-center">
                      <ScoreDot score={s} />
                    </div>
                  ))}
                </div>
                <p className="font-dl-mono text-xs text-dl-gray">
                  Range: 5 (all green) to 25 (all critical). Governance may apply dimension-specific
                  multipliers for unusual risk profiles — documented in the TDR and confirmed by governance.
                </p>
              </div>

              <h3 className="font-dl-serif text-base text-dl-navy">Approval bands</h3>
              <div className="border border-dl-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-dl-border bg-dl-bg">
                    <tr>
                      <th className="text-left font-dl-serif text-dl-navy p-3">Score range</th>
                      <th className="text-left font-dl-serif text-dl-navy p-3">Band</th>
                      <th className="text-left font-dl-serif text-dl-navy p-3">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCORE_BANDS.map((b, i) => (
                      <tr key={i} className="border-b border-dl-border last:border-b-0">
                        <td className="p-3 font-dl-mono text-sm text-dl-navy">{b.range}</td>
                        <td className="p-3"><BandBadge band={b.band} /></td>
                        <td className="p-3 text-sm text-dl-ink">{b.outcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="font-dl-serif text-base text-dl-navy">Dimensions</h3>
              <div className="border border-dl-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-dl-border bg-dl-bg">
                    <tr>
                      <th className="text-left font-dl-serif text-dl-navy p-3">Dimension</th>
                      <th className="text-left font-dl-serif text-dl-navy p-3">Measures</th>
                      <th className="text-left font-dl-serif text-dl-navy p-3 w-24">AXAU score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RISK_DIMENSIONS.map((d) => (
                      <tr key={d.id} className="border-b border-dl-border last:border-b-0 align-top">
                        <td className="p-3 font-dl-mono text-xs text-dl-gray uppercase tracking-wider">
                          {d.id} — {d.name}
                        </td>
                        <td className="p-3 text-sm text-dl-ink">{d.description}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <ScoreDot score={d.axauScore} />
                            <span className="font-dl-mono text-[10px] text-dl-gray">{d.axauNote}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border border-dl-forest bg-green-50 px-4 py-3">
                <p className="font-dl-mono text-xs text-green-800 uppercase tracking-wider mb-1">
                  AXAU Reference Score
                </p>
                <p className="text-sm text-dl-ink">
                  Composite score: 7 out of 25 — APPROVED band (5–10). Dimensions:
                  Oracle 1 + Custody 1 + Liquidity 2 + Reserve 1 + Regulatory 2 = 7.
                </p>
              </div>
            </div>
          </FrameworkSection>

          {/* 11. Launch Readiness Gate */}
          <FrameworkSection id="launch-gate" label="Section 11" title="Launch Readiness Gate">
            <p className="text-base text-dl-ink leading-relaxed mb-5">
              The launch gate is a structured pre-flight checklist that must pass in full immediately
              before any instrument goes live. It must be re-run after any material change to oracle,
              custody, reserve asset, or automated control layers.
            </p>
            <h3 className="font-dl-serif text-base text-dl-navy mb-3">
              Hard blockers — unconditional no-go conditions
            </h3>
            <p className="font-dl-mono text-xs text-dl-gray mb-3">
              Any single failure terminates the launch. No waiver is possible.
            </p>
            <div className="border border-dl-border overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead className="border-b border-dl-border bg-dl-bg">
                  <tr>
                    <th className="text-left font-dl-serif text-dl-navy p-3 w-20">ID</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Gate</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {HARD_BLOCKERS.map((hb) => (
                    <tr key={hb.id} className="border-b border-dl-border last:border-b-0 align-top">
                      <td className="p-3 font-dl-mono text-xs text-red-700">{hb.id}</td>
                      <td className="p-3 font-dl-serif text-sm text-dl-navy">{hb.gate}</td>
                      <td className="p-3 text-sm text-dl-ink">{hb.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="font-dl-serif text-base text-dl-navy mb-3">
              Soft gates — governance waiver required if failing
            </h3>
            <div className="border border-dl-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-dl-border bg-dl-bg">
                  <tr>
                    <th className="text-left font-dl-serif text-dl-navy p-3 w-20">ID</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Gate</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Waiver notes</th>
                  </tr>
                </thead>
                <tbody>
                  {SOFT_GATES.map((sg) => (
                    <tr key={sg.id} className="border-b border-dl-border last:border-b-0 align-top">
                      <td className="p-3 font-dl-mono text-xs text-dl-gold">{sg.id}</td>
                      <td className="p-3 font-dl-serif text-sm text-dl-navy">{sg.gate}</td>
                      <td className="p-3 text-sm text-dl-ink">{sg.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FrameworkSection>

          {/* 12. Deferred & Prohibited */}
          <FrameworkSection id="deferred" label="Section 12" title="Deferred and Prohibited Commodity Types">
            <div className="space-y-6">
              <div>
                <h3 className="font-dl-serif text-base text-dl-navy mb-3">Deferred commodities</h3>
                <p className="text-sm text-dl-ink mb-3">
                  Deferred commodities are technically viable in principle but out of scope for the
                  current roadmap. No deferred commodity is approved, funded, or committed to any timeline.
                </p>
                <div className="border border-dl-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-dl-border bg-dl-bg">
                      <tr>
                        <th className="text-left font-dl-serif text-dl-navy p-3">Commodity</th>
                        <th className="text-left font-dl-serif text-dl-navy p-3">Reason for deferral</th>
                        <th className="text-left font-dl-serif text-dl-navy p-3">Minimum conditions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEFERRED_COMMODITIES.map((d, i) => (
                        <tr key={i} className="border-b border-dl-border last:border-b-0 align-top">
                          <td className="p-3 font-dl-serif text-sm text-dl-navy whitespace-nowrap">{d.commodity}</td>
                          <td className="p-3 text-sm text-dl-ink">{d.reason}</td>
                          <td className="p-3 font-dl-mono text-xs text-dl-gray">{d.conditions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-dl-serif text-base text-dl-navy mb-3">Prohibited commodity types</h3>
                <p className="text-sm text-dl-ink mb-3">
                  Prohibited types are structurally incompatible with this framework. A governance vote
                  amending the framework with a documented constitutional majority is required before
                  any prohibited type may be reconsidered.
                </p>
                <div className="space-y-3">
                  {PROHIBITED_TYPES.map((p, i) => (
                    <div key={i} className="border border-dl-border p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-dl-serif text-sm text-dl-navy">{p.type}</span>
                        <StatusBadge status="PROHIBITED" />
                      </div>
                      <p className="text-sm text-dl-ink">{p.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FrameworkSection>

          {/* 13. AXAU Reference */}
          <FrameworkSection id="axau-reference" label="Section 13" title="Relationship to AXAU as the Reference Implementation">
            <p className="text-base text-dl-ink leading-relaxed mb-4">
              AXAU is not a prototype — it is a live, production instrument operating on Arbitrum One.
              Every standard in this framework is expressed in terms that AXAU currently meets or
              exceeds. Any future commodity instrument must meet all the same standards. AXAU is the
              floor, not the ceiling.
            </p>
            <div className="border border-dl-gold bg-yellow-50 px-4 py-3 mb-5">
              <p className="font-dl-mono text-xs text-yellow-800 uppercase tracking-wider mb-1">As-of-date notice</p>
              <p className="text-sm text-dl-ink">
                All contract addresses, threshold values, and operational constants below reflect the
                Axiom Protocol system state as of {effectiveDate}. When evaluating a future commodity
                candidate, always verify current deployed addresses against the live on-chain system.
              </p>
            </div>
            <div className="border border-dl-border overflow-x-auto mb-5">
              <table className="w-full text-sm">
                <thead className="border-b border-dl-border bg-dl-bg">
                  <tr>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Component</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Description</th>
                    <th className="text-left font-dl-serif text-dl-navy p-3">Address / file</th>
                  </tr>
                </thead>
                <tbody>
                  {AXAU_COMPONENTS.map((c, i) => (
                    <tr key={i} className="border-b border-dl-border last:border-b-0 align-top">
                      <td className="p-3 font-dl-serif text-sm text-dl-navy whitespace-nowrap">{c.name}</td>
                      <td className="p-3 text-sm text-dl-ink">{c.description}</td>
                      <td className="p-3 font-dl-mono text-xs text-dl-gray break-all">{c.ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/axau"
                className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
              >
                AXAU Reserve →
              </Link>
              <Link
                href="/axau-disclosure"
                className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
              >
                AXAU Commodity Disclosure →
              </Link>
              <Link
                href="/disclosure"
                className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
              >
                Institutional Disclosure →
              </Link>
            </div>
          </FrameworkSection>

          {/* Revision log */}
          <div id="revision-log" className="border border-dl-border scroll-mt-20">
            <div className="border-b border-dl-border bg-dl-bg px-5 py-3">
              <h2 className="font-dl-serif text-xl text-dl-navy">Revision Log</h2>
            </div>
            <div className="px-5 py-5">
              <div className="border border-dl-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-dl-border bg-dl-bg">
                    <tr>
                      <th className="text-left font-dl-serif text-dl-navy p-3">Version</th>
                      <th className="text-left font-dl-serif text-dl-navy p-3">Date</th>
                      <th className="text-left font-dl-serif text-dl-navy p-3">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 font-dl-mono text-xs text-dl-navy">1.0.0</td>
                      <td className="p-3 font-dl-mono text-xs text-dl-navy">{effectiveDate}</td>
                      <td className="p-3 text-sm text-dl-ink">
                        Initial framework. Calibrated against AXAU Phase 2C as the reference
                        implementation. 13 sections, 5-dimension risk rubric, 10 hard blockers,
                        5 soft gates, 5 commodity categories (all NOT LAUNCHED), 8 deferred
                        commodities, 5 prohibited types.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>{/* end .space-y-6 */}

        {/* ── Legal disclaimer ────────────────────────────────────────────── */}
        <div className="mt-10 border-t border-dl-border pt-6">
          <p className="text-xs text-dl-gray leading-relaxed">
            This document is a governance framework. Nothing in this document constitutes investment
            advice, a solicitation to invest, a representation of current or future performance,
            a guarantee of any return, or a legal opinion. All commodity candidates listed herein
            are candidates only and are not launched, approved, or available for purchase unless
            separately confirmed by a completed governance vote, a passing launch gate, and a live
            commodity disclosure endpoint. Redemption under all instruments governed by this framework
            returns the underlying reserve asset — not USD. Fiat conversion is the user's responsibility
            through a third-party venue. Axiom Protocol operates on Arbitrum One (Chain ID: 42161).
          </p>
        </div>

      </DesignLawLayout>
    </>
  );
}
