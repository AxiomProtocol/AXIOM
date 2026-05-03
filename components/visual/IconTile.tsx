import React from 'react';

/**
 * IconTile — flat card with a 3D-rendered icon image at the top, serif title,
 * and a one-line monospace caption. Used in feature strips below the hero.
 *
 * Design Law: flat borders, no gradients/shadows in CSS; the 3D depth comes
 * exclusively from the icon PNG asset. Mobile-first sizing.
 */

export interface IconTileProps {
  iconSrc: string;
  iconAlt: string;
  title: string;
  caption?: string;
  href?: string;
}

export function IconTile({ iconSrc, iconAlt, title, caption, href }: IconTileProps) {
  const inner = (
    <div
      className="h-full p-4 sm:p-5 border border-dl-border"
      style={{ backgroundColor: '#fbfcfd' }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className="shrink-0"
          style={{
            width: 64,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={iconSrc}
            alt={iconAlt}
            loading="lazy"
            decoding="async"
            style={{ width: 64, height: 64, objectFit: 'contain', display: 'block' }}
          />
        </div>
        <div className="min-w-0">
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 16,
              color: '#1e3a5f',
              lineHeight: 1.3,
              fontWeight: 600,
            }}
          >
            {title}
          </div>
          {caption ? (
            <div
              className="mt-1"
              style={{
                fontFamily: '"Courier New", monospace',
                fontSize: 11,
                color: '#6b7280',
                letterSpacing: '0.04em',
                lineHeight: 1.4,
              }}
            >
              {caption}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block h-full no-underline hover:bg-dl-bg-alt">
        {inner}
      </a>
    );
  }
  return inner;
}
