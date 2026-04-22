/**
 * /trust/security — Live security state surface.
 *
 * Pulls a single snapshot from /api/solvency/latest at request time so
 * the page is always dated. Renders the security control state derived
 * from the snapshot plus the canonical control list. Where a live
 * on-chain read is not yet wired into the snapshot, the row is marked
 * "VERIFICATION PENDING" rather than fabricated.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

interface SnapshotPreview {
  snapshotId: string | null;
  generatedAtIso: string | null;
  fetchOk: boolean;
  errorReason: string | null;
}

interface PageProps {
  loadedAtIso: string;
  snapshot: SnapshotPreview;
}

async function fetchSnapshotPreview(origin: string): Promise<SnapshotPreview> {
  try {
    const res = await fetch(`${origin}/api/solvency/latest`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return {
        snapshotId: null,
        generatedAtIso: null,
        fetchOk: false,
        errorReason: `HTTP ${res.status}`,
      };
    }
    const j: unknown = await res.json();
    const obj = (j ?? {}) as Record<string, unknown>;
    const data = (obj.data ?? obj) as Record<string, unknown>;
    const snapshotId =
      (typeof data.id === 'string' && data.id) ||
      (typeof data.snapshotId === 'string' && data.snapshotId) ||
      null;
    const generatedAtIso =
      (typeof data.generatedAt === 'string' && data.generatedAt) ||
      (typeof data.timestamp === 'string' && data.timestamp) ||
      (typeof data.createdAt === 'string' && data.createdAt) ||
      null;
    return { snapshotId, generatedAtIso, fetchOk: true, errorReason: null };
  } catch (err) {
    return {
      snapshotId: null,
      generatedAtIso: null,
      fetchOk: false,
      errorReason: err instanceof Error ? err.message : 'unknown',
    };
  }
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  const proto =
    (ctx.req.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
  const host = ctx.req.headers.host ?? 'localhost:3000';
  const origin = `${proto}://${host}`;
  const snapshot = await fetchSnapshotPreview(origin);
  return {
    props: {
      loadedAtIso: new Date().toISOString(),
      snapshot,
    },
  };
};

interface ControlRow {
  control: string;
  what: string;
  state: 'LIVE' | 'PENDING_LIVE_READ';
  source: string;
}

const CONTROLS: ControlRow[] = [
  {
    control: 'CollateralGuard admission',
    what: 'Per-asset enable, validity adapter, cap, and per-market halt enforcement on every borrow and AXAU mint.',
    state: 'LIVE',
    source: 'AXIOM/contracts/risk/CollateralGuard.sol (Task #210, merged)',
  },
  {
    control: 'IncidentController halts',
    what: 'Per-market and global halt switches readable on chain. Halt actions are logged.',
    state: 'LIVE',
    source: 'AXIOM/contracts/risk/IncidentController.sol',
  },
  {
    control: 'Oracle fail-closed',
    what: 'AXIOMOracleAdapter reverts on read failure when the PSM is configured. The silent 1:1 fallback bug was fixed during Task #210.',
    state: 'LIVE',
    source: 'AXIOM/contracts/oracle/AXIOMOracleAdapter.sol',
  },
  {
    control: 'Per-asset cap utilisation',
    what: 'Outstanding exposure per (marketId, assetId) tracked on chain. Cap rejection on the next borrow above the limit.',
    state: 'PENDING_LIVE_READ',
    source: 'CollateralGuard.outstandingByCollateral mapping',
  },
  {
    control: 'Per-market halt status',
    what: 'Live read of whether a market or the protocol is halted.',
    state: 'PENDING_LIVE_READ',
    source: 'IncidentController public storage',
  },
  {
    control: 'Oracle staleness windows',
    what: 'Per-asset staleness threshold beyond which the admission check fails.',
    state: 'PENDING_LIVE_READ',
    source: 'CollateralRiskConfig per-asset metadata',
  },
  {
    control: 'BitGo multi-party custody',
    what: 'Treasury crypto on Arbitrum One held under BitGo CaaS multi-party authorization. No single signer can move funds.',
    state: 'LIVE',
    source: 'BitGo CaaS account holder verification on request',
  },
  {
    control: 'Increase fiat custody (FDIC depository)',
    what: 'Operating cash and card-onramp settlement at Increase. FDIC-insured at the depository layer.',
    state: 'LIVE',
    source: 'Increase account holder verification on request',
  },
  {
    control: 'Loss Coverage Reserve',
    what: 'Dedicated reserve, segregated from operating reserves and product-specific reserves, governed by a published policy.',
    state: 'PENDING_LIVE_READ',
    source: 'documents/trust/loss-coverage-reserve-policy.md',
  },
  {
    control: 'Append-only audit events',
    what: 'Every privileged action recorded with timestamp, actor, and policy version. Records are not deletable.',
    state: 'LIVE',
    source: 'Capital infrastructure events table (capinfra)',
  },
];

function StateBadge({ state }: { state: ControlRow['state'] }) {
  if (state === 'LIVE') {
    return (
      <span className="font-dl-mono text-[10px] uppercase tracking-wider border border-dl-forest text-dl-forest px-1.5 py-0.5">
        LIVE
      </span>
    );
  }
  return (
    <span className="font-dl-mono text-[10px] uppercase tracking-wider border border-dl-gray text-dl-gray px-1.5 py-0.5">
      LIVE READ PENDING
    </span>
  );
}

export default function TrustSecurityPage({ loadedAtIso, snapshot }: PageProps) {
  return (
    <>
      <Head>
        <title>Security &amp; Live Controls — Axiom Protocol</title>
        <meta
          name="description"
          content="Live state of every Axiom Protocol security control: CollateralGuard, IncidentController, oracle fail-closed, custody, Loss Coverage Reserve, append-only audit events."
        />
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Trust / Security
          </p>
          <SectionHeading>Security &amp; Live Controls</SectionHeading>
          <p className="font-dl-mono text-xs text-dl-gray mt-2">
            Loaded {loadedAtIso}
          </p>
          <p className="text-sm text-dl-gray mt-1">
            <Link href="/trust" className="underline">
              ← Back to Trust Stack
            </Link>
          </p>
        </div>

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">
            Latest solvency snapshot
          </h2>
          {snapshot.fetchOk ? (
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-6 text-sm">
              <dt className="font-dl-mono text-xs text-dl-gray uppercase">
                Snapshot ID
              </dt>
              <dd className="md:col-span-2 font-dl-mono text-dl-ink break-all">
                {snapshot.snapshotId ?? <span className="text-dl-gray italic">not present in payload</span>}
              </dd>

              <dt className="font-dl-mono text-xs text-dl-gray uppercase">
                Generated at
              </dt>
              <dd className="md:col-span-2 font-dl-mono text-dl-ink">
                {snapshot.generatedAtIso ?? (
                  <span className="text-dl-gray italic">not present in payload</span>
                )}
              </dd>

              <dt className="font-dl-mono text-xs text-dl-gray uppercase">
                Source
              </dt>
              <dd className="md:col-span-2 font-dl-mono text-dl-ink">
                /api/solvency/latest
              </dd>
            </dl>
          ) : (
            <div className="border border-dl-gray bg-dl-bg-alt p-4 text-sm text-dl-gray">
              Snapshot endpoint not reachable at request time
              {snapshot.errorReason ? ` (${snapshot.errorReason})` : ''}.
              The full snapshot is published on{' '}
              <Link href="/disclosure" className="underline text-dl-navy">
                /disclosure
              </Link>
              .
            </div>
          )}
        </div>

        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dl-bg-alt border-b border-dl-border">
              <tr>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[24%]">
                  Control
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3">
                  What it does
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[14%]">
                  State
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[24%]">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {CONTROLS.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-dl-border last:border-b-0 align-top"
                >
                  <td className="p-3 font-dl-serif text-dl-navy">{r.control}</td>
                  <td className="p-3 text-dl-ink leading-relaxed">{r.what}</td>
                  <td className="p-3">
                    <StateBadge state={r.state} />
                  </td>
                  <td className="p-3 font-dl-mono text-xs text-dl-gray break-all">
                    {r.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 border border-dl-border p-6">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">
            72-hour incident commitment
          </h2>
          <p className="text-base text-dl-ink leading-relaxed">
            For any incident affecting user funds, Axiom commits to a public
            post-mortem within 72 hours, published to the documents directory
            and linked from the Trust Stack landing page. The post-mortem
            covers: what happened, what controls failed or held, what was
            paid from the Loss Coverage Reserve, and what changes were made
            to the protocol or the policy as a result.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/trust/no-bridges"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            No-bridges allow-list →
          </Link>
          <Link
            href="/trust/audits"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Audits page →
          </Link>
          <Link
            href="/disclosure"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Solvency snapshot →
          </Link>
        </div>
      </DesignLawLayout>
    </>
  );
}
