import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import { db } from '../../../server/db';
import { capWebhookEvents } from '../../../shared/capInfraSchema';
import { desc, or, eq, and } from 'drizzle-orm';

interface Item {
  id: string;
  adapterKey: string;
  externalEventId: string | null;
  status: string;
  signatureVerified: boolean;
  attempts: number;
  receivedAt: string;
  reclassifiedBy: string | null;
  reclassificationReason: string | null;
  lastError: string | null;
}
interface Props { items: Item[]; adapterFilter: string }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;
  const adapterFilter = typeof ctx.query.adapter === 'string' ? ctx.query.adapter.toUpperCase() : 'all';
  const statusCond = or(eq(capWebhookEvents.status, 'QUARANTINED'), eq(capWebhookEvents.status, 'REJECTED'))!;
  const where =
    adapterFilter !== 'all'
      ? and(statusCond, eq(capWebhookEvents.adapterKey, adapterFilter))!
      : statusCond;
  const rows = await db
    .select()
    .from(capWebhookEvents)
    .where(where)
    .orderBy(desc(capWebhookEvents.receivedAt))
    .limit(200);
  return {
    props: {
      adapterFilter,
      items: rows.map((r) => ({
        id: r.id,
        adapterKey: r.adapterKey,
        externalEventId: r.externalEventId,
        status: r.status,
        signatureVerified: r.signatureVerified,
        attempts: r.attempts,
        receivedAt: r.receivedAt.toISOString(),
        reclassifiedBy: r.reclassifiedBy,
        reclassificationReason: r.reclassificationReason,
        lastError: r.lastError ?? null,
      })),
    },
  };
};

export default function QuarantinePage({ items, adapterFilter }: Props) {
  const adapters = ['all', 'STELLAR', 'EVM', 'ACH', 'INTERNAL'];
  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="mb-4"><Link href="/operator" className="text-sm underline">← Back to console</Link></div>
        <h1 className="text-2xl font-serif mb-4">Quarantined Webhook Events</h1>
        <p className="text-sm text-dl-muted mb-4">
          Verification-failed and quarantined payloads. Reclassification requires a distinct
          second-actor identity and is recorded in <code className="font-mono">cap_admin_actions</code>.
        </p>
        <div className="mb-4 text-xs font-mono">
          Adapter:{' '}
          {adapters.map((a) => (
            <Link
              key={a}
              href={`/operator/webhooks/quarantine?adapter=${a}`}
              className={`mr-2 px-2 py-0.5 border ${adapterFilter === a ? 'border-dl-fg bg-dl-muted/20' : 'border-dl-border'}`}
            >
              {a}
            </Link>
          ))}
        </div>
        {items.length === 0 ? (
          <div className="border border-dl-border p-6 text-center text-dl-muted text-sm">
            No quarantined events. (Webhook adapters land in 3B; this surface is wired up
            and ready to render quarantined rows when they appear.)
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead><tr>
              <th className="text-left font-mono">Received</th>
              <th className="text-left font-mono">Adapter</th>
              <th className="text-left font-mono">External ID</th>
              <th className="text-left font-mono">Status</th>
              <th className="text-left font-mono">Sig Verified</th>
              <th className="text-right font-mono">Attempts</th>
              <th className="text-left font-mono">Last Error</th>
              <th className="text-left font-mono">Reclassified By</th>
            </tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-dl-border align-top">
                  <td className="font-mono">{i.receivedAt}</td>
                  <td className="font-mono">{i.adapterKey}</td>
                  <td className="font-mono break-all">{i.externalEventId ?? '—'}</td>
                  <td className="font-mono">{i.status}</td>
                  <td className="font-mono">{i.signatureVerified ? 'YES' : 'NO'}</td>
                  <td className="font-mono text-right">{i.attempts}</td>
                  <td className="font-mono break-all">{i.lastError ?? '—'}</td>
                  <td className="font-mono">{i.reclassifiedBy ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DesignLawLayout>
  );
}
