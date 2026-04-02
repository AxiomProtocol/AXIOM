import Head from 'next/head';
import dynamic from 'next/dynamic';
import { DesignLawLayout, SectionHeading } from '../components/design-law';
import {
  Layers, Shield, BookOpen, FileText, AlertTriangle, Clock,
  ChevronRight, CheckCircle, Circle, AlertCircle, Lock,
  Coins, BarChart3, Scale, Eye, Landmark, Target,
} from 'lucide-react';

const LiveNavPanel    = dynamic(() => import('../components/axau/LiveNavPanel'),    { ssr: false });
const MintRedeemPanel = dynamic(() => import('../components/axau/MintRedeemPanel'), { ssr: false });
import {
  AXAU_SPEC_VERSION,
  AXAU_SPEC_EFFECTIVE_DATE,
  AXAU_SPEC_CLASSIFICATION,
  AXAU_TOKEN_METADATA,
  RESERVE_LAYERS,
  NAV_MECHANICS,
  GOVERNANCE_RULES,
  AUDIT_ROADMAP,
  DISCLOSURE_NOTICES,
  PROTOCOL_INTEGRATION,
  ROLLOUT_PHASES,
  type ReserveLayerStatus,
  type RiskTier,
  type AuditMilestone,
} from '../lib/axau/spec';

