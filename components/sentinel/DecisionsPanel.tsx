import { Tooltip } from './Tooltip';

interface Decision {
  id: string;
  scope: string;
  action_type: string;
  subject: string;
  max_notional: string;
  decision: string;
  reason_code: string;
  plain_language?: string;
  created_at: string;
}

interface DecisionsPanelProps {
  decisions: Decision[];
}

const REASON_TOOLTIPS: Record<string, string> = {
  CRITERIA_MET: 'All risk criteria were satisfied. Signal score, confirmation score, and regime conditions all met minimum thresholds.',
  HIGH_VOL_REGIME: 'Market is in High Volatility Dislocation. All non-parameter capital actions are suspended until regime stabilizes.',
  LOW_FINAL_SCORE: 'The composite signal score is below the 0.50 minimum threshold. Insufficient conviction for capital deployment.',
  LOW_CONFIRMATION: 'Multi-factor confirmation score is below 0.40 threshold. Not enough independent factors agree on the signal direction.',
  EXCEEDS_NOTIONAL_LIMIT: 'Requested notional amount exceeds the maximum allowed for this action type.',
};

function formatNotional(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUTC(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

export function DecisionsPanel({ decisions }: DecisionsPanelProps) {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="border border-dl-border-light p-6 text-center">
        <p className="text-sm text-dl-gray">No decisions recorded.</p>
      </div>
    );
  }

  return (
    <div className="border border-dl-border overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-dl-bg-alt">
            <th className="px-3 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Time</th>
            <th className="px-3 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Scope</th>
            <th className="px-3 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Action</th>
            <th className="px-3 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Subject</th>
            <th className="px-3 py-2 text-right text-xs font-dl-mono text-dl-gray uppercase">Notional</th>
            <th className="px-3 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Decision</th>
            <th className="px-3 py-2 text-left text-xs font-dl-mono text-dl-gray uppercase">Reason</th>
          </tr>
        </thead>
        <tbody>
          {decisions.map((d, i) => (
            <tr key={d.id} className={i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}>
              <td className="px-3 py-2 text-xs font-dl-mono text-dl-gray whitespace-nowrap">{formatUTC(d.created_at)}</td>
              <td className="px-3 py-2 text-xs text-dl-navy">{d.scope}</td>
              <td className="px-3 py-2 text-xs text-dl-gray">{d.action_type}</td>
              <td className="px-3 py-2 text-xs font-medium text-dl-navy">{d.subject}</td>
              <td className="px-3 py-2 text-xs font-dl-mono text-dl-navy text-right">{formatNotional(d.max_notional)}</td>
              <td className="px-3 py-2">
                <span className={`text-xs font-medium ${d.decision === 'APPROVED' ? 'text-dl-forest' : 'text-dl-error'}`}>
                  {d.decision}
                </span>
              </td>
              <td className="px-3 py-2">
                <Tooltip content={d.plain_language || REASON_TOOLTIPS[d.reason_code] || d.reason_code}>
                  <span className="font-dl-mono text-xs text-dl-gray underline decoration-dotted cursor-help" tabIndex={0}>
                    {d.reason_code}
                  </span>
                </Tooltip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
