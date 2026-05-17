import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';

interface TreasuryTx {
  id: string;
  treasuryAccountId: string | null;
  direction: string;
  assetSymbol: string | null;
  amount: number;
  usdValue: number;
  externalTxId: string | null;
  txHash: string | null;
  sourceProvider: string | null;
  sourceType: string | null;
  counterparty: string | null;
  purpose: string | null;
  classification: string | null;
  occurredAt: string | null;
  createdAt: string;
}

interface Props {
  transactions: TreasuryTx[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
  filters: {
    provider: string;
    asset: string;
    classification: string;
    direction: string;
  };
  error: string | null;
  fetchedAt: string;
}

const DIRECTION_BADGE: Record<string, string> = {
  inflow:  'text-dl-forest',
  outflow: 'text-red-700',
  internal: 'text-dl-gray',
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtUsd(n: number) { return `$${fmt(n)}`; }
function shortHash(h: string | null) {
  if (!h) return '—';
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export default function TreasuryTransactionsPage({
  transactions, total, hasMore, offset, limit, filters, error, fetchedAt,
}: Props) {
  const page = Math.floor(offset / limit) + 1;

  function buildUrl(params: Record<string, string>) {
    const q = new URLSearchParams({
      provider: filters.provider,
      asset: filters.asset,
      classification: filters.classification,
      direction: filters.direction,
      limit: String(limit),
      ...params,
    });
    return `/operator/treasury/transactions?${q.toString()}`;
  }

  return (
    <OperatorConsoleLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-dl-navy">Treasury Transactions</h1>
            <p className="text-sm font-mono text-dl-gray mt-1">
              All recorded inflows, outflows, and internal transfers across treasury accounts.
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

        {/* Filters (GET-based) */}
        <form method="GET" className="border border-dl-border p-4">
          <p className="text-xs font-mono text-dl-gray uppercase mb-3">Filters</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-mono text-dl-gray mb-1">Provider</label>
              <input
                name="provider" defaultValue={filters.provider}
                className="w-full border border-dl-border p-1.5 font-mono text-sm"
                placeholder="e.g. bitgo"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-dl-gray mb-1">Asset</label>
              <input
                name="asset" defaultValue={filters.asset}
                className="w-full border border-dl-border p-1.5 font-mono text-sm"
                placeholder="e.g. USDC"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-dl-gray mb-1">Classification</label>
              <input
                name="classification" defaultValue={filters.classification}
                className="w-full border border-dl-border p-1.5 font-mono text-sm"
                placeholder="e.g. yield"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-dl-gray mb-1">Direction</label>
              <select
                name="direction" defaultValue={filters.direction}
                className="w-full border border-dl-border p-1.5 font-mono text-sm bg-white"
              >
                <option value="">All</option>
                <option value="inflow">Inflow</option>
                <option value="outflow">Outflow</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          </div>
          <input type="hidden" name="offset" value="0" />
          <input type="hidden" name="limit" value={String(limit)} />
          <button
            type="submit"
            className="mt-3 bg-dl-navy text-white text-xs font-mono px-4 py-1.5 uppercase tracking-wider"
          >
            Apply
          </button>
        </form>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Showing', value: `${transactions.length} of ${total}` },
            { label: 'Inflows', value: transactions.filter((t) => t.direction === 'inflow').length },
            { label: 'Outflows', value: transactions.filter((t) => t.direction === 'outflow').length },
            { label: 'Page', value: page },
          ].map(({ label, value }) => (
            <div key={label} className="border border-dl-border p-3">
              <p className="text-xs font-mono text-dl-gray uppercase">{label}</p>
              <p className="text-xl font-mono text-dl-navy mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {transactions.length === 0 ? (
          <div className="border border-dl-border p-6 text-center text-sm font-mono text-dl-gray">
            No transactions found for the current filters.
          </div>
        ) : (
          <div className="border border-dl-border overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead className="bg-dl-bg border-b border-dl-border">
                <tr>
                  {['Date', 'Direction', 'Asset', 'Amount', 'USD Value', 'Provider', 'Classification', 'Tx Hash'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs text-dl-gray uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={tx.id} className={i % 2 === 0 ? 'bg-white' : 'bg-dl-bg'}>
                    <td className="px-3 py-2 text-dl-gray text-xs whitespace-nowrap">
                      {tx.occurredAt ? new Date(tx.occurredAt).toLocaleDateString() : '—'}
                    </td>
                    <td className={`px-3 py-2 font-semibold uppercase text-xs whitespace-nowrap ${DIRECTION_BADGE[tx.direction] ?? 'text-dl-gray'}`}>
                      {tx.direction}
                    </td>
                    <td className="px-3 py-2 text-dl-navy whitespace-nowrap">{tx.assetSymbol ?? '—'}</td>
                    <td className="px-3 py-2 text-dl-navy text-right whitespace-nowrap">{fmt(tx.amount)}</td>
                    <td className="px-3 py-2 text-dl-navy text-right whitespace-nowrap">{fmtUsd(tx.usdValue)}</td>
                    <td className="px-3 py-2 text-dl-gray whitespace-nowrap">{tx.sourceProvider ?? '—'}</td>
                    <td className="px-3 py-2 text-dl-gray whitespace-nowrap">{tx.classification ?? '—'}</td>
                    <td className="px-3 py-2 text-dl-gray text-xs whitespace-nowrap" title={tx.txHash ?? ''}>
                      {tx.txHash ? (
                        <a
                          href={`https://arbiscan.io/tx/${tx.txHash}`}
                          target="_blank" rel="noopener noreferrer"
                          className="underline"
                        >
                          {shortHash(tx.txHash)}
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center gap-4 text-sm font-mono">
          {offset > 0 && (
            <Link
              href={buildUrl({ offset: String(Math.max(0, offset - limit)) })}
              className="text-dl-forest underline"
            >
              ← Previous
            </Link>
          )}
          <span className="text-dl-gray">Page {page} · {total} total</span>
          {hasMore && (
            <Link
              href={buildUrl({ offset: String(offset + limit) })}
              className="text-dl-forest underline"
            >
              Next →
            </Link>
          )}
        </div>

        {/* Quick links */}
        <section className="border-t border-dl-border pt-4">
          <div className="flex flex-wrap gap-3 text-sm font-mono">
            <Link href="/operator/treasury/accounts" className="text-dl-forest underline">Accounts</Link>
            <Link href="/operator/treasury/allocations" className="text-dl-forest underline">Allocations</Link>
            <Link href="/operator/treasury/vault" className="text-dl-forest underline">Vault Dashboard</Link>
            <a href="/api/treasury/transactions" target="_blank" rel="noopener noreferrer" className="text-dl-gray underline">API: /treasury/transactions</a>
          </div>
        </section>

        <p className="text-xs font-mono text-dl-gray">Fetched {new Date(fetchedAt).toISOString()}</p>
      </div>
    </OperatorConsoleLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { req, query } = ctx;
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const fetchedAt = new Date().toISOString();

  const provider       = typeof query.provider       === 'string' ? query.provider       : '';
  const asset          = typeof query.asset          === 'string' ? query.asset          : '';
  const classification = typeof query.classification === 'string' ? query.classification : '';
  const direction      = typeof query.direction      === 'string' ? query.direction      : '';
  const limit          = Math.min(100, Math.max(10, parseInt(String(query.limit  ?? '50'),  10)));
  const offset         =                             Math.max(0,  parseInt(String(query.offset ?? '0'),   10));

  const filters = { provider, asset, classification, direction };

  try {
    const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host  = req.headers.host ?? 'localhost:3000';
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      ...(provider       && { provider }),
      ...(asset          && { asset }),
      ...(classification && { classification }),
      ...(direction      && { direction }),
    });
    const r    = await fetch(`${proto}://${host}/api/treasury/transactions?${params}`);
    const json = await r.json();
    return {
      props: {
        transactions: json.data    ?? [],
        total:        json.total   ?? 0,
        hasMore:      json.hasMore ?? false,
        offset, limit, filters,
        error:     json.success === false ? (json.error ?? 'Unknown error') : null,
        fetchedAt,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      props: {
        transactions: [], total: 0, hasMore: false,
        offset, limit, filters, error: msg, fetchedAt,
      },
    };
  }
};
