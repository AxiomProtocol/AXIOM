import { Tooltip } from './Tooltip';

interface RegimeEntry {
  id: string;
  regime: string;
  confidence: string | number;
  created_at: string;
}

interface RegimeTimelineProps {
  entries: RegimeEntry[];
}

const REGIME_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  TREND_UP: { bg: 'bg-green-100', text: 'text-dl-forest', label: 'Trend Up' },
  TREND_DOWN: { bg: 'bg-red-100', text: 'text-dl-error', label: 'Trend Down' },
  RANGE_LOW_VOL: { bg: 'bg-gray-100', text: 'text-dl-gray', label: 'Range / Low Vol' },
  HIGH_VOL_DISLOCATION: { bg: 'bg-yellow-100', text: 'text-dl-gold', label: 'High Vol' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

export function RegimeTimeline({ entries }: RegimeTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className="border border-dl-border-light p-4">
        <p className="text-xs uppercase tracking-wider text-dl-gray mb-3">REGIME HISTORY</p>
        <p className="text-sm text-dl-gray text-center py-4">No regime transitions recorded.</p>
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="border border-dl-border-light p-4">
      <p className="text-xs uppercase tracking-wider text-dl-gray mb-3">REGIME HISTORY</p>
      <div className="flex items-end gap-1 overflow-x-auto pb-2">
        {sorted.map((entry) => {
          const config = REGIME_COLORS[entry.regime] || REGIME_COLORS.RANGE_LOW_VOL;
          const conf = typeof entry.confidence === 'string' ? parseFloat(entry.confidence) : entry.confidence;
          const height = Math.max(24, Math.min(64, conf * 64));

          return (
            <Tooltip
              key={entry.id}
              content={`${config.label} | ${(conf * 100).toFixed(0)}% confidence | ${formatDateTime(entry.created_at)}`}
            >
              <div className="flex flex-col items-center gap-1 min-w-[40px]" tabIndex={0}>
                <div
                  className={`w-full ${config.bg} border border-dl-border-light`}
                  style={{ height: `${height}px` }}
                  aria-label={`${config.label} regime, ${(conf * 100).toFixed(0)}% confidence`}
                />
                <span className="font-dl-mono text-[10px] text-dl-gray">{formatDate(entry.created_at)}</span>
              </div>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-dl-border-light">
        {Object.entries(REGIME_COLORS).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-3 h-3 ${config.bg} border border-dl-border-light`} />
            <span className="text-[10px] text-dl-gray">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
