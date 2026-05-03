import React from 'react';

/**
 * HeroBanner — full-bleed cinematic hero used as the visual anchor at the top
 * of pages in the Tokenized Commodities Integration layer.
 *
 * Design Law compatibility:
 *   - Serif headline + monospace eyebrow.
 *   - Flat overlay (solid navy with alpha) — no CSS gradients on the component
 *     itself; visual richness comes from the underlying image.
 *   - Dark navy (#1e3a5f) palette consistent with dl-* tokens.
 *   - No shadows, no border-radius, no transitions.
 *   - Mobile-first: hero clamps to a sane min-height on small screens and
 *     scales up on larger viewports via responsive padding.
 */

export interface HeroBannerProps {
  imageSrc: string;
  imageAlt: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badges?: string[];
  /** Optional dark overlay opacity 0–1, default 0.55 for legibility. */
  overlayOpacity?: number;
  /** Aspect-locked min-heights. */
  heightClass?: string;
}

export function HeroBanner({
  imageSrc,
  imageAlt,
  eyebrow,
  title,
  subtitle,
  badges,
  overlayOpacity = 0.55,
  heightClass = 'min-h-[260px] sm:min-h-[340px] md:min-h-[420px] lg:min-h-[480px]',
}: HeroBannerProps) {
  return (
    <section
      className={`relative w-full overflow-hidden border border-dl-border ${heightClass}`}
      style={{ backgroundColor: '#0b1828' }}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        loading="eager"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(11, 24, 40, ${overlayOpacity})` }}
      />
      <div className="relative z-10 h-full w-full flex">
        <div className="self-end w-full px-5 sm:px-8 md:px-12 py-6 sm:py-8 md:py-10">
          {eyebrow ? (
            <div
              className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] mb-3"
              style={{ color: '#d4af37' }}
            >
              {eyebrow}
            </div>
          ) : null}
          <h1
            className="font-dl-serif text-white"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(24px, 5vw, 48px)',
              lineHeight: 1.15,
              margin: 0,
              maxWidth: 920,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className="text-white/85 mt-3 sm:mt-4"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 'clamp(14px, 2vw, 18px)',
                lineHeight: 1.5,
                margin: 0,
                maxWidth: 760,
              }}
            >
              {subtitle}
            </p>
          ) : null}
          {badges && badges.length ? (
            <div className="flex flex-wrap gap-2 mt-4 sm:mt-5">
              {badges.map((b) => (
                <span
                  key={b}
                  className="font-mono uppercase tracking-wider"
                  style={{
                    fontSize: 11,
                    padding: '5px 10px',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.4)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    letterSpacing: '0.08em',
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
