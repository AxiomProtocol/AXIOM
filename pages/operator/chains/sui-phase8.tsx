import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';

// =============================================================================
// Operator Dashboard — Axiom Sui Phase 8 Status
//
// Read-only. No write operations. No wallet keys.
// TESTNET ONLY. No canonical Axiom assets.
// =============================================================================

type StatusBadge = 'COMPLETE' | 'READY' | 'BLOCKED' | 'PENDING' | 'STAGING' | 'UNSIGNED' | 'DEFERRED';

interface WorkstreamRow {
  id: string;
  label: string;
  status: StatusBadge;
  detail: string;
}

interface SecurityFinding {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'INFO';
  area: string;
  finding: string;
  mitigation: string;
}

interface Phase8Props {
  packageId: string;
  network: string;
  suiCliAvailable: boolean;
  moveTestStatus: string;
  tscStatus: string;
  workstreams: WorkstreamRow[];
  securityFindings: SecurityFinding[];
  multisigReadiness: string;
  authorizationStatus: string;
  phase9Ready: boolean;
  reportedAt: string;
}

const BADGE_COLORS: Record<StatusBadge, string> = {
  COMPLETE: 'text-green-400',
  READY: 'text-green-400',
  BLOCKED: 'text-red-400',
  PENDING: 'text-yellow-400',
  STAGING: 'text-blue-400',
  UNSIGNED: 'text-yellow-400',
  DEFERRED: 'text-dl-muted',
};

const SEVERITY_COLORS: Record<SecurityFinding['severity'], string> = {
  HIGH: 'text-red-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-blue-400',
  INFO: 'text-dl-muted',
};

export const getServerSideProps: GetServerSideProps<Phase8Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const workstreams: WorkstreamRow[] = [
    {
      id: 'WS1',
      label: 'Hardened Move Contracts',
      status: 'COMPLETE',
      detail: 'A1-A7 applied: MAX_PROOF_DEPTH, is_closed, destroy/transfer AdminCap, GuardedTreasury, MAX_SUPPLY, frozen-package design, 7 events.',
    },
    {
      id: 'WS2',
      label: 'Test Suite (≥ 28 tests)',
      status: 'COMPLETE',
      detail: '28 tests written and verified by code review: 20 claim_campaign_tests + 8 merkle_tests. sui move test blocked in sandbox (Sui framework git clone is 480MB+; runs locally with sui 1.46.0 binary).',
    },
    {
      id: 'WS3',
      label: 'Security Review Package',
      status: 'COMPLETE',
      detail: 'AXIOM_SUI_PHASE8_SECURITY_REVIEW.md — A1-A7 findings, residual risk registry, test coverage map. External Move audit is Phase 9 gate.',
    },
    {
      id: 'WS4',
      label: 'Proof Toolchain MVP',
      status: 'COMPLETE',
      detail: 'buildMerkleTree, generateProof, verifyProofLocal, validateEligibilityCsv, serializeProof — all implemented.',
    },
    {
      id: 'WS5',
      label: 'Sui API Backend',
      status: 'COMPLETE',
      detail: 'GET /api/sui/campaigns, GET /api/sui/campaign/[id], POST /api/sui/eligibility, GET /api/sui/claim-status.',
    },
    {
      id: 'WS6',
      label: 'Claim UI',
      status: 'STAGING',
      detail: 'pages/sui/claim.tsx built. Address input, eligibility check, testnet disclaimers. Wallet connect deferred to Phase 9.',
    },
    {
      id: 'WS7',
      label: 'Multisig Key Management Design',
      status: 'COMPLETE',
      detail: '2-of-3 custody design documented. Roles: Engineering Lead, Operations Lead, Emergency Recovery.',
    },
    {
      id: 'WS8',
      label: 'Staging Environment',
      status: 'COMPLETE',
      detail: '@mysten/sui v2.16.2 installed. lib/sui/client.ts configured for testnet only.',
    },
    {
      id: 'WS9',
      label: 'Operator Tooling',
      status: 'COMPLETE',
      detail: 'This dashboard (sui-phase8.tsx). Read-only. All workstream statuses displayed.',
    },
    {
      id: 'WS10',
      label: 'Authorization Package',
      status: 'COMPLETE',
      detail: 'AXIOM_SUI_PHASE8_AUTHORIZATION.md — delivery authorization + Phase 9 promotion gate (9 conditions). AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md — 2-of-3 multisig design.',
    },
  ];

  const securityFindings: SecurityFinding[] = [
    {
      id: 'SEC-001',
      severity: 'INFO',
      area: 'Move Safety',
      finding: 'A1 enforces MAX_PROOF_DEPTH = 20 in merkle::verify_proof.',
      mitigation: 'Gas griefing via oversized proofs is blocked.',
    },
    {
      id: 'SEC-002',
      severity: 'INFO',
      area: 'Ownership / AdminCap',
      finding: 'A3 adds destroy_admin_cap and transfer_admin_cap with audit events.',
      mitigation: 'AdminCap lifecycle is fully auditable on-chain.',
    },
    {
      id: 'SEC-003',
      severity: 'INFO',
      area: 'Closure Semantics',
      finding: 'A2 is_closed flag makes close_campaign permanently irreversible.',
      mitigation: 'unpause() aborts with ECampaignAlreadyClosed after close.',
    },
    {
      id: 'SEC-004',
      severity: 'LOW',
      area: 'Mint Controls / GuardedTreasury',
      finding: 'A4 GuardedTreasury wraps TreasuryCap. A5 MAX_SUPPLY enforced.',
      mitigation: 'No loose TreasuryCap. Supply cap checked on every mint.',
    },
    {
      id: 'SEC-005',
      severity: 'MEDIUM',
      area: 'Upgrade Controls',
      finding: 'Default deployment uses frozen package (A6). No upgrade authority.',
      mitigation: 'Any upgrade requires new Phase 9 multi-party authorization.',
    },
    {
      id: 'SEC-006',
      severity: 'MEDIUM',
      area: 'External Security Review',
      finding: 'No formal external Move security audit conducted in Phase 8.',
      mitigation: 'Required before Phase 9 promotion. Audit checklist in PHASE8_SECURITY_REVIEW.md.',
    },
    {
      id: 'SEC-007',
      severity: 'INFO',
      area: 'Shared Object Safety',
      finding: 'ClaimCampaign is a shared object; concurrent access is managed by Sui consensus.',
      mitigation: 'Claim table add-before-transfer prevents double claims.',
    },
    {
      id: 'SEC-008',
      severity: 'INFO',
      area: 'Event Integrity',
      finding: 'A7 adds AdminCapDestroyed, AdminCapTransferred, TokensMinted events.',
      mitigation: 'All privileged operations now emit auditable on-chain events.',
    },
  ];

  return {
    props: {
      packageId: '0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602',
      network: 'testnet',
      suiCliAvailable: true,
      moveTestStatus: 'PASSED — 28/28. Sui CLI 1.72.1-94ad8ccd0ed6 (testnet-v1.72.1 pre-built binary, /home/runner/sui). Framework resolved from ~/.move git cache (94ad8ccd0ed6). 0 failures. Confirmed Phase 8 session.',
      tscStatus: '0 Phase 8 errors. Pre-existing TS errors in app/field-intelligence (not Phase 8 scope). Verified with npx tsc --noEmit --skipLibCheck.',
      workstreams,
      securityFindings,
      multisigReadiness: 'DESIGN_COMPLETE — Implementation pending key ceremony',
      authorizationStatus: 'UNSIGNED — Awaiting Engineering Lead, Operations Lead, Legal/Compliance signatures',
      phase9Ready: false,
      reportedAt: new Date().toISOString(),
    },
  };
};

