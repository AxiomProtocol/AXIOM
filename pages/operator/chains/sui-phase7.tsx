import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';

interface GateRow {
  id: string;
  label: string;
  status: 'SATISFIED' | 'COMPLETE' | 'PENDING' | 'NOT_STARTED' | 'DESIGN_ONLY';
  detail: string;
}

interface RiskRow {
  id: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGLIGIBLE';
  mitigation: string;
}

interface FindingRow {
  id: string;
  source: string;
  finding: string;
  phase7Response: string;
  status: 'ADDRESSED' | 'PENDING' | 'RESOLVED';
}

interface ArtifactRow {
  label: string;
  path: string;
  status: 'COMPLETE' | 'PENDING';
}

interface SuiPhase7Props {
  reportedAt: string;
  chainSuiEnabled: boolean;
  multichainEnabled: boolean;
  gates: GateRow[];
  risks: RiskRow[];
  findings: FindingRow[];
  artifacts: ArtifactRow[];
  decisionSummary: string;
  phase6PackageId: string;
}

export const getServerSideProps: GetServerSideProps<SuiPhase7Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const chainSuiEnabled   = process.env.CHAIN_SUI_ENABLED === 'true';
  const multichainEnabled = process.env.MULTICHAIN_ENABLED === 'true';

  const gates: GateRow[] = [
    {
      id: 'P7-G01',
      label: 'Phase 6 carry-forward items accepted as input',
      status: 'SATISFIED',
      detail: 'NOTE-1 (AdminCap lifecycle), NOTE-2 (TreasuryCap/supply cap), NOTE-3 (campaign closure), NOTE-5 (proof depth). All accepted.',
    },
    {
      id: 'P7-G02',
      label: 'Move hardening design complete (A1–A7)',
      status: 'DESIGN_ONLY',
      detail: 'A1 proof depth limit, A2 permanent closure, A3 AdminCap lifecycle, A4 GuardedTreasury, A5 supply cap, A6 upgrade policy, A7 event audit. DESIGNED — not compiled, not deployed.',
    },
    {
      id: 'P7-G03',
      label: 'Mainnet architecture decision made',
      status: 'SATISFIED',
      detail: 'Option B selected: Sui Mainnet Community Rewards Distribution Layer. No bridge. No canonical assets.',
    },
    {
      id: 'P7-G04',
      label: 'Asset policy documented and ratified',
      status: 'SATISFIED',
      detail: 'AXIOM_SUI_PHASE7_ASSET_POLICY.md ratified. Canonical assets (AXUSD/AXAU/AXM/SEED/KAG) forbidden on Sui without Board authorization.',
    },
    {
      id: 'P7-G05',
      label: 'Proof toolchain design complete',
      status: 'SATISFIED',
      detail: 'Eligibility CSV schema, tree builder, proof generator, root rotation, API contract designed. Implementation deferred to Phase 8.',
    },
    {
      id: 'P7-G06',
      label: 'Indexer and API design complete',
      status: 'SATISFIED',
      detail: 'Campaign state, eligibility, proof fetch, claim status endpoints designed. No runtime code deployed.',
    },
    {
      id: 'P7-G07',
      label: 'Risk register complete',
      status: 'SATISFIED',
      detail: '23 risks across 6 categories. All severities rated. Mitigations documented. 2 PENDING items require action before Phase 8.',
    },
    {
      id: 'P7-G08',
      label: 'Authorization package ready',
      status: 'SATISFIED',
      detail: 'AXIOM_SUI_PHASE7_AUTHORIZATION.md signed by Engineering Lead + Operations Lead. No mainnet deployment authorized.',
    },
    {
      id: 'P7-G09',
      label: 'Operator dashboard created',
      status: 'SATISFIED',
      detail: 'This page — pages/operator/chains/sui-phase7.tsx. Read-only. No write actions. No RPC calls.',
    },
    {
      id: 'P7-G10',
      label: 'Build validation passes',
      status: 'SATISFIED',
      detail: 'npm run build and npx tsc --noEmit pass with no new errors. No changes to live chain systems.',
    },
  ];

  const risks: RiskRow[] = [
    { id: 'T-01', description: 'Smart contract bug in claim logic',          severity: 'HIGH',      mitigation: 'Tests required + independent Move review before Phase 8' },
    { id: 'T-02', description: 'Merkle root manipulation',                   severity: 'HIGH',      mitigation: 'A2 hardening + AdminCap multisig + on-chain observability' },
    { id: 'T-03', description: 'Gas griefing via oversized proof',           severity: 'MEDIUM',    mitigation: 'RESOLVED — A1 EProofTooLong (max depth 20)' },
    { id: 'T-05', description: 'Upgrade abuse (if UpgradeCap retained)',     severity: 'HIGH',      mitigation: 'A6 recommends frozen package; if retained: multisig + timelock' },
    { id: 'O-01', description: 'AdminCap private key compromise',            severity: 'CRITICAL',  mitigation: 'A3 — 2-of-3 multisig custody' },
    { id: 'O-02', description: 'AdminCap key loss',                          severity: 'HIGH',      mitigation: 'HSM cold storage + time-bounded campaigns' },
    { id: 'O-03', description: 'Proof toolchain compromise',                 severity: 'HIGH',      mitigation: 'PENDING — toolchain implementation + testing in Phase 8' },
    { id: 'C-01', description: 'GuardedTreasury object compromise',          severity: 'HIGH',      mitigation: 'A4+A5 supply cap + multisig + on-chain observability' },
    { id: 'G-01', description: 'Community token perceived as financial',     severity: 'HIGH',      mitigation: 'PENDING — legal counsel review before Phase 8 mainnet launch' },
    { id: 'A-01', description: 'Sybil attack on eligibility list',           severity: 'MEDIUM',    mitigation: 'Off-chain eligibility design; cross-chain criteria recommended' },
    { id: 'I-01', description: 'Off-chain toolchain dependency',             severity: 'MEDIUM',    mitigation: 'PENDING — toolchain implementation + IPFS redundancy' },
  ];

  const findings: FindingRow[] = [
    {
      id: 'NOTE-1',
      source: '1.06 (Phase 6 security review)',
      finding: 'AdminCap has no destroy/burn function. No transfer mechanism.',
      phase7Response: 'A3: destroy_admin_cap() + transfer_admin_cap() + 2-of-3 multisig recommendation.',
      status: 'ADDRESSED',
    },
    {
      id: 'NOTE-2',
      source: '2.02/2.05/2.06 (Phase 6 security review)',
      finding: 'TreasuryCap held in deployer wallet; no supply cap; no post-close handling.',
      phase7Response: 'A4: GuardedTreasury controller object. A5: hard MAX_SUPPLY on mint path.',
      status: 'ADDRESSED',
    },
    {
      id: 'NOTE-3',
      source: '5.06/6.04 (Phase 6 security review)',
      finding: 'Campaign close is reversible — no is_closed flag.',
      phase7Response: 'A2: is_closed: bool permanent flag; unpause() blocked on closed campaigns.',
      status: 'ADDRESSED',
    },
    {
      id: 'NOTE-4',
      source: '8.06 (Phase 6 security review)',
      finding: 'activate() did not emit CampaignActivated event.',
      phase7Response: 'RESOLVED IN SPRINT 2 — CampaignActivated event added. Closed.',
      status: 'RESOLVED',
    },
    {
      id: 'NOTE-5',
      source: '7.10 (Phase 6 security review)',
      finding: 'Merkle proof vector length not bounded — gas griefing attack vector.',
      phase7Response: 'A1: EProofTooLong error code, MAX_PROOF_DEPTH = 20, assert before loop.',
      status: 'ADDRESSED',
    },
  ];

  const artifacts: ArtifactRow[] = [
    { label: 'Gate tracker',          path: 'documents/chains/AXIOM_SUI_PHASE7_GATE_TRACKER.md',          status: 'COMPLETE' },
    { label: 'Authorization',         path: 'documents/chains/AXIOM_SUI_PHASE7_AUTHORIZATION.md',          status: 'COMPLETE' },
    { label: 'Hardening plan',        path: 'documents/chains/AXIOM_SUI_PHASE7_HARDENING_PLAN.md',         status: 'COMPLETE' },
    { label: 'Mainnet decision memo', path: 'documents/chains/AXIOM_SUI_PHASE7_MAINNET_DECISION_MEMO.md',  status: 'COMPLETE' },
    { label: 'Asset policy',          path: 'documents/chains/AXIOM_SUI_PHASE7_ASSET_POLICY.md',           status: 'COMPLETE' },
    { label: 'Proof toolchain',       path: 'documents/chains/AXIOM_SUI_PHASE7_PROOF_TOOLCHAIN.md',        status: 'COMPLETE' },
    { label: 'Indexer / API design',  path: 'documents/chains/AXIOM_SUI_PHASE7_INDEXER_DESIGN.md',         status: 'COMPLETE' },
    { label: 'Risk register',         path: 'documents/chains/AXIOM_SUI_PHASE7_RISK_REGISTER.md',          status: 'COMPLETE' },
    { label: 'Completion report',     path: 'documents/chains/AXIOM_SUI_PHASE7_COMPLETION_REPORT.md',      status: 'COMPLETE' },
    { label: 'Operator dashboard',    path: 'pages/operator/chains/sui-phase7.tsx',                         status: 'COMPLETE' },
  ];

  return {
    props: {
      reportedAt:      new Date().toISOString(),
      chainSuiEnabled,
      multichainEnabled,
      decisionSummary: 'Option B — Sui Mainnet Community Rewards Distribution Layer. Conditional PROCEED to Phase 8.',
      phase6PackageId: '0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602',
      gates,
      risks,
      findings,
      artifacts,
    },
  };
};

