import React from 'react';

interface CollisionWarning {
  type: 'name_variant' | 'date_range' | 'location_spread' | 'generation_gap';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedEvidenceIds?: number[];
}

interface CollisionWarningsProps {
  warnings: CollisionWarning[];
  onResolve?: (warning: CollisionWarning) => void;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    text: 'text-blue-800',
  },
  medium: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-500',
    text: 'text-yellow-800',
  },
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    text: 'text-red-800',
  },
};

const TYPE_LABELS: Record<string, string> = {
  name_variant: 'Name Variation',
  date_range: 'Date Conflict',
  location_spread: 'Location Spread',
  generation_gap: 'Generation Gap',
};

export default function CollisionWarnings({ warnings, onResolve }: CollisionWarningsProps) {
  if (warnings.length === 0) return null;

  const highSeverity = warnings.filter(w => w.severity === 'high');
  const otherWarnings = warnings.filter(w => w.severity !== 'high');

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900 flex items-center gap-2">
        <span className="text-red-500">!</span>
        Identity Collision Warnings ({warnings.length})
      </h4>

      {highSeverity.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 font-medium mb-2">
            {highSeverity.length} high-severity issue(s) require resolution before proceeding
          </p>
        </div>
      )}

      <div className="space-y-2">
        {warnings.map((warning, i) => {
          const styles = SEVERITY_STYLES[warning.severity];
          return (
            <div
              key={i}
              className={`${styles.bg} ${styles.border} border rounded-lg p-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${styles.text}`}>
                      {TYPE_LABELS[warning.type]}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${styles.bg} ${styles.text}`}>
                      {warning.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{warning.message}</p>
                  {warning.affectedEvidenceIds && warning.affectedEvidenceIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Affects evidence: E{warning.affectedEvidenceIds.join(', E')}
                    </p>
                  )}
                </div>
                {onResolve && (
                  <button
                    onClick={() => onResolve(warning)}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