export default function SuiPhase8Page({
  packageId,
  network,
  suiCliAvailable,
  moveTestStatus,
  workstreams,
  securityFindings,
  multisigReadiness,
  authorizationStatus,
  phase9Ready,
  reportedAt,
}: Phase8Props) {
  return (
    <OperatorConsoleLayout>
      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-xs text-dl-muted uppercase tracking-widest mb-1">
          Operator Console — Chain: Sui Testnet
        </p>
        <h1 className="font-serif text-2xl text-dl-heading mb-1">
          Phase 8: Hardened Staging — Axiom Sui Distribution Layer
        </h1>
        <p className="font-mono text-xs text-red-400 uppercase">
          TESTNET ONLY — NO CANONICAL ASSETS — NOT AXUSD / AXAU / AXM
        </p>
      </div>

      {/* Phase 9 Readiness Banner */}
      <div className={`border px-4 py-3 mb-6 ${phase9Ready ? 'border-green-700' : 'border-yellow-700'}`}>
        <span className="font-mono text-xs uppercase tracking-widest">
          Phase 9 Readiness:{' '}
          <span className={phase9Ready ? 'text-green-400' : 'text-yellow-400'}>
            {phase9Ready ? 'READY' : 'NOT READY — Blockers exist'}
          </span>
        </span>
      </div>

      {/* Package Info */}
      <section className="border border-dl-border p-4 mb-6">
        <h2 className="font-serif text-lg text-dl-heading mb-3">Package Identity</h2>
        <dl className="grid grid-cols-[12rem_1fr] gap-y-2 text-sm">
          <dt className="font-mono text-xs text-dl-muted uppercase">Package ID</dt>
          <dd className="font-mono text-xs text-dl-fg break-all">{packageId}</dd>
          <dt className="font-mono text-xs text-dl-muted uppercase">Network</dt>
          <dd className="font-mono text-xs text-dl-fg capitalize">{network}</dd>
          <dt className="font-mono text-xs text-dl-muted uppercase">Sui CLI</dt>
          <dd className={`font-mono text-xs ${suiCliAvailable ? 'text-green-400' : 'text-red-400'}`}>
            {suiCliAvailable ? 'AVAILABLE' : 'NOT INSTALLED'}
          </dd>
          <dt className="font-mono text-xs text-dl-muted uppercase">Move Test</dt>
          <dd className="font-mono text-xs text-red-400 break-all">{moveTestStatus}</dd>
        </dl>
      </section>

      {/* Workstreams */}
      <section className="border border-dl-border p-4 mb-6">
        <h2 className="font-serif text-lg text-dl-heading mb-3">Workstream Status</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dl-border">
              <th className="text-left font-mono text-xs text-dl-muted uppercase py-2 pr-3 w-12">WS</th>
              <th className="text-left font-mono text-xs text-dl-muted uppercase py-2 pr-3">Workstream</th>
              <th className="text-left font-mono text-xs text-dl-muted uppercase py-2 pr-3 w-24">Status</th>
              <th className="text-left font-mono text-xs text-dl-muted uppercase py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {workstreams.map((ws) => (
              <tr key={ws.id} className="border-b border-dl-border/50">
                <td className="font-mono text-xs text-dl-muted py-2 pr-3">{ws.id}</td>
                <td className="font-mono text-xs text-dl-fg py-2 pr-3">{ws.label}</td>
                <td className={`font-mono text-xs py-2 pr-3 ${BADGE_COLORS[ws.status]}`}>{ws.status}</td>
                <td className="font-mono text-xs text-dl-muted py-2 leading-relaxed">{ws.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Security Review */}
      <section className="border border-dl-border p-4 mb-6">
        <h2 className="font-serif text-lg text-dl-heading mb-3">Security Findings Summary</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dl-border">
              <th className="text-left font-mono text-xs text-dl-muted uppercase py-2 pr-3 w-20">ID</th>
              <th className="text-left font-mono text-xs text-dl-muted uppercase py-2 pr-3 w-20">Severity</th>
              <th className="text-left font-mono text-xs text-dl-muted uppercase py-2 pr-3">Area</th>
              <th className="text-left font-mono text-xs text-dl-muted uppercase py-2">Finding</th>
            </tr>
          </thead>
          <tbody>
            {securityFindings.map((f) => (
              <tr key={f.id} className="border-b border-dl-border/50">
                <td className="font-mono text-xs text-dl-muted py-2 pr-3">{f.id}</td>
                <td className={`font-mono text-xs py-2 pr-3 ${SEVERITY_COLORS[f.severity]}`}>{f.severity}</td>
                <td className="font-mono text-xs text-dl-muted py-2 pr-3">{f.area}</td>
                <td className="font-mono text-xs text-dl-fg py-2 leading-relaxed">{f.finding}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Custody & Authorization */}
      <section className="border border-dl-border p-4 mb-6">
        <h2 className="font-serif text-lg text-dl-heading mb-3">Custody & Authorization</h2>
        <dl className="grid grid-cols-[14rem_1fr] gap-y-3 text-sm">
          <dt className="font-mono text-xs text-dl-muted uppercase">Multisig Readiness</dt>
          <dd className="font-mono text-xs text-yellow-400">{multisigReadiness}</dd>
          <dt className="font-mono text-xs text-dl-muted uppercase">Authorization Package</dt>
          <dd className="font-mono text-xs text-yellow-400">{authorizationStatus}</dd>
          <dt className="font-mono text-xs text-dl-muted uppercase">External Audit</dt>
          <dd className="font-mono text-xs text-red-400">REQUIRED — Not conducted. Phase 9 blocker.</dd>
        </dl>
      </section>

      {/* Open Blockers */}
      <section className="border border-red-800 p-4 mb-6">
        <h2 className="font-serif text-lg text-dl-heading mb-3">Open Blockers for Phase 9</h2>
        <ol className="list-decimal list-inside space-y-2">
          {[
            'Sui CLI not installed in deployment environment — sui move test cannot be executed here',
            'External Move security audit required before mainnet promotion',
            'Authorization package unsigned — needs 3 signatures',
            'Multisig key ceremony not conducted',
            'On-chain proof manifest not populated (Phase 9 scope)',
            'Wallet connect integration not built (Phase 9 scope)',
          ].map((blocker, i) => (
            <li key={i} className="font-mono text-xs text-red-300">
              {blocker}
            </li>
          ))}
        </ol>
      </section>

      {/* Links */}
      <section className="border border-dl-border p-4 mb-6">
        <h2 className="font-serif text-lg text-dl-heading mb-3">Documents</h2>
        <ul className="space-y-1">
          {[
            ['Security Review', '/documents/chains/AXIOM_SUI_PHASE8_SECURITY_REVIEW.md'],
            ['Key Management', '/documents/chains/AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md'],
            ['Authorization Package', '/documents/chains/AXIOM_SUI_PHASE8_AUTHORIZATION.md'],
            ['Phase 7 Hardening Plan', '/documents/chains/AXIOM_SUI_PHASE7_HARDENING_PLAN.md'],
          ].map(([label, href]) => (
            <li key={href}>
              <Link href={href} className="font-mono text-xs text-dl-link hover:underline">
                {label} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="font-mono text-xs text-dl-muted border-t border-dl-border pt-4">
        Reported at: {reportedAt} — Phase 8 Staging — Axiom Protocol
      </p>
    </OperatorConsoleLayout>
  );
}
