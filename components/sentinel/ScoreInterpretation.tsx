export function ScoreInterpretation() {
  const bands = [
    { range: '0.00 – 0.30', label: 'Weak', color: 'text-dl-error', description: 'Insufficient conviction. Signal does not meet minimum criteria for capital deployment.' },
    { range: '0.31 – 0.49', label: 'Moderate', color: 'text-dl-gold', description: 'Partial criteria met. May qualify under favorable regime conditions with reduced sizing.' },
    { range: '0.50 – 0.69', label: 'Strong', color: 'text-dl-forest', description: 'Core criteria satisfied. Standard allocation permitted within portfolio constraints.' },
    { range: '0.70 – 1.00', label: 'Exceptional', color: 'text-dl-navy', description: 'High-conviction signal. Maximum allocation permitted within risk limits.' },
  ];

  return (
    <div className="border border-dl-border-light p-4">
      <p className="text-xs uppercase tracking-wider text-dl-gray mb-3">SCORE INTERPRETATION</p>
      <div className="space-y-3">
        {bands.map((b) => (
          <div key={b.label} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-24">
              <span className="font-dl-mono text-xs text-dl-gray">{b.range}</span>
            </div>
            <div className="flex-shrink-0 w-20">
              <span className={`text-xs font-dl-mono font-medium ${b.color}`}>{b.label}</span>
            </div>
            <p className="text-xs text-dl-gray leading-relaxed">{b.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
