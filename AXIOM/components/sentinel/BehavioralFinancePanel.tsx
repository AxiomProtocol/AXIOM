export function BehavioralFinancePanel() {
  const biases = [
    { bias: 'FOMO / Greed', mitigation: 'Sentinel requires minimum signal scores before allowing deployment. High conviction is mandatory — not optional.', icon: '↗' },
    { bias: 'Loss Aversion', mitigation: 'Invalidation levels are set before entry. Sentinel does not adjust stops after authorization. The decision is final.', icon: '↙' },
    { bias: 'Recency Bias', mitigation: 'The regime engine uses 20-day and 50-day moving averages, preventing overreaction to single-day moves.', icon: '⟳' },
    { bias: 'Confirmation Bias', mitigation: 'Multi-factor confirmation requires independent agreement across timeframes, volume, risk/reward, and liquidity.', icon: '✓' },
    { bias: 'Overconfidence', mitigation: 'Platt scaling calibrates raw confidence scores against historical outcomes, deflating overconfident estimates.', icon: '⚖' },
    { bias: 'Disposition Effect', mitigation: 'Sentinel treats every decision independently. Past wins or losses do not influence current authorization criteria.', icon: '◎' },
  ];

  return (
    <div className="border border-dl-border-light p-4">
      <p className="text-xs uppercase tracking-wider text-dl-gray mb-3">BEHAVIORAL FINANCE PROTECTION</p>
      <p className="text-xs text-dl-gray leading-relaxed mb-4">
        Sentinel is designed to override common cognitive biases that cause capital losses. Every authorization decision is algorithmic — no human discretion can override the risk criteria during proof-of-concept.
      </p>
      <div className="space-y-3">
        {biases.map((b) => (
          <div key={b.bias} className="flex items-start gap-3 border-b border-dl-border-light pb-3 last:border-b-0 last:pb-0">
            <span className="flex-shrink-0 w-6 h-6 border border-dl-border flex items-center justify-center bg-dl-bg-alt font-dl-mono text-xs text-dl-navy">{b.icon}</span>
            <div>
              <p className="text-sm text-dl-navy font-medium">{b.bias}</p>
              <p className="text-xs text-dl-gray leading-relaxed mt-0.5">{b.mitigation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
