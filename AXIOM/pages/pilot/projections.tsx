import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
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
  { color: 'text-dl-gray', borderColor: 'border-dl-border', bgColor: 'bg-dl-bg-alt' },
  { color: 'text-dl-navy', borderColor: 'border-dl-border', bgColor: 'bg-dl-bg-alt' },
  { color: 'text-dl-forest', borderColor: 'border-dl-border', bgColor: 'bg-dl-bg-alt' },
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
    <DesignLawLayout>
      <Head>
        <title>Axiom Capital Program — Return Projections</title>
      </Head>

      <div className="mb-6">
        <h1 className="font-dl-serif text-3xl text-dl-navy">Return Projections</h1>
        <p className="text-sm text-dl-gray mt-1">Model your potential returns across different market scenarios</p>
      </div>

      <PilotNav currentTab="projections" />

      <div className="border border-dl-border bg-dl-bg-alt p-5 mb-8">
        <p className="text-sm text-dl-gray leading-relaxed">Use this calculator to explore potential returns based on your investment amount and hold period. Three scenarios — Conservative, Base Case, and Optimistic — model different occupancy rates, rent growth, and property appreciation to give you a realistic range of outcomes.</p>
      </div>

      <div className="border border-dl-border p-6 mb-8">
        <SectionHeading>Projection Parameters</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-dl-navy mb-2">Investment Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dl-gray">$</span>
              <input
                type="number"
                value={investment}
                onChange={(e) => setInvestment(Math.max(0, Number(e.target.value)))}
                className="w-full pl-8 pr-4 py-2.5 border border-dl-border text-dl-navy bg-dl-bg"
                min={0}
                step={1000}
              />
            </div>
            <p className="text-xs text-dl-gray mt-1">Typical investor check size: $50,000</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-dl-navy mb-2">Hold Period</label>
            <div className="flex gap-2">
              {holdPeriodOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHoldMonths(opt.value)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium ${
                    holdMonths === opt.value
                      ? 'bg-dl-navy text-white'
                      : 'border border-dl-border text-dl-navy bg-dl-bg'
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
            <div key={scenario.label} className={`border ${scenario.borderColor} overflow-hidden`}>
              <div className={`${scenario.bgColor} px-6 py-4 border-b ${scenario.borderColor}`}>
                <h3 className={`font-dl-serif text-lg ${scenario.color}`}>{scenario.label}</h3>
                <div className="flex gap-4 mt-2 text-xs text-dl-gray">
                  <span>{(scenario.occupancy * 100).toFixed(0)}% occupancy</span>
                  <span>{(scenario.rentGrowth * 100).toFixed(0)}% rent growth</span>
                  <span>{(scenario.appreciation * 100).toFixed(0)}% appreciation</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-dl-gray">Annual Cash Yield</span>
                  <span className="text-sm font-dl-mono font-semibold text-dl-navy">{formatPercent(data.annualCashYield)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-dl-gray">Total Cash Distributions</span>
                  <span className="text-sm font-dl-mono font-semibold text-dl-navy">{formatMoney(data.totalCashDistributions)}</span>
                </div>
                <hr className="border-dl-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-dl-gray">Appreciation</span>
                  <span className="text-sm font-dl-mono font-semibold text-dl-navy">{formatPercent(data.appreciationPercent)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-dl-gray">Total Appreciation Gain</span>
                  <span className="text-sm font-dl-mono font-semibold text-dl-navy">{formatMoney(data.totalAppreciationGain)}</span>
                </div>
                <hr className="border-dl-border" />
                <div className={`${scenario.bgColor} p-4`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-dl-navy">Total Return</span>
                    <span className={`text-lg font-dl-mono font-bold ${scenario.color}`}>{formatMoney(data.totalReturn)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-dl-gray">Total Return %</span>
                    <span className="text-sm font-dl-mono font-semibold text-dl-navy">{formatPercent(data.totalReturnPercent)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-dl-gray">Annualized Return</span>
                    <span className="text-sm font-dl-mono font-semibold text-dl-navy">{formatPercent(data.annualizedReturn)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <p className="text-sm text-dl-gray font-dl-mono">Loading server projections...</p>
        </div>
      )}

      {error && (
        <div className="border border-dl-border bg-dl-bg-alt p-4 mb-8">
          <p className="text-dl-gray text-sm">{error}</p>
        </div>
      )}

      <div className="bg-dl-bg-alt border border-dl-border p-6">
        <h3 className="text-sm font-semibold text-dl-navy mb-3">Assumptions & Disclosures</h3>
        <div className="space-y-2 text-xs text-dl-gray leading-relaxed">
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
    </DesignLawLayout>
  );
}
