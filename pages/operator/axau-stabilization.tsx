/**
 * /operator/axau-stabilization — AXAU Phase 2A Stabilization Report
 *
 * 72-hour post-launch health report. Read-only. Calls the report service
 * directly in getServerSideProps (no HTTP self-call, no auth loop).
 * Covers: NAVEngine, PAXG buffer, solvency snapshots, mint/redeem activity,
 * settlement instructions, and all six Launch Invariants.
 */
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../lib/capinfra/operatorAuth';
import { generateStabilizationReport } from '../../lib/axau/stabilizationReport';
import type {
  StabilizationReport,
  StabilizationVerdict,
  LaunchInvariant,
} from '../../lib/axau/stabilizationReport';

interface PageProps {
  report: StabilizationReport;
  generationError: string | null;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  try {
    const report = await generateStabilizationReport();
    return { props: { report, generationError: null } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      props: {
        generationError: msg,
        report: null as unknown as StabilizationReport,
      },
    };
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function verdictColors(v: StabilizationVerdict) {
  if (v === 'STABLE')          return { border: 'border-green-700',  bg: 'bg-green-50',  text: 'text-green-800'  };
  if (v === 'DEGRADED')        return { border: 'border-yellow-600', bg: 'bg-yellow-50', text: 'text-yellow-800' };
  return                               { border: 'border-red-700',   bg: 'bg-red-50',    text: 'text-red-800'    };
}

function OkBadge({ ok, labelOk = 'NOMINAL', labelFail = 'ALERT' }: { ok: boolean; labelOk?: string; labelFail?: string }) {
  return (
    <span className={`text-[10px] uppercase tracking-widest font-mono border px-1.5 py-0.5 ${
      ok
        ? 'border-green-700 text-green-800 bg-green-50'
        : 'border-red-700 text-red-800 bg-red-50'
    }`}>
      {ok ? labelOk : labelFail}
    </span>
  );
}

function InvariantRow({ inv }: { inv: LaunchInvariant }) {
  return (
    <div className="border border-dl-border p-3 mb-2">
      <div className="flex items-start justify-between gap-4 mb-1">
        <span className="font-mono text-xs uppercase tracking-wide">{inv.name}</span>
        <OkBadge ok={inv.pass} labelOk="PASS" labelFail="FAIL" />
      </div>
      <p className="text-xs text-dl-muted mb-1">{inv.description}</p>
      <p className="text-xs font-mono text-dl-muted">{inv.detail}</p>
    </div>
  );
}

function AlertList({ alerts }: { alerts: string[] }) {
  if (alerts.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {alerts.map((a, i) => (
        <li key={i} className="text-xs font-mono text-red-800 bg-red-50 border border-red-200 px-2 py-1">
          · {a}
        </li>
      ))}
    </ul>
  );
}

function SectionHeading({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-serif text-lg">{label}</h2>
      <OkBadge ok={ok} />
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-1 border-b border-dl-border last:border-0">
      <span className="text-xs text-dl-muted">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AxauStabilizationPage(props: PageProps) {
  if (props.generationError) {
    return (
      <OperatorConsoleLayout>
        <div className="py-8">
          <h1 className="text-2xl font-serif mb-6">AXAU Stabilization Report</h1>
          <div className="border border-red-700 bg-red-50 p-4">
            <p className="text-sm text-red-800 font-mono">Report generation failed: {props.generationError}</p>
          </div>
        </div>
      </OperatorConsoleLayout>
    );
  }

  const r = props.report;
  const vc = verdictColors(r.verdict);

  return (
    <OperatorConsoleLayout>
      <div className="py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif mb-1">AXAU Stabilization Report</h1>
            <p className="text-xs font-mono text-dl-muted">
              Phase 2A · 72-hour post-launch window · Generated {new Date(r.generatedAt).toUTCString()}
            </p>
          </div>
          <Link href="/operator" className="text-xs underline text-dl-muted">← Console</Link>
        </div>

        {/* Verdict banner */}
        <section className={`border-2 ${vc.border} ${vc.bg} p-4 mb-6`}>
          <div className={`font-serif text-xl uppercase tracking-wide mb-2 ${vc.text}`}>
            {r.verdict}
          </div>
          <ul className="space-y-0.5">
            {r.verdictReasons.map((reason, i) => (
              <li key={i} className={`text-sm font-mono ${vc.text}`}>· {reason}</li>
            ))}
          </ul>
          <p className="text-[10px] font-mono text-dl-muted mt-3">
            Schema: {r.reportVersion} · Window: {r.windowHours}h ·
            Rail: Stripe + Coinbase Onramp + Arbitrum One + BitGo CaaS ·
            Deferred: ACH / wire / fiat redemption
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

          {/* NAVEngine */}
          <section className="border border-dl-border p-4">
            <SectionHeading label="NAVEngine" ok={r.navEngine.ok} />
            <DataRow label="Coverage Ratio"     value={r.navEngine.coverageRatioPct ?? '—'} />
            <DataRow label="Coverage (bps)"     value={r.navEngine.coverageRatioBps ?? '—'} />
            <DataRow label="Oracle Stale"       value={r.navEngine.oracleStale === null ? '—' : r.navEngine.oracleStale ? 'YES' : 'no'} />
            <DataRow label="Mint Paused"        value={r.navEngine.mintPaused === null ? '—' : r.navEngine.mintPaused ? 'YES' : 'no'} />
            <DataRow label="Redeem Paused"      value={r.navEngine.redeemPaused === null ? '—' : r.navEngine.redeemPaused ? 'YES' : 'no'} />
            <DataRow label="Total Supply"       value={r.navEngine.totalSupplyFormatted ?? '—'} />
            <DataRow label="Total Minted (raw)" value={r.navEngine.totalMinted ?? '—'} />
            <DataRow label="Solvent"            value={r.navEngine.isSolvent === null ? '—' : r.navEngine.isSolvent ? 'yes' : 'NO'} />
            {r.navEngine.error && (
              <p className="text-xs text-red-700 font-mono mt-2">{r.navEngine.error}</p>
            )}
            <AlertList alerts={r.navEngine.alerts} />
          </section>

          {/* PAXG Buffer */}
          <section className="border border-dl-border p-4">
            <SectionHeading label="PAXG Buffer" ok={r.paxgBuffer.ok} />
            <DataRow label="Balance"   value={r.paxgBuffer.balancePaxg ? `${r.paxgBuffer.balancePaxg} PAXG` : '—'} />
            <DataRow label="Minimum"  value={`${r.paxgBuffer.minimumPaxg} PAXG`} />
            <DataRow label="Status"   value={r.paxgBuffer.ok ? 'Sufficient' : 'BELOW MINIMUM'} />
            {r.paxgBuffer.error && (
              <p className="text-xs text-red-700 font-mono mt-2">{r.paxgBuffer.error}</p>
            )}
            <AlertList alerts={r.paxgBuffer.alerts} />
          </section>

          {/* Solvency Snapshots */}
          <section className="border border-dl-border p-4">
            <SectionHeading label="Solvency Snapshots (72h)" ok={r.solvencySnapshots.ok} />
            <DataRow label="Snapshots in window" value={r.solvencySnapshots.totalSnapshots72h} />
            <DataRow label="Latest at"           value={r.solvencySnapshots.latestSnapshotAt ? new Date(r.solvencySnapshots.latestSnapshotAt).toUTCString() : '—'} />
            <DataRow label="Age (min)"           value={r.solvencySnapshots.latestSnapshotAgeMinutes ?? '—'} />
            <DataRow label="Max age (min)"       value={r.solvencySnapshots.maxAgeMinutes} />
            <DataRow label="Checksum"            value={<span className="text-[10px]">{r.solvencySnapshots.latestChecksum?.slice(0, 16) ?? '—'}…</span>} />
            {r.solvencySnapshots.error && (
              <p className="text-xs text-red-700 font-mono mt-2">{r.solvencySnapshots.error}</p>
            )}
            <AlertList alerts={r.solvencySnapshots.alerts} />
          </section>

          {/* Mint / Redeem Activity */}
          <section className="border border-dl-border p-4">
            <SectionHeading
              label="Mint / Redeem Activity (72h)"
              ok={r.mintRedeemActivity.failedCount === 0 && r.mintRedeemActivity.stuckCount === 0}
            />
            <DataRow label="Total requests"  value={r.mintRedeemActivity.totalRequests72h} />
            <DataRow label="Pending"         value={r.mintRedeemActivity.pendingCount} />
            <DataRow label="Processing"      value={r.mintRedeemActivity.processingCount} />
            <DataRow label="Fulfilled"       value={r.mintRedeemActivity.fulfilledCount} />
            <DataRow label="Failed"          value={r.mintRedeemActivity.failedCount} />
            <DataRow label="Stuck (>2h)"     value={r.mintRedeemActivity.stuckCount} />
            {Object.keys(r.mintRedeemActivity.byStatus).length > 0 && (
              <div className="mt-2 text-[10px] font-mono text-dl-muted">
                {Object.entries(r.mintRedeemActivity.byStatus).map(([s, n]) => (
                  <span key={s} className="mr-3">{s}: {n}</span>
                ))}
              </div>
            )}
            <AlertList alerts={r.mintRedeemActivity.alerts} />
          </section>

        </div>

        {/* Settlement Instructions */}
        <section className="border border-dl-border p-4 mb-6">
          <SectionHeading
            label="Settlement Instructions"
            ok={
              r.settlementInstructions.stuckSubmitted72h === 0 &&
              r.settlementInstructions.failedCount72h === 0 &&
              r.settlementInstructions.quarantinedWebhooks72h === 0
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            <div className="border border-dl-border p-2">
              <div className="text-[10px] uppercase tracking-wide text-dl-muted">Total (72h)</div>
              <div className="font-mono text-xl mt-1">{r.settlementInstructions.totalInstructions72h}</div>
            </div>
            <div className="border border-dl-border p-2">
              <div className="text-[10px] uppercase tracking-wide text-dl-muted">Failed (72h)</div>
              <div className={`font-mono text-xl mt-1 ${r.settlementInstructions.failedCount72h > 0 ? 'text-red-700' : ''}`}>
                {r.settlementInstructions.failedCount72h}
              </div>
            </div>
            <div className="border border-dl-border p-2">
              <div className="text-[10px] uppercase tracking-wide text-dl-muted">Stuck SUBMITTED (72h)</div>
              <div className={`font-mono text-xl mt-1 ${r.settlementInstructions.stuckSubmitted72h > 0 ? 'text-red-700' : ''}`}>
                {r.settlementInstructions.stuckSubmitted72h}
              </div>
            </div>
            <div className="border border-dl-border p-2">
              <div className="text-[10px] uppercase tracking-wide text-dl-muted">Stuck SUBMITTED (all)</div>
              <div className="font-mono text-xl mt-1">{r.settlementInstructions.stuckSubmittedGlobal}</div>
            </div>
            <div className="border border-dl-border p-2">
              <div className="text-[10px] uppercase tracking-wide text-dl-muted">Quarantined Webhooks</div>
              <div className={`font-mono text-xl mt-1 ${r.settlementInstructions.quarantinedWebhooks72h > 0 ? 'text-red-700' : ''}`}>
                {r.settlementInstructions.quarantinedWebhooks72h}
              </div>
            </div>
            <div className="border border-dl-border p-2">
              <div className="text-[10px] uppercase tracking-wide text-dl-muted">Pre-Launch ACH</div>
              <div className="font-mono text-xl mt-1 text-dl-muted">
                {r.settlementInstructions.knownPreLaunchAch ? '1 (known)' : '0'}
              </div>
            </div>
          </div>
          {r.settlementInstructions.knownPreLaunchAch && (
            <p className="text-xs font-mono text-dl-muted mb-2">
              Note: 1 SUBMITTED ACH instruction exists from before 2026-04-30 (pre-launch test). ACH is a deferred rail.
              This is a known artifact and does not affect the crypto-native launch.
            </p>
          )}
          {Object.keys(r.settlementInstructions.byStatus).length > 0 && (
            <div className="text-[10px] font-mono text-dl-muted mb-1">
              {Object.entries(r.settlementInstructions.byStatus).map(([s, n]) => (
                <span key={s} className="mr-3">{s}: {n}</span>
              ))}
            </div>
          )}
          <AlertList alerts={r.settlementInstructions.alerts} />
        </section>

        {/* Launch Invariants */}
        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-1">Launch Invariants</h2>
          <p className="text-xs text-dl-muted mb-4">
            Core protocol guarantees that must hold at all times during and after the AXAU crypto-native launch.
          </p>
          {r.launchInvariants.map((inv) => (
            <InvariantRow key={inv.name} inv={inv} />
          ))}
        </section>

        {/* Footer links */}
        <div className="flex gap-4 text-xs">
          <Link href="/api/operator/axau-stabilization-report" className="underline text-dl-muted" target="_blank">
            Raw JSON report →
          </Link>
          <Link href="/operator/reserve" className="underline text-dl-muted">
            Reserve console →
          </Link>
          <Link href="/operator" className="underline text-dl-muted">
            ← Operator console
          </Link>
        </div>

      </div>
    </OperatorConsoleLayout>
  );
}
