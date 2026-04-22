import { useEffect, useRef } from 'react';
import { trackHomepageEvent } from '../../lib/analytics/homepageTracker';

// ────────────────────────────────────────────────────────────────────
// Drop-in analytics instrumenter for the homepage.
// Mount once at the top of DesignLawHome. Performs:
//   1. page_view on mount (with referrer + utm derivation server-side).
//   2. scroll_depth at 25 / 50 / 75 / 100 (each fired at most once).
//   3. section_view via IntersectionObserver on every [data-section]
//      element (fires once per section per page load).
//   4. cta_click via delegated click capture — looks for the closest
//      [data-track-cta] OR <a>/<button> inside an element marked
//      [data-track]. Outbound (non-same-origin) anchors are tagged
//      as outbound_click instead.
// All listeners are passive and removed on unmount. Never throws.
// ────────────────────────────────────────────────────────────────────

const SCROLL_MARKS = [25, 50, 75, 100] as const;

export default function HomepageAnalytics() {
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 1. page_view
    trackHomepageEvent('page_view');

    // 2. scroll_depth
    const onScroll = () => {
      try {
        const doc = document.documentElement;
        const total = doc.scrollHeight - window.innerHeight;
        if (total <= 0) return;
        const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / total) * 100)));
        for (const mark of SCROLL_MARKS) {
          const key = `scroll:${mark}`;
          if (pct >= mark && !fired.current.has(key)) {
            fired.current.add(key);
            trackHomepageEvent('scroll_depth', { depth: mark });
          }
        }
      } catch { /* swallow */ }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // 3. section_view (IntersectionObserver)
    const sectionEls = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
    let observer: IntersectionObserver | null = null;
    if (sectionEls.length && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const name = (entry.target as HTMLElement).dataset.section || 'unknown';
          const key = `section:${name}`;
          if (fired.current.has(key)) continue;
          fired.current.add(key);
          trackHomepageEvent('section_view', { section: name });
        }
      }, { threshold: 0.4 });
      sectionEls.forEach((el) => observer!.observe(el));
    }

    // 4. cta_click / outbound_click via delegated capture
    const onClick = (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const cta = target.closest('[data-track-cta]') as HTMLElement | null;
        const anchor = target.closest('a, button') as HTMLAnchorElement | HTMLButtonElement | null;

        // Identify CTA name + href
        const name =
          cta?.dataset.trackCta ||
          (anchor && 'innerText' in anchor ? anchor.innerText.trim().slice(0, 60) : null);
        if (!name) return;

        const href = anchor && 'href' in anchor ? (anchor as HTMLAnchorElement).href || '' : '';
        let isOutbound = false;
        if (href) {
          try {
            const u = new URL(href, window.location.href);
            isOutbound = u.origin !== window.location.origin && /^https?:/.test(u.protocol);
          } catch { /* bad url, treat as inbound */ }
        }

        const meta = {
          cta:     name,
          href:    href || null,
          section: cta?.closest('[data-section]')?.getAttribute('data-section') || null,
        };
        trackHomepageEvent(isOutbound ? 'outbound_click' : 'cta_click', meta);
      } catch { /* swallow */ }
    };
    document.addEventListener('click', onClick, { capture: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick, { capture: true } as EventListenerOptions);
      observer?.disconnect();
    };
  }, []);

  return null;
}
