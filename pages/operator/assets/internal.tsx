/**
 * /operator/assets/internal
 *
 * Internal operator view for the Axiom Internal Asset Registry.
 *
 * Lists all protocol-native and Axiom-issued assets discovered via the
 * repo-wide scan documented in:
 *   documents/assets/INTERNAL_ASSET_DISCOVERY_REPORT.md
 *   documents/assets/INTERNAL_ASSET_TRACKER.md
 *
 * Hard rules:
 *   - INTERNAL / OPERATOR ONLY — protected by requireOperatorCookie
 *   - READ-ONLY — no database writes, no contract writes, no banking rails
 *   - AXAG remains NOT_LIVE_NOT_ISSUED — surfaced explicitly with that label
 *   - No write paths introduced
 *   - No external asset is listed here; see /operator/commodities/admissions
 *     for external asset admission status
 */

import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import {
  listInternalAssets,
  type InternalAsset,
  type InternalAssetStatus,
} from '../../../lib/assets/internalRegistry';

interface Props {
  assets: InternalAsset[];
  evaluatedAt: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  return {
    props: {
      assets: listInternalAssets(),
      evaluatedAt: new Date().toISOString(),
    },
  };
};

// ─── Badge styles ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<InternalAssetStatus, string> = {
  LIVE: 'bg-green-100 text-green-800 border border-green-300',
  DEPLOYED_INACTIVE: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  DRAFT_ONLY: 'bg-orange-100 text-orange-800 border border-orange-300',
  NOT_LIVE_NOT_ISSUED: 'bg-red-100 text-red-800 border border-red-300',
  DEPRECATED: 'bg-gray-200 text-gray-600 border border-gray-300',
  UNKNOWN_NEEDS_REVIEW: 'bg-purple-100 text-purple-800 border border-purple-300',
};

const STATUS_LABEL: Record<InternalAssetStatus, string> = {
  LIVE: 'LIVE',
  DEPLOYED_INACTIVE: 'DEPLOYED INACTIVE',
  DRAFT_ONLY: 'DRAFT ONLY',
  NOT_LIVE_NOT_ISSUED: 'NOT LIVE / NOT ISSUED',
  DEPRECATED: 'DEPRECATED',
  UNKNOWN_NEEDS_REVIEW: 'UNKNOWN — NEEDS REVIEW',
};

