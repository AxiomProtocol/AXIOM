/**
 * /operator/commodities/admissions
 *
 * Internal operator view for the Commodity Admissions Pipeline.
 *
 * Displays admission evaluation results for known reference assets (AXAU, KAG, AXAG)
 * and a readiness comparison table across all admission snapshots.
 *
 * Hard rules:
 *   - INTERNAL / ADMIN ONLY — protected by requireOperatorCookie
 *   - READ-ONLY — no database writes, no contract writes, no banking rails
 *   - No new public asset appears as supported from this view
 *   - AXAG remains NOT_LIVE_NOT_ISSUED — surfaced explicitly
 *   - No write paths introduced
 */

import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import {
  evaluateAdmission,
  buildComparisonTable,
  KNOWN_ASSETS_ADMISSION_SNAPSHOTS,
  type CommodityAdmissionResult,
  type CandidateComparisonRow,
} from '../../../lib/commodities/admissions';

interface Props {
  results: CommodityAdmissionResult[];
  comparisonTable: CandidateComparisonRow[];
  evaluatedAt: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const results = KNOWN_ASSETS_ADMISSION_SNAPSHOTS.map(evaluateAdmission);
  const comparisonTable = buildComparisonTable(KNOWN_ASSETS_ADMISSION_SNAPSHOTS);
  const evaluatedAt = new Date().toISOString();

