import React from 'react';

/**
 * SectionHeader — consistent serif heading with optional eyebrow + subtitle.
 * Used to introduce a card/grid section on the visual layer.
 */

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function SectionHeader({ eyebrow, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-5 sm:mb-6">
      {eyebrow ? (
        <div
          className="mb-2"
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#92400e',
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <h2
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(22px, 3vw, 30px)',
          color: '#1e3a5f',
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className="mt-2"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 15,
            color: '#374151',
            lineHeight: 1.55,
            margin: 0,
            maxWidth: 760,
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
