import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';

interface GateRow {
  id: string;
  label: string;
  status: 'SATISFIED' | 'REVIEW_COMPLETE' | 'EXTERNAL_REQUIRED' | 'PENDING' | 'NOT_STARTED' | 'INSTALL_DEFERRED';
  detail: string;
}

interface SuiChainProps {
  phase: string;
  chainSuiEnabled: boolean;
  multichainEnabled: boolean;
  suiRpcUrl: string | null;
  gates: GateRow[];
  reportedAt: string;
}

export const getServerSideProps: GetServerSideProps<SuiChainProps> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const chainSuiEnabled   = process.env.CHAIN_SUI_ENABLED === 'true';
  const multichainEnabled = process.env.MULTICHAIN_ENABLED === 'true';
  const suiRpcUrl         = process.env.SUI_RPC_URL ?? null;

  const gates: GateRow[] = [
    {
      id: 'G01',
      label: 'Distribution model decision',
      status: 'SATISFIED',
      detail: 'Option B (Claim Contract) selected 2026-05-15. Merkle root pull model.',
    },
    {
      id: 'G02',
      label: '@mysten/sui SDK review / install',
      status: 'REVIEW_COMPLETE',
      detail: 'Review complete. Install deferred to Phase 6 (design phase only).',
    },
    {
      id: 'G03',
      label: 'Move language capability',
      status: 'EXTERNAL_REQUIRED',
      detail: 'No Move expertise in codebase. External Move developer required before Phase 6.',
    },
    {
      id: 'G04',
      label: 'Testnet wallet provisioned',
      status: 'PENDING',
      detail: 'No wallet generated. Provision via Sui CLI; record in TESTNET_WALLET_PLAN.md.',
    },
    {
      id: 'G05',
      label: 'Claim contract spec complete',
      status: 'SATISFIED',
      detail: 'AXIOM_SUI_CLAIM_CONTRACT_SPEC.md written. AXIOM_TEST_CLAIM placeholder asset defined.',
    },
    {
      id: 'G06',
      label: 'Testnet deployment authorization',
      status: 'NOT_STARTED',
      detail: 'Requires G03 + G04 + ops sign-off. Phase 6 gate.',
    },
    {
      id: 'G07',
      label: 'Testnet security review',
      status: 'NOT_STARTED',
      detail: 'External Move auditor required. Phase 6 gate, post-deployment.',
    },
    {
      id: 'G08',
      label: 'Post-testnet report',
      status: 'NOT_STARTED',
      detail: 'Requires G07 + at least one end-to-end testnet claim. Phase 6 gate.',
    },
  ];

  return {
    props: {
      phase: 'Phase 5 — Testnet Claim Contract Prototype Design',
      chainSuiEnabled,
      multichainEnabled,
      suiRpcUrl,
      gates,
      reportedAt: new Date().toISOString(),
    },
  };
};

const GATE_BADGE: Record<GateRow['status'], string> = {
  SATISFIED:        'border-green-700 bg-green-50 text-green-800',
  REVIEW_COMPLETE:  'border-blue-600 bg-blue-50 text-blue-800',
  INSTALL_DEFERRED: 'border-blue-600 bg-blue-50 text-blue-800',
  EXTERNAL_REQUIRED:'border-amber-600 bg-amber-50 text-amber-900',
  PENDING:          'border-amber-600 bg-amber-50 text-amber-900',
  NOT_STARTED:      'border-dl-border bg-dl-bg text-dl-muted',
};

const GATE_LABEL: Record<GateRow['status'], string> = {
  SATISFIED:        'SATISFIED',
  REVIEW_COMPLETE:  'REVIEW COMPLETE / INSTALL DEFERRED',
  INSTALL_DEFERRED: 'INSTALL DEFERRED',
  EXTERNAL_REQUIRED:'EXTERNAL REQUIRED',
  PENDING:          'PENDING',
  NOT_STARTED:      'NOT STARTED',
};