function StatusBadge({ status }: { status: InternalAssetStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-dl-mono uppercase tracking-wide ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function BoolBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="text-dl-forest font-dl-mono text-xs">Yes</span>
  ) : (
    <span className="text-dl-muted font-dl-mono text-xs">No</span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InternalAssetsPage({ assets, evaluatedAt }: Props) {
  const liveCount = assets.filter((a) => a.status === 'LIVE').length;
  const inactiveCount = assets.filter((a) => a.status === 'DEPLOYED_INACTIVE').length;
  const notIssuedCount = assets.filter((a) => a.status === 'NOT_LIVE_NOT_ISSUED').length;
  const unknownCount = assets.filter((a) => a.status === 'UNKNOWN_NEEDS_REVIEW').length;

  return (
    <OperatorConsoleLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/operator" className="text-dl-muted text-xs font-dl-mono hover:text-dl-ink">
              ← Operator Console
            </Link>
          </div>
          <h1 className="font-dl-serif text-dl-navy text-2xl">
            Internal Asset Registry
          </h1>
          <p className="text-xs font-dl-mono text-dl-muted mt-1">
            Protocol-native and Axiom-issued assets discovered via repo-wide scan.
            Read-only. Evaluated at {evaluatedAt}.
          </p>
        </div>

        {/* Notice */}
        <div className="border border-dl-border bg-dl-bg-alt px-4 py-3 mb-6 text-xs text-dl-ink rounded">
          <span className="font-dl-mono font-bold">OPERATOR INTERNAL — READ-ONLY.</span>{' '}
          This page lists all internal assets discovered in the Axiom codebase. No write
          paths, no contract calls, no banking integration. Asset statuses are sourced
          from the repo and must not be modified here. For external asset admission, see{' '}
          <Link href="/operator/commodities/admissions" className="underline">
            /operator/commodities/admissions
          </Link>
          .
        </div>

        {/* Summary counts */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'LIVE', count: liveCount, style: 'bg-green-50 border-green-200' },
            { label: 'DEPLOYED INACTIVE', count: inactiveCount, style: 'bg-yellow-50 border-yellow-200' },
            { label: 'NOT LIVE / NOT ISSUED', count: notIssuedCount, style: 'bg-red-50 border-red-200' },
            { label: 'NEEDS REVIEW', count: unknownCount, style: 'bg-purple-50 border-purple-200' },
          ].map(({ label, count, style }) => (
            <div key={label} className={`border rounded px-4 py-3 ${style}`}>
              <div className="text-2xl font-dl-mono font-bold text-dl-navy">{count}</div>
              <div className="text-xs font-dl-mono text-dl-muted uppercase mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Asset list */}
        <section>
          <h2 className="font-dl-serif text-dl-navy text-lg mb-4">
            All Internal Assets ({assets.length})
          </h2>

          <div className="space-y-4">
            {assets.map((asset) => (
              <div
                key={asset.symbol}
                className="border border-dl-border bg-white rounded"
              >
                {/* Asset header */}
                <div className="px-4 py-3 border-b border-dl-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-dl-mono font-bold text-dl-navy text-sm">
                      {asset.symbol}
                    </span>
                    <span className="text-dl-ink text-sm">{asset.name}</span>
                  </div>
                  <StatusBadge status={asset.status} />
                </div>

                {/* Asset details */}
                <div className="px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-2 text-xs border-b border-dl-border">
                  <div>
                    <span className="font-dl-mono text-dl-muted uppercase">Category</span>
                    <span className="ml-2 font-dl-mono text-dl-ink">{asset.category}</span>
                  </div>
                  <div>
                    <span className="font-dl-mono text-dl-muted uppercase">Issuer</span>
                    <span className="ml-2 text-dl-ink">{asset.issuer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-dl-mono text-dl-muted uppercase">Axiom Issues</span>
                    <BoolBadge value={asset.axiomIssues} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-dl-mono text-dl-muted uppercase">Axiom Custodies</span>
                    <BoolBadge value={asset.axiomCustodies} />
                  </div>
                  <div>
                    <span className="font-dl-mono text-dl-muted uppercase">Chain</span>
                    <span className="ml-2 font-dl-mono text-dl-ink">
                      {asset.chain ?? 'n/a'}
                    </span>
                  </div>
                  <div>
                    <span className="font-dl-mono text-dl-muted uppercase">Contract</span>
                    <span className="ml-2 font-dl-mono text-dl-ink break-all">
                      {asset.contractAddress ?? 'none'}
                    </span>
                  </div>
                </div>

                {/* Product truth */}
                <div className="px-4 py-3 border-b border-dl-border text-xs text-dl-ink">
                  <span className="font-dl-mono text-dl-muted uppercase mr-2">
                    Current truth:
                  </span>
                  {asset.productTruth}
                </div>

                {/* Activation notes */}
                {asset.activationNotes && (
                  <div className="px-4 py-3 border-b border-dl-border text-xs bg-yellow-50">
                    <div className="font-dl-mono text-dl-muted uppercase mb-1">
                      Activation requirements
                    </div>
                    <div className="text-dl-ink">{asset.activationNotes}</div>
                  </div>
                )}

                {/* Source files */}
                <div className="px-4 py-3 text-xs">
                  <span className="font-dl-mono text-dl-muted uppercase mr-2">Sources:</span>
                  <span className="font-dl-mono text-dl-muted break-all">
                    {asset.sourceFiles.join(' · ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-10 text-xs font-dl-mono text-dl-muted border-t border-dl-border pt-4 space-y-1">
          <div>
            Internal operator tooling — advisory only. Asset statuses are sourced from
            the repo and must not be changed here.
          </div>
          <div>
            Discovery report:{' '}
            <code>documents/assets/INTERNAL_ASSET_DISCOVERY_REPORT.md</code>
          </div>
          <div>
            Tracker:{' '}
            <code>documents/assets/INTERNAL_ASSET_TRACKER.md</code>
          </div>
          <div>
            Registry implementation:{' '}
            <code>lib/assets/internalRegistry.ts</code>
          </div>
        </div>
      </div>
    </OperatorConsoleLayout>
  );
}
