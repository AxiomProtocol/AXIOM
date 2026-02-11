interface ScoreBandBadgeProps {
  score: number | null;
}

const BANDS: { min: number; label: string; color: string }[] = [
  { min: 0.70, label: 'Exceptional', color: 'text-dl-navy' },
  { min: 0.50, label: 'Strong', color: 'text-dl-forest' },
  { min: 0.31, label: 'Moderate', color: 'text-dl-gold' },
  { min: 0, label: 'Weak', color: 'text-dl-error' },
];

export function ScoreBandBadge({ score }: ScoreBandBadgeProps) {
  if (score === null || score === undefined || isNaN(score)) return <span className="text-dl-gray text-xs">—</span>;
  const band = BANDS.find(b => score >= b.min) || BANDS[BANDS.length - 1];
  return (
    <span className={`text-xs font-dl-mono font-medium ${band.color}`} aria-label={`Score band: ${band.label}`}>
      {band.label}
    </span>
  );
}