export default function SuiChainOperatorPage({
  phase,
  chainSuiEnabled,
  multichainEnabled,
  suiRpcUrl,
  gates,
  reportedAt,
}: SuiChainProps) {
  return (
    <OperatorConsoleLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator" className="text-sm underline">← Back to console</Link>
        </div>

        <div className="flex items-baseline gap-3 mb-1">
          <h1 className="text-2xl font-serif">Sui — Chain Status</h1>
          <span className="text-xs uppercase tracking-wide border border-dl-border bg-dl-bg-alt px-2 py-0.5 font-mono text-dl-muted">
            DISABLED
          </span>
        </div>

        <p className="text-sm text-dl-muted mb-1 font-mono">{phase}</p>
        <p className="text-xs text-dl-muted mb-6">
          Non-EVM — Move VM. Distribution / community / diaspora layer.
          No mainnet transactions. No canonical asset issuance. No bridge.
          Arbitrum One remains canonical.
        </p>

        {/* Warning banner */}
        <div className="border border-amber-600 bg-amber-50 text-amber-900 p-3 mb-6">
          <div className="font-serif text-sm mb-1">Testnet-only design phase</div>
          <div className="text-xs font-mono">
            CHAIN_SUI_ENABLED is {chainSuiEnabled ? 'TRUE — UNEXPECTED IN PHASE 5' : 'false — correct'}.{' '}
            No Move packages are deployed. No @mysten/sui SDK installed.
            This page is read-only — no RPC calls are made.
          </div>
        </div>

        {/* Environment flags */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Environment flags</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-dl-muted">MULTICHAIN_ENABLED</dt>
              <dd className={`font-mono ${multichainEnabled ? 'text-amber-700' : 'text-dl-ink'}`}>
                {multichainEnabled ? 'true' : 'false (correct)'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">CHAIN_SUI_ENABLED</dt>
              <dd className={`font-mono ${chainSuiEnabled ? 'text-red-700 font-bold' : 'text-dl-ink'}`}>
                {chainSuiEnabled ? 'true — UNEXPECTED' : 'false (correct)'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-dl-muted">SUI_RPC_URL</dt>
              <dd className="font-mono text-xs break-all">{suiRpcUrl ?? 'not set (correct)'}</dd>
            </div>
          </dl>
        </section>

        {/* Chain facts */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Chain facts</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div><dt className="text-xs uppercase text-dl-muted">Chain type</dt><dd className="font-mono">non_evm (Move VM)</dd></div>
            <div><dt className="text-xs uppercase text-dl-muted">EVM chain ID</dt><dd className="font-mono">none</dd></div>
            <div><dt className="text-xs uppercase text-dl-muted">Strategic role</dt><dd className="font-mono">distribution_community</dd></div>
            <div><dt className="text-xs uppercase text-dl-muted">Native currency</dt><dd className="font-mono">SUI (9 decimals)</dd></div>
            <div><dt className="text-xs uppercase text-dl-muted">Public RPC</dt><dd className="font-mono text-xs break-all">fullnode.mainnet.sui.io</dd></div>
            <div><dt className="text-xs uppercase text-dl-muted">Explorer</dt><dd className="font-mono">suiscan.xyz</dd></div>
            <div><dt className="text-xs uppercase text-dl-muted">Alchemy support</dt><dd className="font-mono">none</dd></div>
            <div><dt className="text-xs uppercase text-dl-muted">BitGo custody</dt><dd className="font-mono">not supported</dd></div>
            <div><dt className="text-xs uppercase text-dl-muted">Distribution model</dt><dd className="font-mono">Option B — Claim Contract</dd></div>
          </dl>
        </section>

        {/* Gate tracker */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Phase 5 gate tracker</h2>
          <div className="space-y-3">
            {gates.map((gate) => (
              <div key={gate.id} className="border border-dl-border p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold">{gate.id}</span>
                    <span className="text-sm">{gate.label}</span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide border px-2 py-0.5 whitespace-nowrap ${GATE_BADGE[gate.status]}`}>
                    {GATE_LABEL[gate.status]}
                  </span>
                </div>
                <p className="text-xs text-dl-muted font-mono mt-1">{gate.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Phase 6 blocking gates */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-2">Phase 6 blockers</h2>
          <p className="text-xs text-dl-muted mb-3 font-mono">
            Phase 6 (testnet build) may not begin until all three conditions are satisfied.
          </p>
          <ul className="space-y-1 text-sm font-mono">
            <li className="text-amber-800">G03 — External Move developer must be engaged and confirmed</li>
            <li className="text-amber-800">G04 — Sui testnet wallet must be provisioned and funded</li>
            <li className="text-amber-800">G06 — Testnet deployment authorization must be signed by ops</li>
          </ul>
        </section>

        {/* Key documents */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Key documents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-dl-muted">
            {[
              'documents/chains/AXIOM_SUI_PHASE5_DECISION_RECORD.md',
              'documents/chains/AXIOM_SUI_CLAIM_CONTRACT_SPEC.md',
              'documents/chains/AXIOM_SUI_SDK_REVIEW.md',
              'documents/chains/AXIOM_SUI_MOVE_CAPABILITY_PLAN.md',
              'documents/chains/AXIOM_SUI_TESTNET_WALLET_PLAN.md',
              'documents/chains/AXIOM_SUI_PHASE5_GATE_TRACKER.md',
              'documents/chains/AXIOM_SUI_PHASE4_DISCOVERY.md',
              'sui/README.md',
            ].map((doc) => (
              <div key={doc} className="truncate">{doc}</div>
            ))}
          </div>
        </section>

        {/* Safety confirmation */}
        <section className="border border-dl-border p-4">
          <h2 className="font-serif text-lg mb-2">Production safety confirmation</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {[
              ['Arbitrum canonical status', 'UNCHANGED'],
              ['Avalanche Limited Pilot', 'UNCHANGED'],
              ['Polygon Phase 5', 'UNCHANGED'],
              ['Sui mainnet deployment', 'NONE'],
              ['Sui testnet deployment', 'NONE'],
              ['Canonical asset issuance', 'NONE'],
              ['Bridge code', 'NONE'],
              ['@mysten/sui SDK installed', 'NO — DEFERRED'],
              ['Move packages deployed', 'NONE'],
              ['New required env vars', 'NONE'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-dl-muted">{label}</dt>
                <dd className={value === 'UNCHANGED' || value === 'NONE' || value === 'NO — DEFERRED'
                  ? 'text-green-800'
                  : 'text-red-700'}>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-dl-muted font-mono mt-3">Reported at: {reportedAt}</p>
        </section>
      </div>
    </OperatorConsoleLayout>
  );
}
