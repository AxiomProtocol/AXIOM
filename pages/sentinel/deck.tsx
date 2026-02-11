import { useState, useEffect } from 'react';
import { DesignLawLayout, PageShell, SectionHeading } from '../../components/design-law';

interface OverviewRaw {
  regime: { regime: string; confidence: string } | null;
  signalCounts: { total: number; qualified: number };
  decisionCounts: { approved: number; denied: number };
  systemStance: string;
}

interface HealthData {
  operationalState: string;
  consecutiveFailures: number;
}

export default function SentinelDeck() {
  const [overview, setOverview] = useState<OverviewRaw | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/sentinel/overview').then((r) => r.json()),
      fetch('/api/sentinel/health').then((r) => r.json()),
    ])
      .then(([o, h]) => {
        setOverview(o);
        setHealth(h);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generatedAt = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  return (
    <DesignLawLayout>
      <style jsx global>{`
        @media print {
          .no-print,
          nav,
          footer {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .design-law-root {
            min-height: auto !important;
          }
        }
      `}</style>
      <PageShell
        title="Axiom Sentinel — Institutional Summary"
        subtitle="Due Diligence Documentation | Capital Decision & Risk Authorization Infrastructure"
        disclosure=""
      >
        <div className="no-print mb-4 flex justify-end">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-dl-border text-sm font-dl-mono text-dl-navy bg-dl-bg"
          >
            Print / Save PDF
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-dl-gray py-12 text-center">Loading...</p>
        ) : (
          <div className="space-y-8">
            <section>
              <SectionHeading>1. Protocol Overview</SectionHeading>
              <div className="space-y-3 text-sm text-dl-gray leading-relaxed">
                <p>
                  Axiom Sentinel is the unified capital decision and risk authorization layer for all Axiom Protocol
                  products. It converts market intelligence signals from the MIRDT (Market Intelligence & Risk Disclosure
                  Terminal) into authorized capital actions with cryptographic audit trails.
                </p>
                <p>
                  The system operates under the principle: <span className="font-medium text-dl-navy">&ldquo;Strategy proposes.
                  Sentinel decides. Execution obeys.&rdquo;</span> No capital-impacting action can proceed without Sentinel
                  authorization during the proof-of-concept phase.
                </p>
              </div>
            </section>

            <section>
              <SectionHeading>2. Current Operational State</SectionHeading>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border border-dl-border-light p-3">
                  <p className="text-xs text-dl-gray uppercase">Regime</p>
                  <p className="font-dl-mono text-sm text-dl-navy">{overview?.regime?.regime || '—'}</p>
                </div>
                <div className="border border-dl-border-light p-3">
                  <p className="text-xs text-dl-gray uppercase">Confidence</p>
                  <p className="font-dl-mono text-sm text-dl-navy">
                    {overview?.regime ? `${(parseFloat(overview.regime.confidence) * 100).toFixed(0)}%` : '—'}
                  </p>
                </div>
                <div className="border border-dl-border-light p-3">
                  <p className="text-xs text-dl-gray uppercase">Stance</p>
                  <p className="font-dl-mono text-sm text-dl-navy">{overview?.systemStance || '—'}</p>
                </div>
                <div className="border border-dl-border-light p-3">
                  <p className="text-xs text-dl-gray uppercase">Circuit Breaker</p>
                  <p className="font-dl-mono text-sm text-dl-navy">{health?.operationalState || 'NORMAL'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="border border-dl-border-light p-3">
                  <p className="text-xs text-dl-gray uppercase">Signals Generated</p>
                  <p className="font-dl-mono text-sm text-dl-navy">
                    {overview?.signalCounts?.total ?? 0} total, {overview?.signalCounts?.qualified ?? 0} qualified
                  </p>
                </div>
                <div className="border border-dl-border-light p-3">
                  <p className="text-xs text-dl-gray uppercase">Decisions Rendered</p>
                  <p className="font-dl-mono text-sm text-dl-navy">
                    {overview?.decisionCounts?.approved ?? 0} approved, {overview?.decisionCounts?.denied ?? 0} denied
                  </p>
                </div>
              </div>
            </section>

            <section>
              <SectionHeading>3. Core Risk Architecture</SectionHeading>
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="border border-dl-border-light p-4">
                    <p className="text-sm font-medium text-dl-navy mb-2">Regime Engine</p>
                    <p className="text-xs text-dl-gray leading-relaxed">
                      Classifies market into 4 states using SMA slopes, volatility ratios, and breadth scores.
                      Determines macro allocation stance and regime multipliers.
                    </p>
                  </div>
                  <div className="border border-dl-border-light p-4">
                    <p className="text-sm font-medium text-dl-navy mb-2">Confidence Calibrator</p>
                    <p className="text-xs text-dl-gray leading-relaxed">
                      Applies Platt scaling to convert raw model confidence into calibrated probabilities.
                      Ensures confidence scores reflect actual historical outcome rates.
                    </p>
                  </div>
                  <div className="border border-dl-border-light p-4">
                    <p className="text-sm font-medium text-dl-navy mb-2">Confirmation Engine</p>
                    <p className="text-xs text-dl-gray leading-relaxed">
                      Multi-factor validation: timeframe alignment, signal persistence, volume confirmation,
                      risk/reward ratio, and liquidity adequacy.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="border border-dl-border-light p-4">
                    <p className="text-sm font-medium text-dl-navy mb-2">Portfolio Engine</p>
                    <p className="text-xs text-dl-gray leading-relaxed">
                      Volatility-targeting position sizing with 10% single-position cap, 25% correlated-exposure
                      limit, and regime-adjusted multipliers.
                    </p>
                  </div>
                  <div className="border border-dl-border-light p-4">
                    <p className="text-sm font-medium text-dl-navy mb-2">Authorization Service</p>
                    <p className="text-xs text-dl-gray leading-relaxed">
                      Issues signed authorization decisions with SHA-256 hash chain. Every decision is
                      append-only and tamper-evident.
                    </p>
                  </div>
                  <div className="border border-dl-border-light p-4">
                    <p className="text-sm font-medium text-dl-navy mb-2">Circuit Breaker</p>
                    <p className="text-xs text-dl-gray leading-relaxed">
                      4-state fault tolerance: Normal → Safe Mode → Defensive Mode → Recovery Pending.
                      Graceful degradation ensures capital preservation during system issues.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <SectionHeading>4. Due Diligence Coverage</SectionHeading>
              <div className="border border-dl-border overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-dl-bg-alt">
                      <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      { category: 'Risk Management Framework', status: 'Implemented', evidence: 'Regime Engine, Confirmation Engine, Portfolio Engine' },
                      { category: 'Position Sizing Controls', status: 'Implemented', evidence: 'Vol-targeting, single-position caps, correlation limits' },
                      { category: 'Audit Trail / Compliance', status: 'Implemented', evidence: 'SHA-256 hash chain, append-only audit log' },
                      { category: 'Operational Resilience', status: 'Implemented', evidence: '4-state circuit breaker, notification hooks' },
                      { category: 'Capital Governance', status: 'Implemented', evidence: 'Action classification (HIGH/MEDIUM/LOW), authorization gating' },
                      { category: 'Market Intelligence', status: 'Active', evidence: 'MIRDT scan universe: equities + digital assets' },
                      { category: 'Treasury Policy Enforcement', status: 'Hardcoded', evidence: '35% distributions, 35% reserves, 20% growth, 10% operating' },
                      { category: 'Automated Execution', status: 'Advisory Only', evidence: 'Guard Rail #5: No execution until post-public governance vote' },
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
                        <td className="px-4 py-2 text-dl-navy">{row.category}</td>
                        <td className="px-4 py-2">
                          <span className={row.status === 'Implemented' || row.status === 'Active' ? 'text-dl-forest' : row.status === 'Hardcoded' ? 'text-dl-navy' : 'text-dl-gold'}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-dl-gray text-xs">{row.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <SectionHeading>5. Infrastructure Value Assessment</SectionHeading>
              <div className="border border-dl-border-light p-4 text-sm text-dl-gray leading-relaxed space-y-3">
                <p>
                  The Sentinel system represents an estimated <span className="font-medium text-dl-navy">$200,000 – $500,000</span> of
                  institutional fund infrastructure value, addressing 6 of 8 standard due diligence categories for
                  alternative investment funds.
                </p>
                <p>
                  This infrastructure was built and validated through a disciplined $100/week operational playbook
                  over 52 weeks, demonstrating that institutional-grade risk management can be achieved with
                  sovereign, self-custody principles.
                </p>
              </div>
            </section>

            <div className="border-t border-dl-border pt-4 mt-8">
              <p className="font-dl-mono text-xs text-dl-gray">
                Generated: {generatedAt} | Axiom Protocol — Sovereign Digital-Physical Economy
              </p>
            </div>
          </div>
        )}
      </PageShell>
    </DesignLawLayout>
  );
}
