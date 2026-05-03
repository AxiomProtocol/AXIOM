import React from 'react';

/**
 * StockImageBand — full-bleed editorial photograph with an overlaid quote/stat
 * for visual rhythm between content sections. Mirrors institutional editorial
 * publication design (BlackRock thought-leadership pages).
 */

export interface StockImageBandProps {
  imageSrc: string;
  imageAlt: string;
  quote?: string;
  attribution?: string;
  heightClass?: string;
  alignment?: 'left' | 'right' | 'center';
  overlayOpacity?: number;
}

export function StockImageBand({
  imageSrc,
  imageAlt,
  quote,
  attribution,
  heightClass = 'min-h-[200px] sm:min-h-[280px] md:min-h-[340px]',
  alignment = 'left',
  overlayOpacity = 0.5,
}: StockImageBandProps) {
  const justify =
    alignment === 'right' ? 'justify-end' : alignment === 'center' ? 'justify-center' : 'justify-start';
  return (
    <section
      className={`relative w-full overflow-hidden border border-dl-border ${heightClass}`}
      style={{ backgroundColor: '#0b1828' }}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(11, 24, 40, ${overlayOpacity})` }}
      />
      <div className={`relative z-10 h-full w-full flex items-center ${justify}`}>
        {quote ? (
          <div className="px-5 sm:px-10 md:px-14 py-6 max-w-3xl">
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 'clamp(18px, 2.6vw, 28px)',
                fontStyle: 'italic',
                lineHeight: 1.4,
                color: '#fff',
                margin: 0,
              }}
            >
              &ldquo;{quote}&rdquo;
            </div>
            {attribution ? (
              <div
                className="mt-3"
                style={{
                  fontFamily: '"Courier New", monospace',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#d4af37',
                }}
              >
                {attribution}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
