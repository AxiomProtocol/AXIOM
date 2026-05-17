import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';

interface AllocationRow {
  bucketName: string;
  targetPct: number;
  actualPct: number;
  variancePct: number;
  usdValue: number;
  status: string;
  ledgerUsdValue: number;
  ledgerTxCount: number;
  policyStatus: string;
}

interface Props {
  allocations: AllocationRow[];
  count: number;
  error: string | null;
  fetchedAt: string;
}

const POLICY_BADGE: Record<string, string> = {
  within_range: 'text-dl-forest',
  over_target:  'text-yellow-700',
  under_target: 'text-yellow-700',
  critical:     'text-red-700',
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n: number) { return `${n >= 0 ? '+' : ''}${fmt(n)}%`; }
function fmtUsd(n: number) { return `$${fmt(n)}`; }

export default function TreasuryAllocationsPage({ allocations, count, error, fetchedAt }: Props) {
  const totalUsd = allocations.reduce((s, a) => s + a.usdValue, 0);

  return (
    <OperatorConsoleLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-dl-navy">Treasury Allocations</h1>
            <p className="text-sm font-mono text-dl-gray mt-1">
              Target vs. actual bucket allocation policy with variance tracking.
            </p>
          </div>
          <Link href="/operator/treasury/vault" className="text-xs font-mono text-dl-forest underline">
            ← Back to Vault
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-400 bg-red-50 p-3 text-xs font-mono text-red-700">
            {error}
          </div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Buckets', value: count },
            { label: 'Total AUM (USD)', value: fmtUsd(totalUsd) },
            { label: 'In Policy', value: allocations.filter((a) => a.policyStatus === 'within_range').length },
            { label: 'Out of Policy', value: allocations.filter((a) => a.policyStatus !== 'within_range').length },
          ].map(({ label, value }) => (
            <div key={label} className="border border-dl-border p-3">
              <p className="text-xs font-mono text-dl-gray uppercase">{label}</p>
              <p className="text-xl font-mono text-dl-navy mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {allocations.length === 0 ? (
          <div className="border border-dl-border p-6 text-center text-sm font-mono text-dl-gray">
            No allocation data found. Actuals will appear after the first policy sync.
          </div>
        ) : (
          <div className="border border-dl-border overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead className="bg-dl-bg border-b border-dl-border">
                <tr>
                  {['Bucket', 'Target %', 'Actual %', 'Variance', 'USD Value', 'Ledger USD', 'Ledger Txns', 'Policy'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs text-dl-gray uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allocations.map((a, i) => (
                  <tr key={a.bucketName} className={i % 2 === 0 ? 'bg-white' : 'bg-dl-bg'}>
                    <td className="px-3 py-2 text-dl-navy font-semibold whitespace-nowrap">{a.bucketName}</td>
                    <td className="px-3 py-2 text-dl-navy">{fmt(a.targetPct)}%</td>
                    <td className="px-3 py-2 text-dl-navy">{fmt(a.actualPct)}%</td>
                    <td className={`px-3 py-2 font-semibold ${a.variancePct > 0 ? 'text-yellow-700' : a.variancePct < 0 ? 'text-blue-700' : 'text-dl-gray'}`}>
                      {fmtPct(a.variancePct)}
                    </td>
                    <td className="px-3 py-2 text-dl-navy">{fmtUsd(a.usdValue)}</td>
                    <td className="px-3 py-2 text-dl-gray">{fmtUsd(a.ledgerUsdValue)}</td>
                    <td className="px-3 py-2 text-dl-gray text-center">{a.ledgerTxCount}</td>
                    <td className={`px-3 py-2 text-xs font-semibold uppercase ${POLICY_BADGE[a.policyStatus] ?? 'text-dl-gray'}`}>
                      {a.policyStatus.replace(/_/g, ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-dl-border bg-dl-bg">
                <tr>
                  <td className="px-3 py-2 text-xs font-mono text-dl-gray font-semibold" colSpan={4}>Total</td>
                  <td className="px-3 py-2 font-mono font-semibold text-dl-navy">{fmtUsd(totalUsd)}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-dl-gray">
                    {fmtUsd(allocations.reduce((s, a) => s + a.ledgerUsdValue, 0))}
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-dl-gray text-center">
                    {allocations.reduce((s, a) => s + a.ledgerTxCount, 0)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Quick links */}
        <section className="border-t border-dl-border pt-4">
          <div className="flex flex-wrap gap-3 text-sm font-mono">
            <Link href="/operator/treasury/accounts" className="text-dl-forest underline">Accounts</Link>
            <Link href="/operator/treasury/transactions" className="text-dl-forest underline">Transactions</Link>
            <Link href="/operator/treasury/vault" className="text-dl-forest underline">Vault Dashboard</Link>
            <a href="/api/treasury/allocations" target="_blank" rel="noopener noreferrer" className="text-dl-gray underline">API: /treasury/allocations</a>
          </div>
        </section>

        <p className="text-xs font-mono text-dl-gray">Fetched {new Date(fetchedAt).toISOString()}</p>
      </div>
    </OperatorConsoleLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { req } = ctx;
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const fetchedAt = new Date().toISOString();

  try {
    const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host  = req.headers.host ?? 'localhost:3000';
    const r = await fetch(`${proto}://${host}/api/treasury/allocations`);
    const json = await r.json();
    return {
      props: {
        allocations: json.data ?? [],
        count:       json.count ?? 0,
        error:       json.success === false ? (json.error ?? 'Unknown error') : null,
        fetchedAt,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { props: { allocations: [], count: 0, error: msg, fetchedAt } };
  }
};
