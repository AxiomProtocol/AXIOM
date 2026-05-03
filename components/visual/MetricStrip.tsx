import React from 'react';

/**
 * MetricStrip — Robinhood-style flat numerical strip used to anchor a section
 * with at-a-glance facts. Monospace numbers, serif labels, no gradients.
 */

export interface MetricItem {
  value: string;
  label: string;
  /** Optional sub-line, e.g. data source */
  sub?: string;
}

export interface MetricStripProps {
  items: MetricItem[];
}

export function MetricStrip({ items }: MetricStripProps) {
  return (
    <div
      className="grid gap-px border border-dl-border"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
        backgroundColor: '#dde4ea',
      }}
    >
      {items.map((m, idx) => (
        <div key={idx} className="p-4 sm:p-5" style={{ backgroundColor: '#fff' }}>
          <div
            style={{
              fontFamily: '"Courier New", monospace',
              fontSize: 'clamp(20px, 3vw, 28px)',
              color: '#1e3a5f',
              lineHeight: 1,
            }}
          >
            {m.value}
          </div>
          <div
            className="mt-2"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 13,
              color: '#111827',
              lineHeight: 1.3,
            }}
          >
            {m.label}
          </div>
          {m.sub ? (
            <div
              className="mt-1"
              style={{
                fontFamily: '"Courier New", monospace',
                fontSize: 10,
                color: '#6b7280',
                letterSpacing: '0.05em',
              }}
            >
              {m.sub}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
