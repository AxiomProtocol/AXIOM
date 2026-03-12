import { useState } from 'react';
import { useRouter } from 'next/router';

interface CapitalReadinessProps {
  assumptions: {
    purchasePrice: string;
    rehabBudget: string;
    downPaymentPct: string;
    closingCostPct: string;
  };
  metrics: Record<string, any> | null;
  dealGrade?: string;
  dealId?: string;
}

interface ReadinessChannel {
  label: string;
  score: number;
  status: 'strong' | 'moderate' | 'weak';
  note: string;
}

function computeCapitalReadiness(assumptions: CapitalReadinessProps['assumptions'], metrics: Record<string, any> | null) {
  const purchasePrice = Number(assumptions.purchasePrice) || 0;
  const rehabBudget = Number(assumptions.rehabBudget) || 0;
  const downPaymentPct = Number(assumptions.downPaymentPct) || 20;
  const closingCostPct = Number(assumptions.closingCostPct) || 3;

  const downPayment = purchasePrice * (downPaymentPct / 100);
  const closingCosts = purchasePrice * (closingCostPct / 100);
  const sponsorContribution = downPayment + rehabBudget + closingCosts;
  const debtAmount = purchasePrice - downPayment;
  const totalCapitalRequired = purchasePrice + rehabBudget + closingCosts;
  const equityGap = totalCapitalRequired - debtAmount;

  const dscr = metrics ? Number(metrics.dscr) || 0 : 0;
  const cashOnCash = metrics ? Number(metrics.cashOnCash) || 0 : 0;
  const ltv = purchasePrice > 0 ? (debtAmount / purchasePrice) * 100 : 0;

  const channels: ReadinessChannel[] = [];

  const selfFundScore = equityGap < 50000 ? 85 : equityGap < 100000 ? 65 : equityGap < 250000 ? 40 : 20;
  channels.push({
    label: 'Self-Fund',
    score: selfFundScore,
    status: selfFundScore >= 70 ? 'strong' : selfFundScore >= 50 ? 'moderate' : 'weak',
    note: `Equity requirement: $${equityGap.toLocaleString()}`,
  });

  let privateLenderScore = 50;
  if (dscr >= 1.25) privateLenderScore += 20;
  else if (dscr >= 1.0) privateLenderScore += 10;
  else privateLenderScore -= 15;
  if (ltv <= 75) privateLenderScore += 15;
  else if (ltv <= 80) privateLenderScore += 5;
  else privateLenderScore -= 10;
  privateLenderScore = Math.max(0, Math.min(100, privateLenderScore));
  channels.push({
    label: 'Private Lender',
    score: privateLenderScore,
    status: privateLenderScore >= 70 ? 'strong' : privateLenderScore >= 50 ? 'moderate' : 'weak',
    note: `LTV: ${ltv.toFixed(0)}% | DSCR: ${dscr.toFixed(2)}`,
  });

  let jvScore = 50;
  if (cashOnCash >= 10) jvScore += 20;
  else if (cashOnCash >= 6) jvScore += 10;
  else jvScore -= 10;
  if (equityGap >= 100000) jvScore += 10;
  if (dscr >= 1.2) jvScore += 10;
  jvScore = Math.max(0, Math.min(100, jvScore));
  channels.push({
    label: 'JV Partner',
    score: jvScore,
    status: jvScore >= 70 ? 'strong' : jvScore >= 50 ? 'moderate' : 'weak',
    note: `CoC: ${cashOnCash.toFixed(1)}% | Gap: $${equityGap.toLocaleString()}`,
  });

  let debtLenderScore = 50;
  if (dscr >= 1.25) debtLenderScore += 25;
  else if (dscr >= 1.1) debtLenderScore += 10;
  else debtLenderScore -= 20;
  if (ltv <= 70) debtLenderScore += 15;
  else if (ltv <= 80) debtLenderScore += 5;
  else debtLenderScore -= 10;
  debtLenderScore = Math.max(0, Math.min(100, debtLenderScore));
  channels.push({
    label: 'Debt Lender',
    score: debtLenderScore,
    status: debtLenderScore >= 70 ? 'strong' : debtLenderScore >= 50 ? 'moderate' : 'weak',
    note: `DSCR: ${dscr.toFixed(2)} | LTV: ${ltv.toFixed(0)}%`,
  });

  let poolScore = 50;
  if (cashOnCash >= 8) poolScore += 15;
  if (dscr >= 1.15) poolScore += 15;
  if (equityGap >= 50000 && equityGap <= 500000) poolScore += 10;
  poolScore = Math.max(0, Math.min(100, poolScore));
  channels.push({
    label: 'Community Pool',
    score: poolScore,
    status: poolScore >= 70 ? 'strong' : poolScore >= 50 ? 'moderate' : 'weak',
    note: `Suitable for pooled capital structures`,
  });

  return {
    totalCapitalRequired,
    sponsorContribution,
    debtAmount,
    equityGap,
    ltv,
    channels,
  };
}

