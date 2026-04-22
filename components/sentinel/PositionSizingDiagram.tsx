export function PositionSizingDiagram() {
  return (
    <div className="border border-dl-border-light p-4">
      <p className="text-xs uppercase tracking-wider text-dl-gray mb-3">POSITION SIZING LOGIC</p>
      <div className="space-y-2 font-dl-mono text-xs text-dl-gray">
        <div className="border border-dl-border-light p-2 bg-dl-bg-alt">
          <span className="text-dl-navy font-medium">Step 1:</span> Target Vol ÷ Asset Vol = Raw Weight
        </div>
        <div className="text-center text-dl-gray">↓</div>
        <div className="border border-dl-border-light p-2 bg-dl-bg-alt">
          <span className="text-dl-navy font-medium">Step 2:</span> Cap at Single Position Limit (10%)
        </div>
        <div className="text-center text-dl-gray">↓</div>
        <div className="border border-dl-border-light p-2 bg-dl-bg-alt">
          <span className="text-dl-navy font-medium">Step 3:</span> Check Correlated Exposure Limit (25%)
        </div>
        <div className="text-center text-dl-gray">↓</div>
        <div className="border border-dl-border-light p-2 bg-dl-bg-alt">
          <span className="text-dl-navy font-medium">Step 4:</span> Apply Regime Multiplier
        </div>
        <div className="text-center text-dl-gray">↓</div>
        <div className="border border-dl-border-light p-2 bg-dl-bg-alt">
          <span className="text-dl-navy font-medium">Result:</span> Final Notional = Weight × Total Capital
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="border border-dl-border-light p-2 bg-dl-bg-alt">
          <p className="text-xs text-dl-gray">Trend Up</p>
          <p className="font-dl-mono text-xs text-dl-forest">× 1.0</p>
        </div>
        <div className="border border-dl-border-light p-2 bg-dl-bg-alt">
          <p className="text-xs text-dl-gray">Range/Low Vol</p>
          <p className="font-dl-mono text-xs text-dl-gray">× 0.7</p>
        </div>
        <div className="border border-dl-border-light p-2 bg-dl-bg-alt">
          <p className="text-xs text-dl-gray">Trend Down</p>
          <p className="font-dl-mono text-xs text-dl-error">× 0.5</p>
        </div>
        <div className="border border-dl-border-light p-2 bg-dl-bg-alt">
          <p className="text-xs text-dl-gray">High Vol Disloc.</p>
          <p className="font-dl-mono text-xs text-dl-gold">× 0.3</p>
        </div>
      </div>
    </div>
  );
}
