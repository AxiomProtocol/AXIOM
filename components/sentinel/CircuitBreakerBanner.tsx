interface CircuitBreakerBannerProps {
  state: string;
}

const STATE_CONFIG: Record<string, { label: string; sublabel: string; borderColor: string; textColor: string; bgColor: string }> = {
  SAFE_MODE: {
    label: 'SAFE MODE',
    sublabel: 'Authorization Layer Degraded — High-risk capital actions blocked',
    borderColor: 'border-yellow-600',
    textColor: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
  },
  DEFENSIVE_MODE: {
    label: 'CAPITAL PRESERVATION PROTOCOL ACTIVE',
    sublabel: 'Sentinel Offline — Capital deployment frozen, preservation operations only',
    borderColor: 'border-red-700',
    textColor: 'text-red-800',
    bgColor: 'bg-red-50',
  },
  RECOVERY_PENDING: {
    label: 'RECOVERY PENDING',
    sublabel: 'Health checks restored — Awaiting manual confirmation to resume normal operations',
    borderColor: 'border-blue-600',
    textColor: 'text-blue-800',
    bgColor: 'bg-blue-50',
  },
};

export function CircuitBreakerBanner({ state }: CircuitBreakerBannerProps) {
  const config = STATE_CONFIG[state];
  if (!config) return null;

  return (
    <div className={`border-2 ${config.borderColor} ${config.bgColor} p-4 mb-6`} role="alert" aria-live="assertive">
      <p className={`font-dl-mono text-sm font-bold ${config.textColor} tracking-wider`}>{config.label}</p>
      <p className={`text-xs ${config.textColor} mt-1`}>{config.sublabel}</p>
    </div>
  );
}
