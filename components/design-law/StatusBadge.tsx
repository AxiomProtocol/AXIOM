const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'text-dl-forest',
  EXPIRED: 'text-dl-gray',
  INVALIDATED: 'text-dl-error',
  WIN: 'text-dl-forest',
  LOSS: 'text-dl-error',
  FLAT: 'text-dl-gray',
  OPEN: 'text-dl-navy',
  CLOSED: 'text-dl-gray',
  PENDING: 'text-dl-gold',
};

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const label = status || '—';
  const style = STATUS_STYLES[label.toUpperCase()] || 'text-dl-gray';
  return (
    <span className={`font-medium ${style} ${className}`}>{label}</span>
  );
}
