import React, { ReactNode } from 'react';

/**
 * FeatureCard — flat card used to wrap user-friendly explanations on each page.
 * Optional metric strip mirrors Robinhood-style numerical clarity.
 */

export interface FeatureCardProps {
  title: string;
  body: ReactNode;
  iconSrc?: string;
  iconAlt?: string;
  metric?: { value: string; label: string };
  footerNote?: string;
}

export function FeatureCard({ title, body, iconSrc, iconAlt, metric, footerNote }: FeatureCardProps) {
  return (
    <div
      className="h-full border border-dl-border p-5 sm:p-6"
      style={{ backgroundColor: '#ffffff' }}
    >
      <div className="flex items-start gap-3 mb-3">
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={iconAlt ?? ''}
            loading="lazy"
            style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
          />
        ) : null}
        <h3
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 20,
            color: '#1e3a5f',
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          {title}
        </h3>
      </div>
      <div
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 15,
          color: '#111827',
          lineHeight: 1.6,
        }}
      >
        {body}
      </div>
      {metric ? (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid #dde4ea' }}
        >
          <div
            style={{
              fontFamily: '"Courier New", monospace',
              fontSize: 24,
              color: '#1e3a5f',
              lineHeight: 1,
            }}
          >
            {metric.value}
          </div>
          <div
            className="mt-1"
            style={{
              fontFamily: '"Courier New", monospace',
              fontSize: 10,
              color: '#6b7280',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {metric.label}
          </div>
        </div>
      ) : null}
      {footerNote ? (
        <div
          className="mt-3"
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: 10,
            color: '#6b7280',
            letterSpacing: '0.05em',
          }}
        >
          {footerNote}
        </div>
      ) : null}
    </div>
  );
}