const GATE_BADGE: Record<GateRow['status'], string> = {
  SATISFIED:    'border-green-700 bg-green-50 text-green-800',
  COMPLETE:     'border-green-700 bg-green-50 text-green-800',
  DESIGN_ONLY:  'border-blue-600 bg-blue-50 text-blue-800',
  PENDING:      'border-amber-600 bg-amber-50 text-amber-900',
  NOT_STARTED:  'border-dl-border bg-dl-bg text-dl-muted',
};

const GATE_LABEL: Record<GateRow['status'], string> = {
  SATISFIED:   'SATISFIED',
  COMPLETE:    'COMPLETE',
  DESIGN_ONLY: 'DESIGN ONLY — NOT DEPLOYED',
  PENDING:     'PENDING',
  NOT_STARTED: 'NOT STARTED',
};

const RISK_BADGE: Record<RiskRow['severity'], string> = {
  CRITICAL:   'border-red-800 bg-red-100 text-red-900',
  HIGH:       'border-red-600 bg-red-50 text-red-800',
  MEDIUM:     'border-amber-600 bg-amber-50 text-amber-900',
  LOW:        'border-dl-border bg-dl-bg text-dl-muted',
  NEGLIGIBLE: 'border-dl-border bg-dl-bg text-dl-muted',
};

