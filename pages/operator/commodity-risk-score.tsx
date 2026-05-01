/**
 * /operator/commodity-risk-score
 *
 * Operator-facing form for scoring a commodity reserve instrument candidate
 * against the Commodity Expansion Framework v1.0.0.
 *
 * NO database writes. NO on-chain calls. NO external API calls. Result is
 * advisory only and does not replace the governance vote required by the
 * framework (Section 3, Stage 3).
 */

import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { OperatorConsoleLayout } from '../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../lib/capinfra/operatorAuth';
import {
  ADVISORY_DISCLAIMER,
  FRAMEWORK_VERSION,
  type ApprovalBand,
  type DimensionKey,
  type ScoreResult,
} from '../../lib/commodity/riskScoring';

interface Props {
  effectiveDate: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;
  return {
    props: {
      effectiveDate: '2026-05-01',
    },
  };
};

const DIMENSIONS: Array<{
  key: DimensionKey;
  label: string;
  hint: string;
}> = [
  {
    key: 'oracleRisk',
    label: 'Oracle Risk',
    hint: '1 = Production Chainlink, 2+ yrs history. 5 = no on-chain oracle.',
  },
  {
    key: 'custodyRisk',
    label: 'Custody Risk',
    hint: '1 = Regulated custodian, on-chain receipt token. 5 = single-key self-custody.',
  },
  {
    key: 'liquidityRisk',
    label: 'Liquidity Risk',
    hint: '1 = Daily volume > $100M, instant on-chain redemption. 5 = no liquid secondary market.',
  },
  {
    key: 'reserveRisk',
    label: 'Reserve Risk',
    hint: '1 = Multi-century value preservation, LBMA-grade. 5 = synthetic / algorithmic reserve.',
  },
  {
    key: 'regulatoryRisk',
    label: 'Regulatory Risk',
    hint: '1 = Clear precedent, legal opinion in hand. 5 = prohibited or highly regulated underlying.',
  },
];

const BAND_COLORS: Record<ApprovalBand, string> = {
  APPROVED: 'border-dl-forest text-dl-forest',
  CONDITIONAL: 'border-dl-gold text-dl-gold',
  DEFERRED: 'border-dl-gold text-dl-ink',
  REJECTED: 'border-red-700 text-red-700',
};

type ScoreState = Record<DimensionKey, number>;

