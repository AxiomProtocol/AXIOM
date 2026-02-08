import { useState, useEffect } from 'react';
import Head from 'next/head';
import PilotNav from '../../components/pilot/PilotNav';

interface BenchmarkData {
  id: string;
  pilotReturn: string | number | null;
  localCapRate: string | number | null;
  treasuryYield10yr: string | number | null;
  sp500Return: string | number | null;
  recordDate: string;
}

interface GateCheck {
  id: string;
  checkDate: string;
  occupancyAbove90: boolean;
  reservesFullyFunded: boolean;
  consecutivePositiveMonths: number;
  investorSatisfactionScore: string | number | null;
  totalAssetsUnderManagement: string | number | null;
  overallReady: boolean;
  notes: string | null;
}

function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return num.toFixed(2) + '%';
}

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toNum(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? null : num;
}

export default function PerformancePage() {
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [gate, setGate] = useState<GateCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningGate, setRunningGate] = useState(false);

  async function fetchData() {
    try {
      const [benchRes, gateRes] = await Promise.all([
        fetch('/api/pilot/benchmarks'),
        fetch('/api/pilot/expansion-gate'),
      ]);
      const benchResult = await benchRes.json();
      const gateResult = await gateRes.json();

      if (benchResult.success) {
        setBenchmarks(Array.isArray(benchResult.data) ? benchResult.data : []);
      }
      if (gateResult.success && gateResult.data) {
        setGate(gateResult.data);
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function runGateEvaluation() {
    setRunningGate(true);
    try {
      const res = await fetch('/api/pilot/expansion-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkDate: new Date().toISOString() }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setGate(result.data);
      }
    } catch {
      setError('Failed to run gate evaluation');
    } finally {
      setRunningGate(false);
    }
  }

  const latest = benchmarks.length > 0 ? benchmarks[0] : null;
  const pilotReturn = toNum(latest?.pilotReturn);
  const localCapRate = toNum(latest?.localCapRate);
  const treasury10yr = toNum(latest?.treasuryYield10yr);
  const sp500 = toNum(latest?.sp500Return);

  const benchmarkItems = [
    { label: 'Pilot Return', value: pilotReturn, formatted: formatPercent(pilotReturn), isPilot: true },
    { label: 'Local Cap Rate', value: localCapRate, formatted: formatPercent(localCapRate), isPilot: false },
    { label: '10yr Treasury', value: treasury10yr, formatted: formatPercent(treasury10yr), isPilot: false },
    { label: 'S&P 500', value: sp500, formatted: formatPercent(sp500), isPilot: false },
  ];

  const gateCriteria = gate ? [
    { label: 'Occupancy Above 90%', met: gate.occupancyAbove90, required: true },
    { label: 'Reserves Fully Funded', met: gate.reservesFullyFunded, required: true },
    { label: '6+ Consecutive Positive Months', met: gate.consecutivePositiveMonths >= 6, required: true },
    { label: 'Investor Satisfaction Score (4.0+/5.0)', met: toNum(gate.investorSatisfactionScore) !== null && toNum(gate.investorSatisfactionScore)! >= 4.0, required: false },
    { label: 'Total AUM > $900K', met: toNum(gate.totalAssetsUnderManagement) !== null && toNum(gate.totalAssetsUnderManagement)! >= 900000, required: false },
  ] : null;

  const roadmapSteps = [
    { label: '$1M Pilot', description: 'Current Phase', active: true },
    { label: '$3-5M Expansion', description: 'Phase 2', active: false },
    { label: 'Land Aggregation', description: 'Phase 3', active: false },
  ];

  return (
    <>
      <Head>
        <title>Axiom Economic Pilot — Performance & Growth</title>
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Performance & Growth</h1>
            <p className="text-gray-500 mt-1">Track pilot returns against market benchmarks and Phase 2 expansion readiness</p>
          </div>

          <PilotNav currentTab="performance" />

          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 rounded-xl p-5 mb-8">
            <p className="text-sm text-teal-800 leading-relaxed">How does the pilot stack up against traditional benchmarks? This page compares our returns to local cap rates, 10-year Treasury yields, and the S&P 500. It also tracks our Phase 2 expansion scorecard — the criteria we must meet before scaling from $1M to $3-5M.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              <span className="ml-3 text-gray-500">Loading performance data...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance vs Benchmarks</h2>
                {!latest ? (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <p className="text-gray-500">Benchmarks will be populated after first operating quarter</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {benchmarkItems.map((item) => {
                      const outperforms = item.isPilot
                        ? true
                        : pilotReturn !== null && item.value !== null && pilotReturn > item.value;
                      return (
                        <div key={item.label} className="bg-gray-50 rounded-lg p-5 text-center">
                          <p className="text-sm text-gray-500 mb-2">{item.label}</p>
                          <p className="text-2xl font-bold text-gray-900">{item.formatted}</p>
                          {!item.isPilot && item.value !== null && pilotReturn !== null && (
                            <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              outperforms ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {outperforms ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              )}
                              {outperforms ? 'Outperforming' : 'Underperforming'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Phase 2 Expansion Scorecard</h2>
                  <button
                    onClick={runGateEvaluation}
                    disabled={runningGate}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {runningGate ? 'Evaluating...' : 'Run Gate Evaluation'}
                  </button>
                </div>

                {!gate ? (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <p className="text-gray-500">No gate evaluation has been performed yet. Click "Run Gate Evaluation" to begin.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-6">
                      {gateCriteria!.map((criterion) => (
                        <div key={criterion.label} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            criterion.met ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {criterion.met ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">{criterion.label}</span>
                            {criterion.required && (
                              <span className="ml-2 text-xs text-gray-400">(required)</span>
                            )}
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            criterion.met ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {criterion.met ? 'Met' : 'Not Met'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center">
                      <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold ${
                        gate.overallReady
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {gate.overallReady ? (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            READY FOR EXPANSION
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            NOT YET READY
                          </>
                        )}
                      </div>
                    </div>

                    {gate.notes && (
                      <p className="mt-4 text-sm text-gray-500 text-center">{gate.notes}</p>
                    )}
                  </>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Expansion Roadmap</h2>
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                  {roadmapSteps.map((step, idx) => (
                    <div key={step.label} className="flex items-center flex-1">
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                          step.active
                            ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <p className={`mt-2 text-sm font-semibold ${step.active ? 'text-teal-700' : 'text-gray-500'}`}>
                          {step.label}
                        </p>
                        <p className={`text-xs ${step.active ? 'text-teal-600' : 'text-gray-400'}`}>
                          {step.description}
                        </p>
                      </div>
                      {idx < roadmapSteps.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-3 ${step.active ? 'bg-teal-300' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