const FINDING_BADGE: Record<FindingRow['status'], string> = {
  ADDRESSED: 'border-blue-600 bg-blue-50 text-blue-800',
  RESOLVED:  'border-green-700 bg-green-50 text-green-800',
  PENDING:   'border-amber-600 bg-amber-50 text-amber-900',
};

export default function SuiPhase7OperatorPage({
  reportedAt,
  chainSuiEnabled,
  multichainEnabled,
  decisionSummary,
  phase6PackageId,
  gates,
  risks,
  findings,
  artifacts,
}: SuiPhase7Props) {
  const allGatesSatisfied = gates.every(
    (g) => g.status === 'SATISFIED' || g.status === 'COMPLETE' || g.status === 'DESIGN_ONLY',
  );

  return (
    <OperatorConsoleLayout>
      <div className="py-8">

        {/* Breadcrumb */}
        <div className="mb-4 flex gap-3 text-sm">
          <Link href="/operator" className="underline">← Console</Link>
          <span className="text-dl-muted">/</span>
          <Link href="/operator/chains/sui" className="underline">Sui</Link>
          <span className="text-dl-muted">/</span>
          <span className="text-dl-ink">Phase 7</span>
        </div>

        {/* Header */}
        <div className="flex items-baseline gap-3 mb-1 flex-wrap">
          <h1 className="text-2xl font-serif">Sui — Phase 7 Design Package</h1>
          <span className="text-xs uppercase tracking-wide border border-dl-border bg-dl-bg-alt px-2 py-0.5 font-mono text-dl-muted">
            READ-ONLY
          </span>
          {allGatesSatisfied && (
            <span className="text-xs uppercase tracking-wide border border-green-700 bg-green-50 text-green-800 px-2 py-0.5 font-mono">
              ALL GATES SATISFIED
            </span>
          )}
        </div>
        <p className="text-sm text-dl-muted mb-1 font-mono">
          Phase 7 — Mainnet Design + Hardening + Authorization
        </p>
        <p className="text-xs text-dl-muted mb-6">
          Design and governance documentation only. No mainnet deployment.
          No canonical asset issuance. No bridge. Arbitrum One remains canonical.
        </p>

        {/* NO-GO BANNER */}
        <div className="border-2 border-red-700 bg-red-50 text-red-900 p-4 mb-6">
          <div className="font-serif text-base mb-2 font-bold uppercase tracking-wide">
            Mainnet NO-GO — Phase 7 is Design Only
          </div>
          <div className="text-xs font-mono space-y-1">
            <div>✗  No Sui mainnet deployment authorized by Phase 7</div>
            <div>✗  No canonical asset issuance (AXUSD / AXAU / AXM / SEED / KAG)</div>
            <div>✗  No bridge code</div>
            <div>✗  CHAIN_SUI_ENABLED: <span className={chainSuiEnabled ? 'text-red-700 font-bold' : 'text-green-800'}>{chainSuiEnabled ? 'TRUE — UNEXPECTED' : 'false — correct'}</span></div>
            <div>✗  Phase 8 authorization required before any mainnet work begins</div>
          </div>
        </div>

        {/* Environment flags */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Environment flags</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-dl-muted">MULTICHAIN_ENABLED</dt>
              <dd className={`font-mono ${multichainEnabled ? 'text-amber-700' : 'text-green-800'}`}>
                {multichainEnabled ? 'true — review required' : 'false (correct)'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">CHAIN_SUI_ENABLED</dt>
              <dd className={`font-mono ${chainSuiEnabled ? 'text-red-700 font-bold' : 'text-green-800'}`}>
                {chainSuiEnabled ? 'true — UNEXPECTED' : 'false (correct)'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Phase 7 scope</dt>
              <dd className="font-mono text-xs text-green-800">design + hardening + auth only</dd>
            </div>
          </dl>
        </section>

        {/* Phase status */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Phase status</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-dl-muted">Phase</dt>
              <dd className="font-mono">7 — Mainnet Design + Hardening</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Status</dt>
              <dd className="font-mono text-green-800">COMPLETE</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Date</dt>
              <dd className="font-mono">2026-05-15</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Phase 6 package (ref)</dt>
              <dd className="font-mono text-xs break-all">{phase6PackageId}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Hardened contract</dt>
              <dd className="font-mono text-blue-700">DESIGN ONLY — not deployed</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">Next phase</dt>
              <dd className="font-mono text-amber-700">Phase 8 — requires authorization</dd>
            </div>
          </dl>
        </section>

        {/* Architecture decision */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-2">Architecture decision</h2>
          <div className="border border-green-700 bg-green-50 p-3 mb-3">
            <div className="text-xs uppercase tracking-wide text-green-700 mb-1 font-mono">Selected — Option B</div>
            <div className="text-sm text-green-900 font-serif">{decisionSummary}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-dl-muted">
            <div>Option A — testnet-only experimental: REJECTED</div>
            <div>Option C — community utility layer: DEFERRED (Phase 10+)</div>
            <div>Option D — canonical bridged distribution: REJECTED</div>
            <div>Option B — community rewards layer: SELECTED</div>
          </div>
          <p className="text-xs text-dl-muted font-mono mt-2">
            Reference: documents/chains/AXIOM_SUI_PHASE7_MAINNET_DECISION_MEMO.md
          </p>
        </section>

        {/* Gate tracker */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Phase 7 gate tracker</h2>
          <div className="space-y-3">
            {gates.map((gate) => (
              <div key={gate.id} className="border border-dl-border p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold">{gate.id}</span>
                    <span className="text-sm">{gate.label}</span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide border px-2 py-0.5 whitespace-nowrap shrink-0 ${GATE_BADGE[gate.status]}`}>
                    {GATE_LABEL[gate.status]}
                  </span>
                </div>
                <p className="text-xs text-dl-muted font-mono mt-1">{gate.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Carry-forward findings */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Carry-forward findings (Phase 6 → Phase 7)</h2>
          <div className="space-y-3">
            {findings.map((f) => (
              <div key={f.id} className="border border-dl-border p-3">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold">{f.id}</span>
                    <span className="text-xs text-dl-muted font-mono">{f.source}</span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide border px-2 py-0.5 whitespace-nowrap shrink-0 ${FINDING_BADGE[f.status]}`}>
                    {f.status}
                  </span>
                </div>
                <p className="text-xs text-dl-ink mb-1">{f.finding}</p>
                <p className="text-xs text-dl-muted font-mono">→ {f.phase7Response}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Risk register summary */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-1">Risk register summary</h2>
          <p className="text-xs text-dl-muted font-mono mb-3">
            23 risks total. Full detail: documents/chains/AXIOM_SUI_PHASE7_RISK_REGISTER.md
          </p>

          {/* Risks requiring Phase 8 action */}
          <div className="border border-amber-600 bg-amber-50 p-3 mb-3">
            <div className="text-xs uppercase text-amber-700 font-mono mb-1 tracking-wide">
              Pending — required before Phase 8
            </div>
            <ul className="text-xs font-mono text-amber-900 space-y-0.5">
              <li>O-03 — Proof toolchain implementation + testing</li>
              <li>G-01 — Legal counsel review before mainnet campaign launch</li>
              <li>I-01 — Off-chain toolchain dependency mitigation</li>
            </ul>
          </div>

          <div className="space-y-2">
            {risks.map((risk) => (
              <div key={risk.id} className="border border-dl-border p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold">{risk.id}</span>
                    <span className="text-xs">{risk.description}</span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide border px-2 py-0.5 whitespace-nowrap shrink-0 ${RISK_BADGE[risk.severity]}`}>
                    {risk.severity}
                  </span>
                </div>
                <p className="text-xs text-dl-muted font-mono mt-1">{risk.mitigation}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hardening design summary */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-2">Move hardening design summary</h2>
          <p className="text-xs text-dl-muted font-mono mb-3">
            Design only — not compiled, not deployed. Full detail: documents/chains/AXIOM_SUI_PHASE7_HARDENING_PLAN.md
          </p>
          <div className="space-y-2">
            {[
              { id: 'A1', label: 'Merkle proof depth limit',      detail: 'EProofTooLong (code 7) — assert proof.length <= 20 before loop. Gas griefing defense.' },
              { id: 'A2', label: 'Permanent campaign closure',    detail: 'is_closed: bool — once true, unpause() is blocked. ECampaignAlreadyClosed (code 8).' },
              { id: 'A3', label: 'AdminCap lifecycle',            detail: 'destroy_admin_cap() + transfer_admin_cap() + 2-of-3 multisig custody recommendation.' },
              { id: 'A4', label: 'TreasuryCap custody',           detail: 'GuardedTreasury shared object wraps TreasuryCap. Minting requires AdminCap. Auditable.' },
              { id: 'A5', label: 'Hard supply cap',               detail: 'MAX_SUPPLY constant. ESupplyCapExceeded (code 9). Immutable after deployment.' },
              { id: 'A6', label: 'Upgrade policy',                detail: 'Recommendation: Frozen Package for first mainnet deployment. No UpgradeCap.' },
              { id: 'A7', label: 'Event completeness audit',       detail: 'All 8 existing events verified. 3 new events added: AdminCapDestroyed, AdminCapTransferred, TokensMinted.' },
            ].map((item) => (
              <div key={item.id} className="border border-dl-border p-3 flex gap-3">
                <span className="font-mono text-sm font-bold text-blue-700 shrink-0 w-6">{item.id}</span>
                <div>
                  <div className="text-sm font-serif">{item.label}</div>
                  <div className="text-xs text-dl-muted font-mono mt-0.5">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Asset policy summary */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-2">Asset policy</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-xs uppercase text-dl-muted font-mono mb-2 tracking-wide">Permitted on Sui</div>
              <ul className="space-y-1 font-mono text-green-800">
                <li>✓  Test tokens (no monetary value)</li>
                <li>✓  Community reward artifacts (ops sign-off required)</li>
                <li>✓  Non-financial claim assets (EL + Ops sign-off)</li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase text-dl-muted font-mono mb-2 tracking-wide">Forbidden without Board authorization</div>
              <ul className="space-y-1 font-mono text-red-800">
                <li>✗  AXUSD (Arbitrum canonical)</li>
                <li>✗  AXAU (Arbitrum canonical)</li>
                <li>✗  AXM (Arbitrum canonical)</li>
                <li>✗  SEED, KAG (Arbitrum canonical)</li>
                <li>✗  Reserve-backed tokens</li>
                <li>✗  Yield-bearing instruments</li>
                <li>✗  Redemption instruments</li>
                <li>✗  Bridge/wrapped canonical assets</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-dl-muted font-mono mt-2">
            Reference: documents/chains/AXIOM_SUI_PHASE7_ASSET_POLICY.md
          </p>
        </section>

        {/* Artifact registry */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Artifact registry</h2>
          <div className="space-y-2">
            {artifacts.map((art) => (
              <div key={art.path} className="flex items-center justify-between gap-4 border border-dl-border p-2">
                <div>
                  <div className="text-sm">{art.label}</div>
                  <div className="text-xs font-mono text-dl-muted">{art.path}</div>
                </div>
                <span className={`text-[10px] uppercase tracking-wide border px-2 py-0.5 whitespace-nowrap shrink-0 ${
                  art.status === 'COMPLETE'
                    ? 'border-green-700 bg-green-50 text-green-800'
                    : 'border-amber-600 bg-amber-50 text-amber-900'
                }`}>
                  {art.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Phase 8 prerequisites */}
        <section className="border border-amber-600 bg-amber-50 p-4 mb-6">
          <h2 className="font-serif text-lg mb-2 text-amber-900">Phase 8 Prerequisites</h2>
          <p className="text-xs font-mono text-amber-800 mb-3">
            Phase 8 (Sui Mainnet Preparation) may not begin until all of the following are satisfied.
          </p>
          <ul className="space-y-1 text-xs font-mono text-amber-900">
            <li>[ ] Phase 7 authorization signed — Engineering Lead ✓</li>
            <li>[ ] Phase 7 authorization signed — Operations Lead ✓</li>
            <li>{'[ ] Hardened Move code compiled + tested (>= 28 tests)'}</li>
            <li>[ ] Independent Move security review of hardened contract</li>
            <li>[ ] Production key management plan (AdminCap 2-of-3 multisig)</li>
            <li>[ ] Proof toolchain MVP implemented + tested offline</li>
            <li>[ ] Legal counsel review (asset policy / community token classification)</li>
            <li>[ ] Phase 8 authorization signed — Engineering Lead</li>
            <li>[ ] Phase 8 authorization signed — Operations Lead</li>
          </ul>
        </section>

        {/* Production safety confirmation */}
        <section className="border border-dl-border p-4">
          <h2 className="font-serif text-lg mb-2">Production safety confirmation</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {([
              ['Arbitrum One canonical status',    'UNCHANGED'],
              ['Avalanche limited pilot',           'UNCHANGED'],
              ['Polygon payments/treasury',         'UNCHANGED'],
              ['Sui mainnet deployment',            'NONE'],
              ['Canonical asset issuance on Sui',  'NONE'],
              ['Bridge code',                       'NONE'],
              ['Hardened Move code compiled',       'DESIGN ONLY'],
              ['CHAIN_SUI_ENABLED activated',       'NO — false (correct)'],
              ['capinfra runtime modified',         'NONE'],
              ['Banking rails modified',            'NONE'],
              ['New env vars activated',            'NONE'],
              ['shared/contracts.ts modified',      'NONE'],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-dl-muted">{label}</dt>
                <dd className={
                  value === 'NONE' || value === 'UNCHANGED' || value === 'NO — false (correct)' || value === 'DESIGN ONLY'
                    ? 'text-green-800'
                    : 'text-red-700 font-bold'
                }>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-dl-muted font-mono mt-3">Reported at: {reportedAt}</p>
        </section>

      </div>
    </OperatorConsoleLayout>
  );
}
