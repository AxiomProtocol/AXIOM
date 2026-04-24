import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { requireOperatorCookie } from '../../lib/capinfra/operatorAuth';
import { db } from '../../server/db';
import {
  capAssets,
  capReserveHoldingsSnapshots,
  capReserveHoldings,
} from '../../shared/capInfraSchema';
import { desc, sql } from 'drizzle-orm';
import { getActiveSolvencyMode } from '../../lib/capinfra/reserve/solvencyMode';

interface Headroom { assetId: string; symbol: string | null; gross: string; debited: string; available: string; }
interface Props {
  mode: { mode: string; version: string; isBootstrap: boolean };
  headrooms: Headroom[];
  recentSnapshots: Array<{ id: string; checksum: string; asOf: string; lineCount: number; mode: string }>;
  loadError: string | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  try {
    const [mode, assets, hRows, snaps] = await Promise.all([
      getActiveSolvencyMode(),
      db.select().from(capAssets).limit(200),
      db
        .select({
          assetId: capReserveHoldings.assetId,
          direction: capReserveHoldings.direction,
          total: sql<string>`COALESCE(SUM(${capReserveHoldings.amount}), 0)::text`,
        })
        .from(capReserveHoldings)
        .groupBy(capReserveHoldings.assetId, capReserveHoldings.direction),
      db
        .select()
        .from(capReserveHoldingsSnapshots)
        .orderBy(desc(capReserveHoldingsSnapshots.asOf))
        .limit(20),
    ]);

    const symByAsset = new Map(assets.map((a) => [a.id, a.symbol ?? null] as const));
    const acc = new Map<string, { gross: number; debited: number }>();
    for (const r of hRows) {
      const cur = acc.get(r.assetId) ?? { gross: 0, debited: 0 };
      if (r.direction === 'CREDIT') cur.gross += Number(r.total);
      else if (r.direction === 'DEBIT') cur.debited += Number(r.total);
      acc.set(r.assetId, cur);
    }
    const headrooms: Headroom[] = [];
    for (const [assetId, v] of acc.entries()) {
      headrooms.push({
        assetId,
        symbol: symByAsset.get(assetId) ?? null,
        gross: v.gross.toString(),
        debited: v.debited.toString(),
        available: (v.gross - v.debited).toString(),
      });
    }
    headrooms.sort((a, b) => a.assetId < b.assetId ? -1 : 1);

    return {
      props: {
        mode: { mode: mode.mode, version: mode.version, isBootstrap: mode.isBootstrap },
        headrooms,
        recentSnapshots: snaps.map((s) => ({
          id: s.id,
          checksum: s.checksum,
          asOf: s.asOf.toISOString(),
          lineCount: s.lineCount,
          mode: s.mode,
        })),
        loadError: null,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error('[operator/reserve] failed to load reserve dashboard data:', msg, err);
    return {
      props: {
        mode: { mode: 'UNKNOWN', version: 'unknown', isBootstrap: false },
        headrooms: [],
        recentSnapshots: [],
        loadError: msg,
      },
    };
  }
};

export default function ReserveDashboard({ mode, headrooms, recentSnapshots, loadError }: Props) {
  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="mb-4"><Link href="/operator" className="text-sm underline">← Back to console</Link></div>
        <h1 className="text-2xl font-serif mb-4">Reserve Dashboard</h1>
        {loadError && (
          <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-6 font-mono text-xs">
            <div className="font-serif text-sm text-dl-navy mb-1">Operational notice</div>
            <div className="text-dl-ink">
              Reserve data could not be loaded. Showing safe defaults. Operations has been notified.
              <div className="text-dl-muted mt-1 break-all">ref: {loadError}</div>
            </div>
          </div>
        )}

        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif mb-2">Solvency Mode</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm font-mono">
            <div><dt className="uppercase text-xs text-dl-muted">Mode</dt><dd>{mode.mode}{mode.isBootstrap ? ' (bootstrap)' : ''}</dd></div>
            <div><dt className="uppercase text-xs text-dl-muted">Version</dt><dd>{mode.version}</dd></div>
          </dl>
        </section>

        <section className="border border-dl-border p-4 mb-6">
          <h2 className="font-serif mb-2">Per-Asset Headroom</h2>
          {headrooms.length === 0 ? (
            <div className="text-sm text-dl-muted">No reserve activity yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr>
                <th className="text-left font-mono text-xs">Asset</th>
                <th className="text-left font-mono text-xs">Symbol</th>
                <th className="text-right font-mono text-xs">Gross</th>
                <th className="text-right font-mono text-xs">Debited</th>
                <th className="text-right font-mono text-xs">Available</th>
              </tr></thead>
              <tbody>
                {headrooms.map((h) => (
                  <tr key={h.assetId} className="border-t border-dl-border">
                    <td className="font-mono text-xs">{h.assetId}</td>
                    <td className="font-mono text-xs">{h.symbol ?? '—'}</td>
                    <td className="font-mono text-xs text-right">{h.gross}</td>
                    <td className="font-mono text-xs text-right">{h.debited}</td>
                    <td className="font-mono text-xs text-right">{h.available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="border border-dl-border p-4">
          <h2 className="font-serif mb-2">Recent Snapshots</h2>
          {recentSnapshots.length === 0 ? (
            <div className="text-sm text-dl-muted">No snapshots yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr>
                <th className="text-left font-mono">As Of</th>
                <th className="text-left font-mono">ID</th>
                <th className="text-left font-mono">Mode</th>
                <th className="text-right font-mono">Lines</th>
                <th className="text-left font-mono">Checksum</th>
              </tr></thead>
              <tbody>
                {recentSnapshots.map((s) => (
                  <tr key={s.id} className="border-t border-dl-border">
                    <td className="font-mono">{s.asOf}</td>
                    <td className="font-mono">{s.id}</td>
                    <td className="font-mono">{s.mode}</td>
                    <td className="font-mono text-right">{s.lineCount}</td>
                    <td className="font-mono break-all">{s.checksum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </DesignLawLayout>
  );
}
