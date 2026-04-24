import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { requireOperatorCookie } from '../../lib/capinfra/operatorAuth';
import { db } from '../../server/db';
import {
  capSettlementInstructions,
  capPolicyDecisions,
  capWebhookEvents,
  capNotifications,
  capReserveHoldingsSnapshots,
  capCardDeposits,
} from '../../shared/capInfraSchema';
import { desc, eq, and, inArray, sql } from 'drizzle-orm';
import { getActiveSolvencyMode } from '../../lib/capinfra/reserve/solvencyMode';

interface DashboardProps {
  counts: {
    instructionsTotal: number;
    deniedDecisions: number;
    quarantinedWebhooks: number;
    unreadNotifications: number;
    cardDepositsInFlight: number;
  };
  mode: { mode: string; version: string; isBootstrap: boolean };
  lastSnapshot: { id: string; checksum: string; asOf: string } | null;
}

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const [[instr], [denied], [quar], [unread], [cardDepInFlight], snaps] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(capSettlementInstructions),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(capPolicyDecisions)
      .where(eq(capPolicyDecisions.allowed, false)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(capWebhookEvents)
      .where(eq(capWebhookEvents.status, 'QUARANTINED')),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(capNotifications)
      .where(sql`${capNotifications.readAt} IS NULL`),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(capCardDeposits)
      .where(inArray(capCardDeposits.status, ['PENDING', 'PAYOUT_INITIATED'])),
    db
      .select()
      .from(capReserveHoldingsSnapshots)
      .orderBy(desc(capReserveHoldingsSnapshots.asOf))
      .limit(1),
  ]);

  const mode = await getActiveSolvencyMode();

  return {
    props: {
      counts: {
        instructionsTotal: Number(instr?.n ?? 0),
        deniedDecisions: Number(denied?.n ?? 0),
        quarantinedWebhooks: Number(quar?.n ?? 0),
        unreadNotifications: Number(unread?.n ?? 0),
        cardDepositsInFlight: Number(cardDepInFlight?.n ?? 0),
      },
      mode: { mode: mode.mode, version: mode.version, isBootstrap: mode.isBootstrap },
      lastSnapshot: snaps[0]
        ? { id: snaps[0].id, checksum: snaps[0].checksum, asOf: snaps[0].asOf.toISOString() }
        : null,
    },
  };
};

const cards: Array<{ href: string; label: string; getValue: (p: DashboardProps) => string }> = [
  { href: '/operator/instructions', label: 'Settlement instructions', getValue: (p) => String(p.counts.instructionsTotal) },
  { href: '/operator/policy/decisions', label: 'Policy denials', getValue: (p) => String(p.counts.deniedDecisions) },
  { href: '/operator/webhooks/quarantine', label: 'Quarantined webhooks', getValue: (p) => String(p.counts.quarantinedWebhooks) },
  { href: '/operator/notifications', label: 'Unread notifications', getValue: (p) => String(p.counts.unreadNotifications) },
];

const adapters: Array<{ href: string; label: string; mode: string }> = [
  { href: '/operator/adapters/stellar', label: 'Stellar', mode: 'DRY_RUN' },
];

export default function OperatorDashboard(props: DashboardProps) {
  const isHalt = props.mode.mode === 'MANUAL_INTERVENTION';
  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-serif">Operator Console</h1>
          <form
            method="post"
            action="/api/capinfra/operator/auth/logout"
            onSubmit={async (e) => {
              e.preventDefault();
              await fetch('/api/capinfra/operator/auth/logout', { method: 'POST' });
              window.location.href = '/operator/login';
            }}
          >
            <button type="submit" className="text-xs uppercase tracking-wide border border-dl-border px-3 py-1">
              Sign out
            </button>
          </form>
        </div>

        {isHalt ? (
          <div className="border-2 border-red-600 bg-red-50 dark:bg-red-950/30 p-4 mb-6">
            <div className="text-red-700 dark:text-red-400 font-serif text-lg uppercase tracking-wide">
              MANUAL INTERVENTION HALT ACTIVE
            </div>
            <div className="text-sm font-mono mt-2">
              All policy actions are denied with reason <code>MANUAL_INTERVENTION_HALT</code>.
              Solvency mode: {props.mode.mode}@{props.mode.version}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="border border-dl-border p-4 hover:bg-dl-muted/10"
            >
              <div className="text-xs uppercase tracking-wide text-dl-muted">{c.label}</div>
              <div className="text-3xl font-mono mt-2">{c.getValue(props)}</div>
            </Link>
          ))}
        </div>

        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Reserve</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-dl-muted">Mode</dt>
              <dd className="font-mono">{props.mode.mode}{props.mode.isBootstrap ? ' (bootstrap)' : ''}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-dl-muted">Mode version</dt>
              <dd className="font-mono">{props.mode.version}</dd>
            </div>
            {props.lastSnapshot ? (
              <>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-dl-muted">Last snapshot</dt>
                  <dd className="font-mono text-xs break-all">{props.lastSnapshot.id}</dd>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-xs uppercase tracking-wide text-dl-muted">Checksum</dt>
                  <dd className="font-mono text-xs break-all">{props.lastSnapshot.checksum}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-dl-muted">As of</dt>
                  <dd className="font-mono">{props.lastSnapshot.asOf}</dd>
                </div>
              </>
            ) : (
              <div className="col-span-2 sm:col-span-3 text-dl-muted text-sm">No snapshots yet.</div>
            )}
          </dl>
          <div className="mt-3">
            <Link href="/operator/reserve" className="text-sm underline">Open reserve dashboard →</Link>
          </div>
        </section>

        {props.counts.cardDepositsInFlight > 0 ? (
          <section className="border border-yellow-700 bg-yellow-50 text-yellow-900 p-4 mb-6">
            <h2 className="font-serif text-lg mb-2">Treasury — drain in progress</h2>
            <p className="text-xs font-mono mb-3">
              {props.counts.cardDepositsInFlight} deprecated Stripe card-deposit
              row(s) still in PENDING or PAYOUT_INITIATED. The page is hidden
              from console navigation once all rows reach terminal status; the
              direct URL remains available for forensic lookup.
            </p>
            <Link href="/operator/treasury/card-deposits" className="text-sm underline">
              Open card deposits drain console →
            </Link>
          </section>
        ) : null}

        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif text-lg mb-3">Oracles</h2>
          <p className="text-sm text-dl-muted mb-3">
            Review oracle fallback events when a primary price feed is unavailable.
          </p>
          <Link href="/admin/oracle-fallbacks" className="text-sm underline">
            Open oracle fallback dashboard →
          </Link>
        </section>

        <section className="border border-dl-border p-4">
          <h2 className="font-serif text-lg mb-3">Adapters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {adapters.map((a) => (
              <Link key={a.href} href={a.href} className="border border-dl-border p-3 hover:bg-dl-muted/10">
                <div className="flex items-baseline justify-between">
                  <span className="font-serif">{a.label}</span>
                  <span className="text-[10px] uppercase tracking-wide border border-amber-300 bg-amber-100 text-amber-900 px-1.5 py-0.5">{a.mode}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </DesignLawLayout>
  );
}
