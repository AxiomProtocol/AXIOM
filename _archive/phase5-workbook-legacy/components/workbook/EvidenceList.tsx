import React from 'react';

interface EvidenceItem {
  id: number;
  title: string;
  recordType: string;
  primaryOrSecondary: string;
  confidenceLevel: string;
  sourceName: string;
  dateAccessed: Date;
  yearRangeStart?: number | null;
  yearRangeEnd?: number | null;
  county?: string | null;
  state?: string | null;
}

interface EvidenceListProps {
  items: EvidenceItem[];
  onSelect?: (id: number) => void;
  selectedId?: number | null;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  verified: 'bg-green-100 text-green-800',
  supported: 'bg-blue-100 text-blue-800',
  unsupported: 'bg-gray-100 text-gray-600',
  conflicting: 'bg-red-100 text-red-800',
};

const RECORD_TYPE_ICONS: Record<string, string> = {
  deed: '📜',
  census: '📊',
  probate: '⚖️',
  tax: '💰',
  birth: '👶',
  death: '🪦',
  marriage: '💍',
  military: '🎖️',
  newspaper: '📰',
  photo: '📷',
  other: '📄',
};

export default function EvidenceList({ items, onSelect, selectedId }: EvidenceListProps) {
  if (items.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">No evidence items yet</p>
        <p className="text-sm text-gray-400 mt-1">Add evidence to start building your case</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatYearRange = (start?: number | null, end?: number | null) => {
    if (!start && !end) return null;
    if (start === end || !end) return `${start}`;
    return `${start}-${end}`;
  };

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect?.(item.id)}
          className={`bg-white rounded-lg border p-4 cursor-pointer transition ${
            selectedId === item.id
              ? 'border-amber-400 ring-2 ring-amber-200'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">
                {RECORD_TYPE_ICONS[item.recordType] || RECORD_TYPE_ICONS.other}
              </span>
              <div>
                <h4 className="font-medium text-gray-900">{item.title}</h4>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  <span className="capitalize">{item.recordType}</span>
                  <span className="text-gray-300">|</span>
                  <span className={item.primaryOrSecondary === 'primary' ? 'text-green-600' : 'text-gray-500'}>
                    {item.primaryOrSecondary === 'primary' ? 'Primary Source' : 'Secondary Source'}
                  </span>
                </div>
              </div>
            </div>

            <span className={`px-2 py-1 rounded-full text-xs font-medium ${CONFIDENCE_COLORS[item.confidenceLevel] || CONFIDENCE_COLORS.unsupported}`}>
              {item.confidenceLevel}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            <span>Source: {item.sourceName}</span>
            {item.county && item.state && (
              <span>{item.county}, {item.state}</span>
            )}
            {formatYearRange(item.yearRangeStart, item.yearRangeEnd) && (
              <span>Year: {formatYearRange(item.yearRangeStart, item.yearRangeEnd)}</span>
            )}
            <span>Accessed: {formatDate(item.dateAccessed)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
