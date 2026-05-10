/**
 * /operator/assets/admissions
 *
 * Internal operator view for the Supported Assets Admissions Framework.
 *
 * Hard rules:
 *   - INTERNAL / ADMIN ONLY - protected by requireOperatorCookie
 *   - READ-ONLY - no database writes, no contract writes, no banking rails
 *   - No new public asset appears as supported from this view
 *   - AXAG remains NOT_LIVE_NOT_ISSUED
 */

import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import {
  SUPPORTED_ASSET_ADMISSION_CANDIDATES,
  buildSupportedAssetComparisonTable,
  evaluateSupportedAssetAdmission,
  type SupportedAssetAdmissionCandidate,
  type SupportedAssetAdmissionResult,
  type SupportedAssetComparisonRow,
} from '../../../lib/assets/admissions';

interface Props {
  candidates: SupportedAssetAdmissionCandidate[];
  results: SupportedAssetAdmissionResult[];
  comparisonTable: SupportedAssetComparisonRow[];
  evaluatedAt: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const candidates = SUPPORTED_ASSET_ADMISSION_CANDIDATES;
  const results = candidates.map(evaluateSupportedAssetAdmission);
  const comparisonTable = buildSupportedAssetComparisonTable(candidates, results);

  return {
    props: JSON.parse(
      JSON.stringify({
        candidates,
        results,
        comparisonTable,
        evaluatedAt: new Date().toISOString(),
      }),
    ),
  };
};

const READINESS_STYLES: Record<string, string> = {
  READY_NOW: 'border-dl-forest text-dl-forest',
  NEEDS_DILIGENCE: 'border-dl-gold text-dl-gold',
  OUT_OF_SCOPE: 'border-red-700 text-red-700',
};

const RISK_STYLES: Record<string, string> = {
  LOW: 'text-dl-forest',
  MEDIUM: 'text-dl-gold',
  HIGH: 'text-red-700',
  DISQUALIFIED: 'text-red-700 font-bold',
};

const BOOL_BADGE = (value: boolean) => (
  <span className={value ? 'text-dl-forest font-dl-mono' : 'text-red-700 font-dl-mono'}>
    {value ? 'PASS' : 'FAIL'}
  </span>
);

function statusClass(status: string): string {
  if (status === 'LIVE_AXIOM_ISSUED') return 'text-dl-forest';
  if (status === 'EXTERNAL_SUPPORTED') return 'text-dl-gold';
  if (status === 'NOT_LIVE_NOT_ISSUED') return 'text-red-700';
  return 'text-dl-muted';
}