  return {
    props: {
      results: JSON.parse(JSON.stringify(results)),
      comparisonTable: JSON.parse(JSON.stringify(comparisonTable)),
      evaluatedAt,
    },
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

const BOOL_BADGE = (v: boolean) =>
  v ? (
    <span className="text-dl-forest font-dl-mono">✓</span>
  ) : (
    <span className="text-red-600 font-dl-mono">✗</span>
  );

export default function CommodityAdmissionsPage({
  results,
  comparisonTable,
  evaluatedAt,
}: Props) {
  return (
    <OperatorConsoleLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator" className="text-sm underline">
            ← Back to console
          </Link>
        </div>

        <h1 className="text-2xl font-dl-serif mb-1 text-dl-navy">
          Commodity Admissions Pipeline
        </h1>
        <div className="text-xs font-dl-mono text-dl-muted mb-6">
          Internal operator view · Read-only · Evaluated{' '}
          {new Date(evaluatedAt).toLocaleString()} UTC
        </div>

        {/* Governance notice */}
        <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-8 text-xs">
          <div className="font-dl-serif text-sm text-dl-navy mb-1">
            Governance notice — advisory only
          </div>
          <div className="text-dl-ink">
            Admission results are advisory. No candidate becomes publicly supported
            without governance approval and launch-gate sign-off. AXAG remains{' '}
            <span className="font-dl-mono font-bold">NOT_LIVE_NOT_ISSUED</span>. No
            write paths. No contract deploys. No banking rails. See{' '}
            <Link
              href="/commodity-framework"
              className="underline"
            >
              /commodity-framework
            </Link>{' '}
            and{' '}
            <code className="font-dl-mono">
              documents/commodities/COMMODITY_ADMISSIONS_PIPELINE.md
            </code>
            .
          </div>
        </div>

        {/* Comparison table */}
        <section className="mb-10">
          <h2 className="text-lg font-dl-serif text-dl-navy mb-3">
            Readiness Comparison Table
          </h2>
          <div className="text-xs text-dl-muted font-dl-mono mb-3">
            Internal view only — candidates below are reference snapshots, not new
            public assets.
          </div>
          <div className="border border-dl-border overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="bg-dl-bg-alt">
                <tr>
                  {[
                    'Symbol',
                    'Issuer',
                    'Chain',
                    'Contract Verified',
                    'Reserve Disclosed',
                    'Custodian Regulated',
                    'Friction',
                    'Disclosure %',
                    'Readiness',
                    'Risk',
                    'Blockers',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left font-dl-mono uppercase px-3 py-2 whitespace-nowrap"
                    >
                      {h}
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
                    <td className="px-3 py-2 text-dl-ink">{row.issuer}</td>
                    <td className="px-3 py-2 text-dl-ink">{row.chain}</td>
                    <td className="px-3 py-2 text-center">
                      {BOOL_BADGE(row.contractVerified)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {BOOL_BADGE(row.reserveDisclosed)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {BOOL_BADGE(row.custodianRegulated)}
                    </td>
                    <td className="px-3 py-2 font-dl-mono">{row.integrationFriction}</td>
                    <td className="px-3 py-2 font-dl-mono">
                      {row.disclosureCompleteness}
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
                    <td className="px-3 py-2 text-dl-muted">
                      {row.blockerSummary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Per-candidate detailed results */}
        <section>
          <h2 className="text-lg font-dl-serif text-dl-navy mb-3">
            Detailed Admission Results
          </h2>
          <div className="space-y-8">
            {results.map((result) => (
              <div key={result.symbol} className="border border-dl-border">
                {/* Header */}
                <div
                  className={`border-b border-dl-border px-4 py-3 flex items-center gap-4 ${
                    result.readiness === 'READY_NOW'
                      ? 'bg-dl-bg-alt'
                      : result.readiness === 'OUT_OF_SCOPE'
                      ? 'bg-red-50'
                      : 'bg-dl-bg-alt'
                  }`}
                >
                  <div className="font-dl-mono font-bold text-dl-navy text-base">
                    {result.symbol}
                  </div>
                  <div className="text-sm text-dl-ink">{result.name}</div>
                  <div className="ml-auto flex items-center gap-3">
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

                {/* Summary */}
                <div className="px-4 py-3 text-xs text-dl-ink border-b border-dl-border">
                  {result.summary}
                </div>

                {/* Disclosure completeness */}
                <div className="px-4 py-3 border-b border-dl-border flex items-center gap-4 text-xs">
                  <span className="font-dl-mono text-dl-muted uppercase">
                    Disclosure completeness
                  </span>
                  <span className="font-dl-mono font-bold">
                    {result.disclosureCompleteness}
                    <span className="text-dl-muted font-normal">/100</span>
                  </span>
                  {result.disclosureComplete ? (
                    <span className="text-dl-forest font-dl-mono">Complete</span>
                  ) : (
                    <span className="text-red-600 font-dl-mono">Incomplete</span>
                  )}
                </div>

                {/* Open blockers */}
                {result.openBlockers.length > 0 && (
                  <div className="px-4 py-3 border-b border-dl-border bg-red-50">
                    <div className="font-dl-serif text-dl-navy text-xs mb-2">
                      Open blockers ({result.openBlockers.length})
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-dl-ink">
                      {result.openBlockers.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Checks summary */}
                <div className="border border-dl-border m-4">
                  <table className="w-full text-xs">
                    <thead className="bg-dl-bg-alt">
                      <tr>
                        <th className="text-left font-dl-mono uppercase px-3 py-2">
                          Check
                        </th>
                        <th className="text-left font-dl-mono uppercase px-3 py-2 w-16">
                          Pass
                        </th>
                        <th className="text-left font-dl-mono uppercase px-3 py-2">
                          Note
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.checks.map((ch) => (
                        <tr
                          key={ch.field}
                          className={`border-t border-dl-border ${
                            !ch.passed ? 'bg-red-50' : ''
                          }`}
                        >
                          <td className="px-3 py-2 font-dl-mono text-dl-ink">
                            {ch.field}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {BOOL_BADGE(ch.passed)}
                          </td>
                          <td className="px-3 py-2 text-dl-muted">{ch.note}</td>
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
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-10 text-xs font-dl-mono text-dl-muted border-t border-dl-border pt-4">
          Internal operator tooling — advisory only. Admission results do not
          constitute governance approval. See{' '}
          <code>documents/commodities/COMMODITY_ADMISSIONS_PIPELINE.md</code>.
        </div>
      </div>
    </OperatorConsoleLayout>
  );
}