export default function CommodityRiskScorePage({ effectiveDate }: Props) {
  const [candidateName, setCandidateName] = useState('');
  const [notes, setNotes] = useState('');
  const [scores, setScores] = useState<ScoreState>({
    oracleRisk: 1,
    custodyRisk: 1,
    liquidityRisk: 1,
    reserveRisk: 1,
    regulatoryRisk: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);

  const liveComposite = useMemo(
    () =>
      scores.oracleRisk +
      scores.custodyRisk +
      scores.liquidityRisk +
      scores.reserveRisk +
      scores.regulatoryRisk,
    [scores],
  );

  function setDim(key: DimensionKey, value: number) {
    setScores((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const r = await fetch('/api/operator/commodity-risk-score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          candidateName: candidateName.trim(),
          ...scores,
          notes: notes.trim() ? notes.trim() : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        const fieldHint = j?.field ? ` (field: ${j.field})` : '';
        setError(`${j?.message ?? j?.error ?? `HTTP ${r.status}`}${fieldHint}`);
      } else {
        setResult(j as ScoreResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OperatorConsoleLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator" className="text-sm underline">
            ← Back to console
          </Link>
        </div>

        <h1 className="text-2xl font-dl-serif mb-1 text-dl-navy">
          Commodity Risk Scoring
        </h1>
        <div className="text-xs font-dl-mono text-dl-muted mb-6">
          Framework v{FRAMEWORK_VERSION} · Effective {effectiveDate} · Operator
          tooling — advisory only
        </div>

        <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-6 text-xs">
          <div className="font-dl-serif text-sm text-dl-navy mb-1">
            Governance notice
          </div>
          <div className="text-dl-ink">
            {ADVISORY_DISCLAIMER} A Stage 2 Technical Diligence Report and Stage
            3 governance vote are required before any commodity candidate may
            proceed. See{' '}
            <Link href="/commodity-framework" className="underline">
              /commodity-framework
            </Link>{' '}
            for the full evaluation process.
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wide font-dl-mono mb-2">
              Candidate name
            </label>
            <input
              type="text"
              required
              maxLength={200}
              autoComplete="off"
              className="w-full border border-dl-border bg-dl-bg px-3 py-2 font-dl-mono text-sm"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="e.g., Silver Reserve Instrument"
            />
          </div>

          <div className="border border-dl-border">
            <table className="w-full text-xs">
              <thead className="bg-dl-bg-alt">
                <tr>
                  <th className="text-left font-dl-mono uppercase px-3 py-2">
                    Dimension
                  </th>
                  <th className="text-left font-dl-mono uppercase px-3 py-2 w-24">
                    Score (1-5)
                  </th>
                  <th className="text-left font-dl-mono uppercase px-3 py-2">
                    Anchor
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIMENSIONS.map((d) => (
                  <tr key={d.key} className="border-t border-dl-border">
                    <td className="px-3 py-3 font-dl-serif text-dl-navy align-top">
                      {d.label}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <select
                        value={scores[d.key]}
                        onChange={(e) =>
                          setDim(d.key, parseInt(e.target.value, 10))
                        }
                        className="border border-dl-border bg-dl-bg px-2 py-1 font-dl-mono text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-dl-muted align-top">
                      {d.hint}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-dl-border bg-dl-bg-alt">
                  <td className="px-3 py-3 font-dl-serif text-dl-navy">
                    Composite (live)
                  </td>
                  <td className="px-3 py-3 font-dl-mono text-sm">
                    {liveComposite} / 25
                  </td>
                  <td className="px-3 py-3 text-dl-muted">
                    Range 5-25; bands: 5-10 APPROVED · 11-16 CONDITIONAL · 17-21
                    DEFERRED · 22-25 REJECTED
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide font-dl-mono mb-2">
              Notes (optional)
            </label>
            <textarea
              maxLength={2000}
              rows={3}
              className="w-full border border-dl-border bg-dl-bg px-3 py-2 font-dl-mono text-xs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context for the scoring decision"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="border border-dl-border px-4 py-2 text-sm uppercase tracking-wide bg-dl-fg text-dl-bg disabled:opacity-50 font-dl-mono"
            >
              {submitting ? 'Scoring…' : 'Score candidate'}
            </button>
            {error && (
              <div className="text-xs font-dl-mono text-red-700">{error}</div>
            )}
          </div>
        </form>

        {result && (
          <section className="mt-8 space-y-5">
            <div
              className={`border-2 p-4 ${BAND_COLORS[result.band]}`}
              data-testid="score-result-band"
            >
              <div className="text-xs font-dl-mono uppercase mb-1">
                Result · {result.candidateName}
              </div>
              <div className="font-dl-serif text-3xl">{result.band}</div>
              <div className="text-xs font-dl-mono mt-1 text-dl-ink">
                Composite {result.composite} / 25 · {result.bandDescription}
              </div>
              <div className="text-xs font-dl-mono mt-1 text-dl-muted">
                {result.bandOutcome}
              </div>
              {result.weightedComposite !== result.composite && (
                <div className="text-xs font-dl-mono mt-1 text-dl-muted">
                  Weighted composite: {result.weightedComposite}
                </div>
              )}
            </div>

            <div className="border border-dl-border">
              <table className="w-full text-xs">
                <thead className="bg-dl-bg-alt">
                  <tr>
                    <th className="text-left font-dl-mono uppercase px-3 py-2">
                      Dimension
                    </th>
                    <th className="text-left font-dl-mono uppercase px-3 py-2">
                      Score
                    </th>
                    <th className="text-left font-dl-mono uppercase px-3 py-2">
                      Criteria
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DIMENSIONS.map((d) => {
                    const dim = result.dimensions[d.key];
                    return (
                      <tr key={d.key} className="border-t border-dl-border align-top">
                        <td className="px-3 py-2 font-dl-serif text-dl-navy">
                          {dim.label}
                        </td>
                        <td className="px-3 py-2 font-dl-mono">{dim.score}</td>
                        <td className="px-3 py-2 text-dl-ink">{dim.criteria}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {result.remediationNotes.length > 0 && (
              <div className="border border-dl-border p-4">
                <div className="font-dl-serif text-dl-navy mb-2">
                  Remediation notes
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-dl-ink">
                  {result.remediationNotes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.launchGateWarnings.length > 0 && (
              <div className="border border-dl-gold p-4 bg-dl-bg-alt">
                <div className="font-dl-serif text-dl-navy mb-2">
                  Launch gate warnings
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-dl-ink">
                  {result.launchGateWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs font-dl-mono text-dl-muted border-t border-dl-border pt-3">
              {result.advisory} · Source: {result.source.framework} v
              {result.source.version} · Evaluated{' '}
              {new Date(result.evaluatedAt).toISOString()}
            </div>
          </section>
        )}
      </div>
    </OperatorConsoleLayout>
  );
}
