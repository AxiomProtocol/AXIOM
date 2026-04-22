import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import { db } from '../../../server/db';
import { capSettlementInstructions } from '../../../shared/capInfraSchema';
import { desc, eq, and, type SQL } from 'drizzle-orm';

interface Item {
  id: string;
  status: string;
  intent: string;
  assetId: string | null;
  amount: string | null;
  createdAt: string;
}
interface Props { items: Item[]; status: string | null; }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;
  const status = typeof ctx.query.status === 'string' ? ctx.query.status : null;
  const conds: SQL[] = [];
  if (status) conds.push(eq(capSettlementInstructions.status, status));
  const q = db
    .select()
    .from(capSettlementInstructions)
    .orderBy(desc(capSettlementInstructions.createdAt), desc(capSettlementInstructions.id))
    .limit(100);
  const rows = conds.length ? await q.where(and(...conds)) : await q;
  return {
    props: {
      status,
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        intent: r.actionType ?? null,
        assetId: r.assetId,
        amount: r.amount ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  };
};

const STATUSES = ['', 'CREATED', 'AUTHORIZED', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'CANCELLED'];

export default function InstructionsPage({ items, status }: Props) {
  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator" className="text-sm underline">← Back to console</Link>
        </div>
        <h1 className="text-2xl font-serif mb-4">Settlement Instructions</h1>
        <div className="mb-4 flex gap-2 flex-wrap text-xs uppercase tracking-wide">
          {STATUSES.map((s) => (
            <Link
              key={s || 'ALL'}
              href={s ? `/operator/instructions?status=${s}` : '/operator/instructions'}
              className={`border border-dl-border px-2 py-1 ${
                (s || null) === (status || null) ? 'bg-dl-fg text-dl-bg' : ''
              }`}
            >
              {s || 'ALL'}
            </Link>
          ))}
        </div>
        <table className="w-full text-sm border border-dl-border">
          <thead className="bg-dl-muted/10">
            <tr>
              <th className="text-left px-3 py-2 font-mono text-xs">ID</th>
              <th className="text-left px-3 py-2 font-mono text-xs">Status</th>
              <th className="text-left px-3 py-2 font-mono text-xs">Intent</th>
              <th className="text-left px-3 py-2 font-mono text-xs">Asset</th>
              <th className="text-right px-3 py-2 font-mono text-xs">Amount</th>
              <th className="text-left px-3 py-2 font-mono text-xs">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-dl-muted">No instructions.</td>
              </tr>
            ) : (
              items.map((i) => (
                <tr key={i.id} className="border-t border-dl-border">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link href={`/operator/instructions/${i.id}`} className="underline">
                      {i.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{i.status}</td>
                  <td className="px-3 py-2 font-mono text-xs">{i.intent}</td>
                  <td className="px-3 py-2 font-mono text-xs">{i.assetId ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-right">{i.amount ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{i.createdAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DesignLawLayout>
  );
}
