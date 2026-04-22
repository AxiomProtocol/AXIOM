import { useState } from 'react';

interface Scenario {
  regime: string;
  color: string;
  steps: { title: string; detail: string }[];
}

const SCENARIOS: Scenario[] = [
  {
    regime: 'Range / Low Vol',
    color: 'text-dl-gray',
    steps: [
      { title: 'Regime Detection', detail: 'Regime Engine classifies market as Range/Low Vol. SMA20 and SMA50 are flat, volatility is below 3%, breadth score near 0.5.' },
      { title: 'Signal Generation', detail: 'MIRDT scans assets. ETH shows SMA20 crossing below SMA50 with signal strength -2.1. A SHORT setup is generated with 5-day horizon.' },
      { title: 'Confidence Calibration', detail: 'Raw confidence 27% → Platt scaling adjusts to calibrated probability 0.3842. Confirmation score evaluates multi-timeframe alignment.' },
      { title: 'Final Scoring', detail: 'Final score = (calibrated × 0.4) + (confirmation × 0.4) + (regime bonus × 0.2). Score: 0.38 — classified as MODERATE. Does not meet 0.50 threshold.' },
      { title: 'Decision', detail: 'Sentinel DENIES authorization. Reason: LOW_FINAL_SCORE. Capital preserved. This is the system working correctly — it prevented deployment in a low-conviction setup.' },
    ],
  },
  {
    regime: 'Trend Up',
    color: 'text-dl-forest',
    steps: [
      { title: 'Regime Detection', detail: 'Regime Engine classifies Trend Up. SMA20 > SMA50, both slopes positive, breadth score ≥ 0.66. Confidence 0.79.' },
      { title: 'Signal Generation', detail: 'MIRDT detects META with SMA20 crossing above SMA50. Signal strength +2.4 (LONG). Confidence 74%.' },
      { title: 'Confidence Calibration', detail: 'Raw 74% → calibrated 0.6821. Confirmation score 0.65 (multi-TF aligned, volume confirmed, RR acceptable).' },
      { title: 'Final Scoring', detail: 'Final score = 0.5228. Regime bonus +0.15 for LONG in Trend Up. Score: 0.52 — classified as STRONG. Meets 0.50 threshold.' },
      { title: 'Decision', detail: 'Sentinel APPROVES. Regime multiplier 1.0×. Full standard allocation permitted. Decision logged with hash chain entry and cryptographic signature.' },
    ],
  },
  {
    regime: 'Trend Down',
    color: 'text-dl-error',
    steps: [
      { title: 'Regime Detection', detail: 'Regime Engine classifies Trend Down. SMA20 < SMA50, both slopes negative, breadth score ≤ 0.34.' },
      { title: 'Signal Generation', detail: 'MIRDT detects GOOGL with strong downward momentum. Signal strength -3.2 (SHORT). Confidence 25%.' },
      { title: 'Confidence Calibration', detail: 'Raw 25% → calibrated 0.3200. Despite strong signal strength, low base confidence limits the calibrated score.' },
      { title: 'Final Scoring', detail: 'Final score = 0.31. Regime bonus +0.15 for SHORT in Trend Down, but low confirmation pulls score down. Classified as MODERATE.' },
      { title: 'Decision', detail: 'Sentinel DENIES. Score below 0.50 threshold. Even with favorable regime alignment, insufficient conviction. Capital preserved for higher-quality setups.' },
    ],
  },
  {
    regime: 'High Vol Dislocation',
    color: 'text-dl-gold',
    steps: [
      { title: 'Regime Detection', detail: 'Regime Engine detects High Vol Dislocation. 20-day volatility > 3%, vol ratio > 1.5×. Confidence 0.85.' },
      { title: 'System Response', detail: 'ALL non-parameter capital deployment is immediately suspended. Regime multiplier drops to 0.3×. System stance shifts to HALTED.' },
      { title: 'Signal Processing', detail: 'Signals are still generated and scored for monitoring purposes, but none can receive APPROVED authorization.' },
      { title: 'Authorization Rule', detail: 'Any SWAP, TREASURY_DEPLOY, LEND_ISSUE, or other capital action is automatically DENIED with reason: HIGH_VOL_REGIME.' },
      { title: 'Capital Preservation', detail: 'System preserves capital until regime transitions to a lower-volatility state. This is the most conservative stance — designed to protect against crisis periods.' },
    ],
  },
];

export function WalkthroughStepper() {
  const [activeTab, setActiveTab] = useState(0);
  const scenario = SCENARIOS[activeTab];

  return (
    <div className="border border-dl-border-light">
      <p className="text-xs uppercase tracking-wider text-dl-gray p-4 border-b border-dl-border-light">EXAMPLE SCENARIO WALKTHROUGH</p>
      <div className="flex border-b border-dl-border-light">
        {SCENARIOS.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(i); } }}
            className={`flex-1 px-3 py-2 text-xs font-dl-mono text-center border-r border-dl-border-light last:border-r-0 ${
              activeTab === i ? 'bg-dl-bg-alt font-medium text-dl-navy' : 'bg-dl-bg text-dl-gray'
            }`}
            aria-selected={activeTab === i}
            role="tab"
          >
            {s.regime}
          </button>
        ))}
      </div>
      <div className="p-4" role="tabpanel">
        <div className="space-y-3">
          {scenario.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 border border-dl-border flex items-center justify-center bg-dl-bg-alt">
                <span className="font-dl-mono text-xs text-dl-navy">{i + 1}</span>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${scenario.color}`}>{step.title}</p>
                <p className="text-xs text-dl-gray leading-relaxed mt-1">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
