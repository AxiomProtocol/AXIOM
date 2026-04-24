import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import { db } from '../../../server/db';
import { capPolicyDecisions } from '../../../shared/capInfraSchema';
import { desc, eq, and, type SQL } from 'drizzle-orm';

interface Item {
  id: string;
  userId: string;
  assetId: string;
  actionType: string;
  allowed: boolean;
  reasonCode: string;
  policyVersion: string;
  createdAt: string;
}
interface Props { items: Item[]; deniedOnly: boolean; }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;
  const deniedOnly = ctx.query.allowed !== 'true';
  const conds: SQL[] = [];
  if (deniedOnly) conds.push(eq(capPolicyDecisions.allowed, false));
  const q = db
    .select()
    .from(capPolicyDecisions)
    .orderBy(desc(capPolicyDecisions.createdAt))
    .limit(200);
  const rows = conds.length ? await q.where(and(...conds)) : await q;
  return {
    props: {
      deniedOnly,
      items: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        assetId: r.assetId,
        actionType: r.actionType,
        allowed: r.allowed,
        reasonCode: r.reasonCode,
        policyVersion: r.policyVersion,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  };
};

export default function PolicyDecisionsPage({ items, deniedOnly }: Props) {
  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="mb-4"><Link href="/operator" className="text-sm underline">← Back to console</Link></div>
        <h1 className="text-2xl font-serif mb-4">Policy Decisions</h1>
        <div className="mb-4 flex gap-2 text-xs uppercase tracking-wide">
          <Link
            href="/operator/policy/decisions"
            className={`border border-dl-border px-2 py-1 ${deniedOnly ? 'bg-dl-fg text-dl-bg' : ''}`}
          >Denied only</Link>
          <Link
            href="/operator/policy/decisions?allowed=true"
            className={`border border-dl-border px-2 py-1 ${!deniedOnly ? 'bg-dl-fg text-dl-bg' : ''}`}
          >All</Link>
        </div>
        <table className="w-full text-xs">
          <thead><tr>
            <th className="text-left font-mono">Time</th>
            <th className="text-left font-mono">User</th>
            <th className="text-left font-mono">Asset</th>
            <th className="text-left font-mono">Action</th>
            <th className="text-left font-mono">Allowed</th>
            <th className="text-left font-mono">Reason</th>
            <th className="text-left font-mono">Version</th>
          </tr></thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-6 text-dl-muted">No decisions match.</td></tr>
            ) : items.map((i) => (
              <tr key={i.id} className={`border-t border-dl-border ${i.allowed ? '' : 'bg-red-50/40'}`}>
                <td className="font-mono">{i.createdAt}</td>
                <td className="font-mono">{i.userId}</td>
                <td className="font-mono">{i.assetId}</td>
                <td className="font-mono">{i.actionType}</td>
                <td className="font-mono">{i.allowed ? 'YES' : 'NO'}</td>
                <td className="font-mono">{i.reasonCode}</td>
                <td className="font-mono">{i.policyVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DesignLawLayout>
  );
}