function StatusPill({ status }: { status: ReserveLayerStatus }) {
  const map: Record<ReserveLayerStatus, { label: string; cls: string }> = {
    ACTIVE: { label: 'Active', cls: 'bg-green-50 text-green-800 border-green-300' },
    PLANNED: { label: 'Planned', cls: 'bg-blue-50 text-blue-800 border-blue-300' },
    GOVERNANCE_VOTE_REQUIRED: { label: 'Governance Vote Required', cls: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
    SPECIFICATION_ONLY: { label: 'Specification Only', cls: 'bg-gray-50 text-gray-600 border-gray-300' },
  };
  const s = map[status];
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-dl-mono border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function RiskTierPill({ tier }: { tier: RiskTier }) {
  const map: Record<RiskTier, { label: string; cls: string }> = {
    TIER_1_LIQUID: { label: 'Tier 1 — Liquid', cls: 'text-dl-forest border-dl-forest' },
    TIER_2_SEMI_LIQUID: { label: 'Tier 2 — Semi-Liquid', cls: 'text-dl-gold border-dl-gold' },
    TIER_3_ILLIQUID: { label: 'Tier 3 — Illiquid', cls: 'text-dl-navy border-dl-navy' },
  };
  const s = map[tier];
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-dl-mono border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function AuditStatusPill({ status }: { status: AuditMilestone['status'] }) {
  const map: Record<AuditMilestone['status'], { label: string; cls: string; icon: React.ReactNode }> = {
    COMPLETE: { label: 'Complete', cls: 'text-green-800 border-green-300 bg-green-50', icon: <CheckCircle className="w-3 h-3" /> },
    ACTIVE: { label: 'Active', cls: 'text-blue-800 border-blue-300 bg-blue-50', icon: <Circle className="w-3 h-3" /> },
    DEFERRED: { label: 'Deferred', cls: 'text-yellow-800 border-yellow-300 bg-yellow-50', icon: <Clock className="w-3 h-3" /> },
    PLANNED: { label: 'Planned', cls: 'text-gray-600 border-gray-300 bg-gray-50', icon: <Circle className="w-3 h-3" /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-dl-mono border ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

function DataRow({ label, value, alt }: { label: string; value: React.ReactNode; alt?: boolean }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 px-4 py-3 border-b border-dl-border ${alt ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
      <div className="sm:w-48 flex-shrink-0">
        <span className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono">{label}</span>
      </div>
      <div className="flex-1 text-sm text-dl-navy">{value}</div>
    </div>
  );
}

export default function AxauPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>AXAU Reserve Layers — System Specification | Axiom Protocol</title>
        <meta name="description" content="AXAU institutional specification: monetary policy, reserve architecture, governance rules, and audit roadmap for the Axiom Gold Reserve Unit." />
      </Head>

      <div className="max-w-4xl mx-auto">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-start gap-3 mb-4">
            <Landmark className="w-8 h-8 text-dl-gold flex-shrink-0 mt-1" />
            <div>
              <h1 className="font-dl-serif text-3xl text-dl-navy">AXAU Reserve Layers</h1>
              <p className="text-dl-gray mt-1">Axiom Protocol — Store-of-Value and Wealth Preservation Instrument</p>
            </div>
          </div>

          <div className="border border-dl-border border-l-4 border-l-dl-gold px-6 py-3 bg-dl-bg-alt mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-dl-navy flex-shrink-0" />
                <span className="text-sm font-dl-mono text-dl-navy">{AXAU_SPEC_CLASSIFICATION}</span>
              </div>
              <div className="flex items-center gap-4 font-dl-mono text-xs text-dl-gray">
                <span>Spec v{AXAU_SPEC_VERSION}</span>
                <span>Effective {AXAU_SPEC_EFFECTIVE_DATE}</span>
              </div>
            </div>
          </div>

          <div className="border border-dl-border border-t-0 px-6 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-block px-2 py-0.5 text-xs font-dl-mono border border-dl-forest text-dl-forest">
                DEPLOYED — ARBITRUM ONE
              </span>
              <span className="inline-block px-2 py-0.5 text-xs font-dl-mono border border-dl-forest text-dl-forest bg-green-50">
                MINT ACTIVE
              </span>
              <span className="text-xs text-dl-gray font-dl-mono">7 contracts live · Mint &amp; redeem open · XAU/USD Chainlink oracle</span>
            </div>
          </div>
        </div>

        {/* ── Disclosure notices ────────────────────────────────────── */}
        <div className="mb-8 border border-dl-border border-l-4 border-l-dl-navy px-6 py-5 bg-dl-bg-alt">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-dl-navy flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-dl-navy uppercase tracking-wide font-dl-mono">Important Disclosures</p>
          </div>
          <ul className="space-y-2">
            {DISCLOSURE_NOTICES.map((notice, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-dl-gold mt-1 flex-shrink-0" />
                <p className="text-xs text-dl-navy leading-relaxed">{notice}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Live System Dashboard ─────────────────────────────────── */}
        <section className="mb-12">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-dl-navy" />
              Live System State
            </span>
          </SectionHeading>
          <LiveNavPanel />
        </section>

        {/* ── Mint / Redeem Terminal ────────────────────────────────── */}
        <section className="mb-12">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <Coins className="w-5 h-5 text-dl-navy" />
              Mint / Redeem Terminal
            </span>
          </SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MintRedeemPanel />
            <div className="border border-dl-border p-5 bg-dl-bg-alt">
              <p className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-navy/40 mb-3">Transaction Guide</p>
              <ul className="space-y-3">
                {[
                  { step: "1", label: "Connect Wallet", detail: "Use the Connect button in the nav bar. Requires Arbitrum One network." },
                  { step: "2", label: "Acquire PAXG", detail: "PAXG is tokenized gold (1 oz/token) bridged to Arbitrum. Available on Arbitrum DEXes or bridge from Ethereum." },
                  { step: "3", label: "Approve PAXG", detail: "One-time approval grants the controller permission to pull your PAXG into the Gold Vault." },
                  { step: "4", label: "Mint AXAU", detail: "Controller pulls PAXG, deposits to Gold Vault, mints AXAU to your wallet at Mint NAV." },
                  { step: "5", label: "Redeem AXAU", detail: "Burn AXAU, receive proportional PAXG back at Backing NAV. Subject to coverage ratio." },
                ].map(item => (
                  <li key={item.step} className="flex gap-3">
                    <span className="font-dl-mono text-xs text-dl-navy/30 w-4 flex-shrink-0 mt-0.5">{item.step}</span>
                    <div>
                      <p className="font-dl-mono text-xs text-dl-navy font-semibold">{item.label}</p>
                      <p className="font-dl-mono text-xs text-dl-navy/60 mt-0.5">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-dl-border">
                <p className="font-dl-mono text-[10px] text-dl-navy/40">
                  Reserve: PAXG (Paxos Gold, 18 dec) on Arbitrum One.
                  XAU vault: <a href="https://arbiscan.io/address/0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8" target="_blank" rel="noopener noreferrer" className="underline hover:text-dl-navy">0xaCc9…CF8</a>
                  · PAXG: <a href="https://arbiscan.io/address/0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429" target="_blank" rel="noopener noreferrer" className="underline hover:text-dl-navy">0xfEb4…429</a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 1: Token Overview ─────────────────────────────── */}
        <section className="mb-12">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <Coins className="w-5 h-5 text-dl-navy" />
              Section 1 — Token Overview
            </span>
          </SectionHeading>

          <p className="text-dl-navy text-sm leading-relaxed mb-6">
            {AXAU_TOKEN_METADATA.description}
          </p>

          <div className="border border-dl-border mb-6">
            <DataRow label="Token Name" value={AXAU_TOKEN_METADATA.name} />
            <DataRow label="Symbol" value={<span className="font-dl-mono font-semibold text-dl-gold">{AXAU_TOKEN_METADATA.symbol}</span>} alt />
            <DataRow label="Architecture Brand" value={<span className="font-semibold">{AXAU_TOKEN_METADATA.architectureBrand}</span>} />
            <DataRow label="Token Standard" value={AXAU_TOKEN_METADATA.standard} alt />
            <DataRow label="Network" value={`${AXAU_TOKEN_METADATA.network} (Chain ID ${AXAU_TOKEN_METADATA.chainId})`} />
            <DataRow label="Decimals" value={<span className="font-dl-mono">{AXAU_TOKEN_METADATA.decimals}</span>} alt />
            <DataRow label="Peg Mechanism" value={AXAU_TOKEN_METADATA.pegMechanism} />
            <DataRow label="Deployment Status" value={
              <span className="inline-block px-2 py-0.5 text-xs font-dl-mono border border-dl-gold text-dl-gold">
                {AXAU_TOKEN_METADATA.deploymentStatus.replace('_', ' ')}
              </span>
            } alt />
            <DataRow label="Contract Address" value={<span className="font-dl-mono text-dl-gray">Pending deployment</span>} />
          </div>

          <div className="border border-dl-border px-6 py-4 bg-dl-bg-alt">
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Identity and Compliance (ERC-3643)</p>
            <p className="text-sm text-dl-navy leading-relaxed">
              AXAU will be issued under the ERC-3643 (T-REX) standard — the same identity-gated compliance framework used for Unified AXUSD. All AXAU holders must complete on-chain identity verification through Axiom's Identity Registry. This enforces compliance controls at the transfer level through modular automated control layers, and restricts participation to verified wallets.
            </p>
          </div>
        </section>

        {/* ── Section 2: Reserve Architecture ──────────────────────── */}
        <section className="mb-12">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <Layers className="w-5 h-5 text-dl-navy" />
              Section 2 — Reserve Architecture
            </span>
          </SectionHeading>

          <p className="text-dl-navy text-sm leading-relaxed mb-4">
            AXAU's reserve basket is designed for additive expansion. Gold (XAU) is the founding anchor commodity. Each subsequent reserve layer is added through AXM governance approval, a commodity admission review, and a verified reserve deposit. Every expansion event increases the Backing NAV per outstanding AXAU — holder-accretive by design.
          </p>

          <div className="border border-dl-border px-6 py-4 mb-6 bg-dl-bg-alt">
            <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">Automated Control Layer Architecture (Planned)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-dl-navy font-dl-mono">
              {[
                ['AXAUToken', 'ERC-3643 identity-gated transfer controls'],
                ['CommodityRegistry', 'Governance-managed component list, risk tiers, oracle configs'],
                ['ReserveVaultRouter', 'Per-commodity vault adapter routing layer'],
                ['NAVEngine', 'Multi-commodity Backing NAV calculation (oracle × quantity × haircut)'],
                ['MintRedeemController', 'Coverage enforcement, circuit breakers, redemption logic'],
                ['GovernanceTimelock', 'AXM voting + timelock delay on all parameter changes'],
              ].map(([name, desc]) => (
                <div key={name} className="flex items-start gap-2">
                  <ChevronRight className="w-3 h-3 text-dl-gold mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-xs">{name}</p>
                    <p className="text-xs text-dl-gray">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commodity Registry Table */}
          <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">Commodity Registry</p>
          <div className="border border-dl-border mb-8 overflow-x-auto">
            <table className="w-full min-w-[540px] text-xs">
              <thead>
                <tr className="border-b border-dl-border bg-dl-bg text-dl-gray font-dl-mono uppercase tracking-wider">
                  <th className="px-4 py-2 text-left font-normal w-8">Ph.</th>
                  <th className="px-4 py-2 text-left font-normal">Commodity</th>
                  <th className="px-4 py-2 text-left font-normal">Status</th>
                  <th className="px-4 py-2 text-left font-normal">Risk Tier</th>
                  <th className="px-4 py-2 text-right font-normal">Haircut</th>
                  <th className="px-4 py-2 text-right font-normal">Max Weight</th>
                </tr>
              </thead>
              <tbody>
                {RESERVE_LAYERS.map((layer, i) => (
                  <tr key={layer.id} className={`border-b border-dl-border ${i % 2 === 1 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                    <td className="px-4 py-3 font-dl-mono text-dl-gray">{layer.phase}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-dl-navy">{layer.commodity}</p>
                      <p className="text-dl-gray font-dl-mono">{layer.symbol}</p>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={layer.status} /></td>
                    <td className="px-4 py-3"><RiskTierPill tier={layer.riskTier} /></td>
                    <td className="px-4 py-3 text-right font-dl-mono text-dl-navy">{(layer.haircut * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right font-dl-mono text-dl-navy">
                      {layer.maxWeightPct !== null ? `${layer.maxWeightPct}%` : 'Uncapped'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reserve Layer Detail Cards */}
          <div className="space-y-6">
            {RESERVE_LAYERS.map((layer) => (
              <div key={layer.id} className="border border-dl-border">
                <div className="px-6 py-4 border-b border-dl-border bg-dl-bg-alt flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5">Phase {layer.phase}</span>
                    <h3 className="font-dl-serif text-base text-dl-navy font-semibold">{layer.commodity} ({layer.symbol})</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusPill status={layer.status} />
                    <RiskTierPill tier={layer.riskTier} />
                  </div>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm text-dl-navy leading-relaxed mb-4">{layer.description}</p>
                  <div className="border border-dl-border">
                    <DataRow label="Reserve Asset" value={<span className="text-xs">{layer.reserveAsset}</span>} />
                    <DataRow label="Custody Method" value={<span className="text-xs">{layer.custodyMethod}</span>} alt />
                    <DataRow label="Primary Oracle" value={<span className="text-xs font-dl-mono">{layer.oracleSource}</span>} />
                    <DataRow label="Oracle Fallback" value={<span className="text-xs">{layer.oracleFallback}</span>} alt />
                    <DataRow label="NAV Haircut" value={<span className="font-dl-mono text-xs font-semibold">{(layer.haircut * 100).toFixed(0)}%</span>} />
                    <DataRow label="Max Basket Weight" value={<span className="font-dl-mono text-xs">{layer.maxWeightPct !== null ? `${layer.maxWeightPct}%` : 'Uncapped (gold anchor)'}</span>} alt />
                    <DataRow label="NAV Update Cadence" value={<span className="text-xs">{layer.navUpdateCadence}</span>} />
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border border-dl-border px-4 py-3">
                      <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">Custody Notes</p>
                      <p className="text-xs text-dl-navy leading-relaxed">{layer.custodyNotes}</p>
                    </div>
                    <div className="border border-dl-border px-4 py-3">
                      <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">Regulatory Notes</p>
                      <p className="text-xs text-dl-navy leading-relaxed">{layer.regulatoryNotes}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3: NAV and Mint/Redeem Mechanics ─────────────── */}
        <section className="mb-12">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-dl-navy" />
              Section 3 — NAV and Mint/Redeem Mechanics
            </span>
          </SectionHeading>

          <p className="text-dl-navy text-sm leading-relaxed mb-6">
            AXAU uses a dual-NAV accounting model that separates the floor value backing each outstanding token (Backing NAV) from the minimum reserve required to issue new tokens (Mint NAV). This design ensures that expanding the commodity basket is holder-accretive — not dilutive.
          </p>

          <div className="space-y-4 mb-6">
            {[NAV_MECHANICS.backingNAV, NAV_MECHANICS.mintNAV].map((nav, i) => (
              <div key={nav.name} className="border border-dl-border">
                <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
                  <p className="text-sm font-semibold text-dl-navy">{nav.name}</p>
                </div>
                <div className="px-6 py-4">
                  <div className="bg-dl-bg border border-dl-border px-4 py-3 mb-3 font-dl-mono text-xs text-dl-navy overflow-x-auto">
                    {nav.formula}
                  </div>
                  <p className="text-sm text-dl-navy leading-relaxed">{nav.definition}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-dl-border mb-4">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
              <p className="text-sm font-semibold text-dl-navy">Coverage Ratio Floor</p>
              <span className="font-dl-mono text-lg font-bold text-dl-gold">{NAV_MECHANICS.coverageRatioFloor.label}</span>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-dl-navy leading-relaxed">{NAV_MECHANICS.coverageRatioFloor.definition}</p>
            </div>
          </div>

          <div className="border border-dl-border mb-4">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-sm font-semibold text-dl-navy">{NAV_MECHANICS.expansionEvent.name}</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-dl-navy leading-relaxed mb-3">{NAV_MECHANICS.expansionEvent.definition}</p>
              <div className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-dl-gold mt-1 flex-shrink-0" />
                <p className="text-xs text-dl-gray font-dl-mono">{NAV_MECHANICS.expansionEvent.trigger}</p>
              </div>
            </div>
          </div>

          <div className="border border-dl-border">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-sm font-semibold text-dl-navy">{NAV_MECHANICS.redemption.name}</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-dl-navy leading-relaxed">{NAV_MECHANICS.redemption.definition}</p>
            </div>
          </div>

          {/* AXUSD / AXM Integration */}
          <div className="mt-6 border border-dl-border">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-sm font-semibold text-dl-navy">Protocol Integration — AXUSD and AXM</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">AXAU and AXUSD</p>
                <p className="text-sm text-dl-navy leading-relaxed">{PROTOCOL_INTEGRATION.axusdRelationship}</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">AXAU and AXM Governance</p>
                <p className="text-sm text-dl-navy leading-relaxed">{PROTOCOL_INTEGRATION.axmRelationship}</p>
              </div>
              <div>
                <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">AXAU and Land Pipeline (Phase 3)</p>
                <p className="text-sm text-dl-navy leading-relaxed">{PROTOCOL_INTEGRATION.landPipelineRelationship}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Governance Rules ───────────────────────────── */}
        <section className="mb-12">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <Scale className="w-5 h-5 text-dl-navy" />
              Section 4 — Governance Rules
            </span>
          </SectionHeading>

          <p className="text-dl-navy text-sm leading-relaxed mb-6">
            AXAU governance operates through AXM token-weighted voting, timelock controls, and an Emergency Guardian (Governance Safe 3-of-5 multi-party authorization). During the Bootstrap Phase, Founder Ops retains operational authority pending the governance transition milestone.
          </p>

          {/* Core governance parameters */}
          <div className="border border-dl-border mb-6">
            <div className="px-4 py-2 border-b border-dl-border bg-dl-bg text-xs text-dl-gray font-dl-mono uppercase tracking-wider grid grid-cols-3">
              <div>Parameter</div>
              <div>Value</div>
              <div>Notes</div>
            </div>
            {GOVERNANCE_RULES.parameters.map((row, i) => (
              <div key={row.parameter} className={`grid grid-cols-3 border-b border-dl-border px-4 py-3 text-sm ${i % 2 === 1 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <p className="font-semibold text-dl-navy text-xs">{row.parameter}</p>
                <p className="font-dl-mono text-xs text-dl-forest">{row.value}</p>
                <p className="text-xs text-dl-gray">{row.notes}</p>
              </div>
            ))}
          </div>

          {/* Commodity admission criteria */}
          <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-3">Commodity Admission Criteria</p>
          <div className="border border-dl-border mb-6">
            {GOVERNANCE_RULES.commodityAdmissionCriteria.map((c, i) => (
              <div key={c.criterion} className={`px-6 py-4 border-b border-dl-border ${i % 2 === 1 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-dl-forest flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-dl-navy mb-1">{c.criterion}</p>
                    <p className="text-sm text-dl-navy leading-relaxed">{c.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Emergency removal */}
          <div className="border border-dl-border mb-6">
            <div className="px-6 py-3 border-b border-dl-border bg-dl-bg-alt">
              <p className="text-sm font-semibold text-dl-navy">Emergency Removal Procedure</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs text-dl-gray font-dl-mono mb-2 uppercase tracking-wider">Trigger Conditions</p>
              <p className="text-sm text-dl-navy mb-3">{GOVERNANCE_RULES.commodityRemoval.trigger}</p>
              <p className="text-xs text-dl-gray font-dl-mono mb-2 uppercase tracking-wider">Process</p>
              <ol className="space-y-2">
                {GOVERNANCE_RULES.commodityRemoval.process.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-dl-navy">
                    <span className="font-dl-mono text-xs text-dl-gold font-semibold w-4 flex-shrink-0 mt-0.5">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Governance summary */}
          <div className="border border-dl-border">
            <DataRow label="Governance Token" value={GOVERNANCE_RULES.governanceToken} />
            <DataRow label="Quorum Threshold" value={<span className="font-dl-mono">{GOVERNANCE_RULES.quorumThreshold}</span>} alt />
            <DataRow label="Pass Threshold" value={GOVERNANCE_RULES.passThreshold} />
            <DataRow label="Timelock Delay" value={<span className="font-dl-mono">{GOVERNANCE_RULES.timelockDelay}</span>} alt />
            <DataRow label="Emergency Guardian" value={GOVERNANCE_RULES.emergencyGuardian} />
            <DataRow label="Founding Period" value={GOVERNANCE_RULES.foundingPeriod} alt />
          </div>
        </section>

        {/* ── Section 5: Audit and Compliance Roadmap ───────────────── */}
        <section className="mb-12">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <Shield className="w-5 h-5 text-dl-navy" />
              Section 5 — Audit and Compliance Roadmap
            </span>
          </SectionHeading>

          <p className="text-dl-navy text-sm leading-relaxed mb-6">
            The AXAU audit roadmap is structured around the bootstrap-to-deployment lifecycle. External security audits are explicitly deferred pending treasury development. This is an acknowledged risk, documented transparently as a proof-of-execution artifact. No external capital is solicited or accepted without prior audit completion.
          </p>

          <div className="space-y-4">
            {AUDIT_ROADMAP.map((milestone) => (
              <div key={milestone.id} className="border border-dl-border">
                <div className="px-6 py-4 border-b border-dl-border bg-dl-bg-alt flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm font-semibold text-dl-navy">{milestone.title}</p>
                  <AuditStatusPill status={milestone.status} />
                </div>
                <div className="px-6 py-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Clock className="w-3 h-3 text-dl-gold flex-shrink-0 mt-1" />
                    <p className="text-xs text-dl-gray font-dl-mono">{milestone.triggerCondition}</p>
                  </div>
                  <p className="text-sm text-dl-navy leading-relaxed mb-3">{milestone.description}</p>
                  {milestone.scope && (
                    <div className="mb-3">
                      <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">Audit Scope</p>
                      <ul className="space-y-1">
                        {milestone.scope.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-dl-navy">
                            <ChevronRight className="w-3 h-3 text-dl-gold flex-shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {milestone.targetFirms && (
                    <div>
                      <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-2">Target Audit Firms</p>
                      <div className="flex flex-wrap gap-2">
                        {milestone.targetFirms.map((firm) => (
                          <span key={firm} className="text-xs font-dl-mono border border-dl-border px-2 py-0.5 text-dl-gray">
                            {firm}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Phased Rollout Summary ────────────────────────────────── */}
        <section className="mb-12">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <Target className="w-5 h-5 text-dl-navy" />
              Phased Rollout Summary
            </span>
          </SectionHeading>

          <div className="border border-dl-border">
            {ROLLOUT_PHASES.map((phase, i) => (
              <div key={phase.phase} className={`border-b border-dl-border ${i % 2 === 1 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
                <div className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-dl-mono text-xs font-semibold border border-dl-gold text-dl-gold px-2 py-0.5">{phase.phase}</span>
                      <p className="text-sm font-semibold text-dl-navy">{phase.label}</p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-xs font-dl-mono border ${
                      phase.isCurrentPhase
                        ? 'text-blue-800 border-blue-300 bg-blue-50'
                        : 'text-gray-600 border-gray-300 bg-gray-50'
                    }`}>
                      {phase.status.split('—')[0].trim()}
                    </span>
                  </div>
                  <p className="text-xs text-dl-gray font-dl-mono mb-2">{phase.status}</p>
                  <ul className="space-y-1">
                    {phase.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-dl-navy">
                        <ChevronRight className="w-3 h-3 text-dl-gold flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer notice ─────────────────────────────────────────── */}
        <div className="border border-dl-border border-l-4 border-l-dl-navy px-6 py-5 bg-dl-bg-alt mb-8">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-dl-navy flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-dl-navy mb-2">Specification Status and Limitations</p>
              <p className="text-sm text-dl-navy leading-relaxed">
                This document is the authoritative AXAU system specification as of version {AXAU_SPEC_VERSION} (effective {AXAU_SPEC_EFFECTIVE_DATE}). It constitutes a proof-of-execution record establishing the design, policy, and governance intent of the AXAU instrument prior to deployment. No contracts have been deployed. No tokens have been issued. Parameters and procedures are subject to change through the governance process prior to and after deployment.
              </p>
              <p className="text-xs text-dl-gray mt-3">
                Axiom Protocol · Arbitrum One (Chain ID 42161) · Spec v{AXAU_SPEC_VERSION} · {AXAU_SPEC_EFFECTIVE_DATE}
              </p>
            </div>
          </div>
        </div>

      </div>
    </DesignLawLayout>
  );
}
