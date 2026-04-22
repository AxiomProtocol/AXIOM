// Shared CollateralClassBadge — renders the GREEN/YELLOW/RED admission class
// from the Collateral Risk Policy. Used by the operator cap-infra console and
// by public asset/disclosure pages so allocators see the same live state the
// policy evaluator enforces server-side.
export type CollateralClass = 'GREEN' | 'YELLOW' | 'RED';

const STYLES: Record<CollateralClass, string> = {
  GREEN: 'border-emerald-700 bg-emerald-50 text-emerald-800',
  YELLOW: 'border-amber-500 bg-amber-50 text-amber-800',
  RED: 'border-red-700 bg-red-50 text-red-800',
};

export function CollateralClassBadge({
  value,
  size = 'sm',
}: {
  value: CollateralClass;
  size?: 'sm' | 'md';
}) {
  const sizeClass =
    size === 'md'
      ? 'px-2 py-1 text-xs'
      : 'px-1.5 py-0.5 text-[10px]';
  return (
    <span
      className={`inline-block uppercase tracking-wider font-bold border ${sizeClass} ${STYLES[value]}`}
    >
      {value}
    </span>
  );
}
