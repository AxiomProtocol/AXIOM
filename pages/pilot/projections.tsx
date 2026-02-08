import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import PilotNav from '../../components/pilot/PilotNav';

interface ScenarioData {
  annualCashYield: number;
  totalCashDistributions: number;
  appreciationPercent: number;
  totalAppreciationGain: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
}

interface ScenarioParams {
  label: string;
  occupancy: number;
  rentGrowth: number;
  appreciation: number;
  color: string;
  borderColor: string;
  bgColor: string;
}

interface ServerConfig {
  scenarios: { label: string; occupancy: number; rentGrowth: number; appreciation: number }[];
  baseNOIRate: number;
  source: string;
}

const SCENARIO_STYLES: { color: string; borderColor: string; bgColor: string }[] = [
  { color: 'text-gray-700', borderColor: 'border-gray-300', bgColor: 'bg-gray-50' },
  { color: 'text-teal-700', borderColor: 'border-teal-300', bgColor: 'bg-teal-50' },
  { color: 'text-emerald-700', borderColor: 'border-emerald-300', bgColor: 'bg-emerald-50' },
];

function formatMoney(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number): string {
  return value.toFixed(2) + '%';
}

function calculateScenario(investment: number, holdMonths: number, scenario: ScenarioParams, baseNOIRate: number = 0.08): ScenarioData {
  const years = holdMonths / 12;
  const annualCashYield = baseNOIRate * scenario.occupancy * (1 + scenario.rentGrowth * years / 2);
  const totalCashDistributions = investment * annualCashYield * years;
  const appreciationPercent = scenario.appreciation * years;
  const totalAppreciationGain = investment * appreciationPercent;
  const totalReturn = totalCashDistributions + totalAppreciationGain;
  const totalReturnPercent = (totalReturn / investment) * 100;
  const annualizedReturn = years > 0 ? (Math.pow(1 + totalReturn / investment, 1 / years) - 1) * 100 : 0;

  return {
    annualCashYield: annualCashYield * 100,
    totalCashDistributions,
    appreciationPercent: appreciationPercent * 100,
    totalAppreciationGain,
    totalReturn,
    totalReturnPercent,
    annualizedReturn,
  };
}

export default function ProjectionsPage() {
  const [investment, setInvestment] = useState<number>(50000);
  const [holdMonths, setHoldMonths] = useState<number>(24);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjections() {
      try {
        const res = await fetch('/api/pilot/projections');
        const result = await res.json();
        if (result.success) {
          setServerConfig(result.config || null);
        }
      } catch {
        setError('Unable to load projection configuration');
      } finally {
        setLoading(false);
      }
    }
    fetchProjections();
  }, []);

  const scenarios: ScenarioParams[] = useMemo(() => {
    if (serverConfig?.scenarios) {
      return serverConfig.scenarios.map((s, i) => ({
        ...s,
        ...(SCENARIO_STYLES[i] || SCENARIO_STYLES[0]),
      }));
    }
    return [
      { label: 'Conservative', occupancy: 0.85, rentGrowth: 0.00, appreciation: 0.05, ...SCENARIO_STYLES[0] },
      { label: 'Base Case', occupancy: 0.93, rentGrowth: 0.02, appreciation: 0.12, ...SCENARIO_STYLES[1] },
      { label: 'Optimistic', occupancy: 0.97, rentGrowth: 0.04, appreciation: 0.20, ...SCENARIO_STYLES[2] },
    ];
  }, [serverConfig]);

  const baseNOIRate = serverConfig?.baseNOIRate ?? 0.08;

  const projections = useMemo(() => {
    return scenarios.map((s) => calculateScenario(investment, holdMonths, s, baseNOIRate));
  }, [investment, holdMonths, scenarios, baseNOIRate]);

  const holdPeriodOptions = [
    { value: 12, label: '12 Months' },
    { value: 24, label: '24 Months' },
    { value: 36, label: '36 Months' },
  ];

  return (
    <>
      <Head>
        <title>Axiom Economic Pilot — Return Projections</title>
      </Head>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Return Projections</h1>
            <p className="text-gray-500 mt-1">Model your potential returns across different market scenarios</p>
          </div>

          <PilotNav currentTab="projections" />

          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 rounded-xl p-5 mb-8">
            <p className="text-sm text-teal-800 leading-relaxed">Use this calculator to explore potential returns based on your investment amount and hold period. Three scenarios — Conservative, Base Case, and Optimistic — model different occupancy rates, rent growth, and property appreciation to give you a realistic range of outcomes.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Projection Parameters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Investment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={investment}
                    onChange={(e) => setInvestment(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    min={0}
                    step={1000}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Typical investor check size: $50,000</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hold Period</label>
                <div className="flex gap-2">
                  {holdPeriodOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setHoldMonths(opt.value)}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        holdMonths === opt.value
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {scenarios.map((scenario, idx) => {
              const data = projections[idx];
              return (
                <div key={scenario.label} className={`border ${scenario.borderColor} rounded-xl overflow-hidden shadow-sm`}>
                  <div className={`${scenario.bgColor} px-6 py-4 border-b ${scenario.borderColor}`}>
                    <h3 className={`text-lg font-semibold ${scenario.color}`}>{scenario.label}</h3>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>{(scenario.occupancy * 100).toFixed(0)}% occupancy</span>
                      <span>{(scenario.rentGrowth * 100).toFixed(0)}% rent growth</span>
                      <span>{(scenario.appreciation * 100).toFixed(0)}% appreciation</span>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Annual Cash Yield</span>
                      <span className="text-sm font-semibold text-gray-900">{formatPercent(data.annualCashYield)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Total Cash Distributions</span>
                      <span className="text-sm font-semibold text-gray-900">{formatMoney(data.totalCashDistributions)}</span>
                    </div>
                    <hr className="border-gray-100" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Appreciation</span>
                      <span className="text-sm font-semibold text-gray-900">{formatPercent(data.appreciationPercent)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Total Appreciation Gain</span>
                      <span className="text-sm font-semibold text-gray-900">{formatMoney(data.totalAppreciationGain)}</span>
                    </div>
                    <hr className="border-gray-100" />
                    <div className={`${scenario.bgColor} rounded-lg p-4`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Total Return</span>
                        <span className={`text-lg font-bold ${scenario.color}`}>{formatMoney(data.totalReturn)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Total Return %</span>
                        <span className="text-sm font-semibold text-gray-900">{formatPercent(data.totalReturnPercent)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Annualized Return</span>
                        <span className="text-sm font-semibold text-gray-900">{formatPercent(data.annualizedReturn)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
              <span className="ml-3 text-gray-500 text-sm">Loading server projections...</span>
            </div>
          )}

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
              <p className="text-amber-700 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Assumptions & Disclosures</h3>
            <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
              <p>
                These projections are based on modeled assumptions and are provided for informational purposes only.
                They do not constitute a guarantee of future performance, an offer to sell, or a solicitation to purchase
                any interest in the pilot program or any SPV.
              </p>
              <p>
                Cash yield estimates are derived from assumed occupancy rates, base Net Operating Income (NOI) rates of 8%,
                and projected rent growth over the holding period. Appreciation estimates reflect assumed annual property
                value increases based on comparable market data.
              </p>
              <p>
                Actual results may differ materially from these projections due to market conditions, tenant performance,
                maintenance costs, interest rate changes, regulatory actions, and other factors beyond the control of the
                fund manager. Past performance is not indicative of future results.
              </p>
              <p>
                Investors should review the complete offering memorandum, operating agreement, and risk disclosures before
                making any investment decision. All investments carry risk, including the potential loss of principal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