export default function SupportedAssetsAdmissionsPage({
  candidates,
  results,
  comparisonTable,
  evaluatedAt,
}: Props) {
  const candidateBySymbol = new Map(candidates.map((candidate) => [candidate.symbol, candidate]));

  return (
    <OperatorConsoleLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator" className="text-sm underline">
            Back to console
          </Link>
        </div>

        <h1 className="text-2xl font-dl-serif mb-1 text-dl-navy">
          Supported Assets Admissions Framework
        </h1>
        <div className="text-xs font-dl-mono text-dl-muted mb-6">
          Internal operator view | Read-only | Evaluated{' '}
          {evaluatedAt.replace('T', ' ').replace(/\.\d+Z$/, '') + ' UTC'}
        </div>

        <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-8 text-xs">
          <div className="font-dl-serif text-sm text-dl-navy mb-1">
            Governance notice - advisory only
          </div>
          <div className="text-dl-ink">
            This page compares supported-assets admission candidates for internal review.
            It does not create public support, add live assets, deploy contracts, issue
            tokens, activate AXAG, add banking rails, or introduce write paths. Commodity
            admissions remain specialized in{' '}
            <code className="font-dl-mono">lib/commodities/admissions.ts</code>. AXAG
            remains <span className="font-dl-mono font-bold">NOT_LIVE_NOT_ISSUED</span>.
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-dl-serif text-dl-navy mb-3">
            Candidate Comparison
          </h2>
          <div className="text-xs text-dl-muted font-dl-mono mb-3">
            Internal only - comparison rows are not public asset listings.
          </div>
          <div className="border border-dl-border overflow-x-auto">
            <table className="w-full text-xs min-w-[1200px]">
              <thead className="bg-dl-bg-alt">
                <tr>
                  {[
                    'Symbol',
                    'Category',
                    'Issuer',
                    'Chain',
                    'Contract',
                    'Pricing',
                    'Reserve',
                    'Custody',
                    'Read-only',
                    'Public status',
                    'Friction',
                    'Disclosure',
                    'Readiness',
                    'Risk',
                    'Blockers',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="text-left font-dl-mono uppercase px-3 py-2 whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonTable.map((row) => (
                  <tr key={row.symbol} className="border-t border-dl-border">
                    <td className="px-3 py-2 font-dl-mono font-bold text-dl-navy">
                      {row.symbol}
                    </td>
                    <td className="px-3 py-2 font-dl-mono">{row.category}</td>
                    <td className="px-3 py-2 text-dl-ink">{row.issuer}</td>
                    <td className="px-3 py-2 text-dl-ink">{row.chain}</td>
                    <td className="px-3 py-2">{BOOL_BADGE(row.contractVerified)}</td>
                    <td className="px-3 py-2 text-dl-muted">{row.pricingSource}</td>
                    <td className="px-3 py-2 font-dl-mono">{row.reserveBackingClarity}</td>
                    <td className="px-3 py-2 font-dl-mono">
                      {row.custodyRedemptionClarity}
                    </td>
                    <td className="px-3 py-2 font-dl-mono">
                      {row.readOnlyIntegrationReadiness}
                    </td>
                    <td
                      className={`px-3 py-2 font-dl-mono ${statusClass(
                        row.publicSupportStatus,
                      )}`}
                    >
                      {row.publicSupportStatus}
                    </td>
                    <td className="px-3 py-2 font-dl-mono">{row.integrationFriction}</td>
                    <td className="px-3 py-2 font-dl-mono">
                      {row.disclosureScore}
                      <span className="text-dl-muted">/100</span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`border px-2 py-0.5 font-dl-mono text-xs ${
                          READINESS_STYLES[row.readiness] ?? 'border-dl-border text-dl-ink'
                        }`}
                      >
                        {row.readiness}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 font-dl-mono ${
                        RISK_STYLES[row.risk] ?? 'text-dl-ink'
                      }`}
                    >
                      {row.risk}
                    </td>
                    <td className="px-3 py-2 text-dl-muted">{row.blockerSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-dl-serif text-dl-navy mb-3">
            Detailed Per-Candidate Evaluation
          </h2>
          <div className="space-y-8">
            {results.map((result) => {
              const candidate = candidateBySymbol.get(result.symbol);

              return (
                <div key={result.symbol} className="border border-dl-border">
                  <div className="border-b border-dl-border px-4 py-3 bg-dl-bg-alt">
                    <div className="flex items-start gap-4">
                      <div>
                        <div className="font-dl-mono font-bold text-dl-navy text-base">
                          {result.symbol}
                        </div>
                        <div className="text-sm text-dl-ink">{result.name}</div>
                      </div>
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                        <span className="text-xs font-dl-mono text-dl-muted">
                          {result.category}
                        </span>
                        <span
                          className={`border px-2 py-0.5 text-xs font-dl-mono ${
                            READINESS_STYLES[result.readiness] ??
                            'border-dl-border text-dl-ink'
                          }`}
                        >
                          {result.readiness}
                        </span>
                        <span
                          className={`text-xs font-dl-mono ${
                            RISK_STYLES[result.risk] ?? 'text-dl-ink'
                          }`}
                        >
                          Risk: {result.risk}
                        </span>
                        <span className="text-xs font-dl-mono text-dl-muted">
                          Maturity: {result.maturity}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 text-xs text-dl-ink border-b border-dl-border">
                    {result.summary}
                  </div>

                  {candidate && (
                    <div className="px-4 py-3 text-xs border-b border-dl-border">
                      <div className="font-dl-serif text-dl-navy mb-1">Current truth</div>
                      <div className="text-dl-ink">{candidate.currentTruthStatement}</div>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <div>
                          <span className="font-dl-mono text-dl-muted">Source: </span>
                          {candidate.source}
                        </div>
                        <div>
                          <span className="font-dl-mono text-dl-muted">Evidence: </span>
                          {candidate.evidencePackageRef}
                        </div>
                        <div>
                          <span className="font-dl-mono text-dl-muted">Status: </span>
                          <span className={statusClass(candidate.publicSupportStatus)}>
                            {candidate.publicSupportStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="px-4 py-3 border-b border-dl-border flex flex-wrap items-center gap-4 text-xs">
                    <span className="font-dl-mono text-dl-muted uppercase">
                      Disclosure score
                    </span>
                    <span className="font-dl-mono font-bold">
                      {result.disclosureScore}
                      <span className="text-dl-muted font-normal">/100</span>
                    </span>
                    {result.disclosureComplete ? (
                      <span className="text-dl-forest font-dl-mono">Complete</span>
                    ) : (
                      <span className="text-red-700 font-dl-mono">Incomplete</span>
                    )}
                  </div>

                  {result.openBlockers.length > 0 && (
                    <div className="px-4 py-3 border-b border-dl-border bg-red-50">
                      <div className="font-dl-serif text-dl-navy text-xs mb-2">
                        Open blockers ({result.openBlockers.length})
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-dl-ink">
                        {result.openBlockers.map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border border-dl-border m-4 overflow-x-auto">
                    <table className="w-full text-xs min-w-[720px]">
                      <thead className="bg-dl-bg-alt">
                        <tr>
                          <th className="text-left font-dl-mono uppercase px-3 py-2">
                            Check
                          </th>
                          <th className="text-left font-dl-mono uppercase px-3 py-2 w-20">
                            Pass
                          </th>
                          <th className="text-left font-dl-mono uppercase px-3 py-2">
                            Note
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.checks.map((admissionCheck) => (
                          <tr
                            key={admissionCheck.field}
                            className={`border-t border-dl-border ${
                              !admissionCheck.passed ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="px-3 py-2 font-dl-mono text-dl-ink">
                              {admissionCheck.field}
                            </td>
                            <td className="px-3 py-2">
                              {BOOL_BADGE(admissionCheck.passed)}
                            </td>
                            <td className="px-3 py-2 text-dl-muted">
                              {admissionCheck.note}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-dl-border bg-dl-bg-alt">
                          <td className="px-3 py-2 font-dl-serif text-dl-navy">
                            Summary
                          </td>
                          <td className="px-3 py-2 font-dl-mono text-xs">
                            {result.passes.length}/{result.checks.length}
                          </td>
                          <td className="px-3 py-2 text-dl-muted">
                            {result.failures.length === 0
                              ? 'All checks passed.'
                              : `${result.failures.length} check(s) failed.`}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-10 text-xs font-dl-mono text-dl-muted border-t border-dl-border pt-4">
          Internal operator tooling - advisory only. See{' '}
          <code>documents/assets/SUPPORTED_ASSETS_ADMISSIONS_FRAMEWORK.md</code> and{' '}
          <code>documents/assets/SUPPORTED_ASSETS_CANDIDATE_TRACKER.md</code>.
        </div>
      </div>
    </OperatorConsoleLayout>
  );
}
