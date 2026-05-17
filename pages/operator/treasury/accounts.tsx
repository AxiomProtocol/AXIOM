import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';

interface TreasuryAccount {
  id: string;
  provider: string;
  accountType: string;
  displayName: string;
  legalEntityName: string | null;
  externalAccountId: string | null;
  assetSymbol: string | null;
  custodyModel: string | null;
  status: string;
  trustSource: string | null;
  metadata: Record<string, unknown> | null;
  updatedAt: string | null;
}

interface Props {
  accounts: TreasuryAccount[];
  count: number;
  error: string | null;
  fetchedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:   'text-dl-forest',
  inactive: 'text-dl-gray',
  pending:  'text-yellow-700',
  closed:   'text-red-700',
};

export default function TreasuryAccountsPage({ accounts, count, error, fetchedAt }: Props) {
  return (
    <OperatorConsoleLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-dl-navy">Treasury Accounts</h1>
            <p className="text-sm font-mono text-dl-gray mt-1">
              Registered custody and settlement accounts across all providers.
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
            { label: 'Total Accounts', value: count },
            { label: 'Active', value: accounts.filter((a) => a.status === 'active').length },
            { label: 'Providers', value: new Set(accounts.map((a) => a.provider)).size },
            { label: 'As Of', value: new Date(fetchedAt).toLocaleTimeString() },
          ].map(({ label, value }) => (
            <div key={label} className="border border-dl-border p-3">
              <p className="text-xs font-mono text-dl-gray uppercase">{label}</p>
              <p className="text-xl font-mono text-dl-navy mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {accounts.length === 0 ? (
          <div className="border border-dl-border p-6 text-center text-sm font-mono text-dl-gray">
            No accounts found. Seed partner integrations to populate this list.
          </div>
        ) : (
          <div className="border border-dl-border overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead className="bg-dl-bg border-b border-dl-border">
                <tr>
                  {['Provider', 'Display Name', 'Type', 'Asset', 'Custody', 'Status', 'Updated'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs text-dl-gray uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? 'bg-white' : 'bg-dl-bg'}>
                    <td className="px-3 py-2 text-dl-navy font-semibold whitespace-nowrap">{a.provider}</td>
                    <td className="px-3 py-2 text-dl-navy max-w-[200px] truncate" title={a.displayName}>{a.displayName}</td>
                    <td className="px-3 py-2 text-dl-gray whitespace-nowrap">{a.accountType}</td>
                    <td className="px-3 py-2 text-dl-navy">{a.assetSymbol ?? '—'}</td>
                    <td className="px-3 py-2 text-dl-gray">{a.custodyModel ?? '—'}</td>
                    <td className={`px-3 py-2 font-semibold uppercase text-xs ${STATUS_COLORS[a.status] ?? 'text-dl-gray'}`}>
                      {a.status}
                    </td>
                    <td className="px-3 py-2 text-dl-gray whitespace-nowrap text-xs">
                      {a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick links */}
        <section className="border-t border-dl-border pt-4">
          <div className="flex flex-wrap gap-3 text-sm font-mono">
            <Link href="/operator/treasury/allocations" className="text-dl-forest underline">Allocations</Link>
            <Link href="/operator/treasury/transactions" className="text-dl-forest underline">Transactions</Link>
            <Link href="/operator/treasury/vault" className="text-dl-forest underline">Vault Dashboard</Link>
            <a href="/api/treasury/accounts" target="_blank" rel="noopener noreferrer" className="text-dl-gray underline">API: /treasury/accounts</a>
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
    const r = await fetch(`${proto}://${host}/api/treasury/accounts`);
    const json = await r.json();
    return {
      props: {
        accounts:  json.data ?? [],
        count:     json.count ?? 0,
        error:     json.success === false ? (json.error ?? 'Unknown error') : null,
        fetchedAt,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { props: { accounts: [], count: 0, error: msg, fetchedAt } };
  }
};