const STATUS_STYLES: Record<string, string> = {
  strong: 'text-green-700 bg-green-50 border-green-300',
  moderate: 'text-yellow-700 bg-yellow-50 border-yellow-300',
  weak: 'text-red-700 bg-red-50 border-red-300',
};

const BAR_COLORS: Record<string, string> = {
  strong: 'bg-green-600',
  moderate: 'bg-yellow-500',
  weak: 'bg-red-500',
};

export default function CapitalReadinessCard({ assumptions, metrics, dealId }: CapitalReadinessProps) {
  const readiness = computeCapitalReadiness(assumptions, metrics);
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleCreateOffering = async () => {
    if (!dealId) return;
    setCreating(true);
    try {
      const res = await fetch('/api/syndication/offerings/create-from-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, offeringType: 'clubDeal' }),
      });
      const json = await res.json();
      if (json.success && json.offeringId) {
        router.push(`/syndication/offerings/${json.offeringId}`);
      }
    } catch (err) {
      console.error('Failed to create offering', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border border-dl-border p-6 mt-6">
      <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Capital Readiness</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-dl-border p-3">
          <span className="block text-xs font-dl-mono text-dl-muted uppercase">Total Capital Required</span>
          <span className="block font-dl-mono text-lg text-dl-navy">${readiness.totalCapitalRequired.toLocaleString()}</span>
        </div>
        <div className="border border-dl-border p-3">
          <span className="block text-xs font-dl-mono text-dl-muted uppercase">Sponsor Contribution</span>
          <span className="block font-dl-mono text-lg text-dl-navy">${readiness.sponsorContribution.toLocaleString()}</span>
        </div>
        <div className="border border-dl-border p-3">
          <span className="block text-xs font-dl-mono text-dl-muted uppercase">Debt Amount</span>
          <span className="block font-dl-mono text-lg text-dl-navy">${readiness.debtAmount.toLocaleString()}</span>
        </div>
        <div className="border border-dl-border p-3">
          <span className="block text-xs font-dl-mono text-dl-muted uppercase">Equity Gap</span>
          <span className="block font-dl-mono text-lg text-dl-navy">${readiness.equityGap.toLocaleString()}</span>
        </div>
      </div>

      <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3 border-b border-dl-border pb-1">Funding Channel Readiness</h3>
      <div className="space-y-3">
        {readiness.channels.map((channel) => (
          <div key={channel.label} className="border border-dl-border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-dl-mono text-sm text-dl-navy font-bold">{channel.label}</span>
              <span className={`px-2 py-0.5 text-xs font-dl-mono font-bold uppercase border ${STATUS_STYLES[channel.status]}`}>
                {channel.status}
              </span>
            </div>
            <div className="w-full bg-gray-100 h-2 mb-1">
              <div
                className={`h-2 ${BAR_COLORS[channel.status]}`}
                style={{ width: `${channel.score}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-dl-mono text-xs text-dl-muted">{channel.note}</span>
              <span className="font-dl-mono text-xs text-dl-muted">{channel.score}/100</span>
            </div>
          </div>
        ))}
      </div>

      {dealId && metrics && (
        <div className="mt-6 border-t border-dl-border pt-4">
          <button
            onClick={handleCreateOffering}
            disabled={creating}
            className="w-full bg-dl-forest text-white px-6 py-2.5 font-dl-mono text-sm disabled:opacity-50"
          >
            {creating ? 'Creating Offering...' : 'Proceed to Offering'}
          </button>
          <p className="font-dl-mono text-xs text-dl-muted text-center mt-2">
            Create a capital formation offering from this deal and its underwriting data
          </p>
        </div>
      )}
    </div>
  );
}
