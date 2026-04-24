import { useEffect, useRef } from 'react';

type SectionId = 'overview' | 'paths' | 'projects' | 'stewardship' | 'get-started';

const VIEWED_KEY = 'keygrow_sections_viewed';

function getViewedSections(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = sessionStorage.getItem(VIEWED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markSectionViewed(section: string) {
  if (typeof window === 'undefined') return;
  try {
    const viewed = getViewedSections();
    viewed.add(section);
    sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...viewed]));
  } catch {
  }
}

function trackSectionView(section: SectionId) {
  if (typeof window === 'undefined') return;
  
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'keygrow_section_view', {
        section
      });
    }
    
    console.log('[KeyGrow Analytics] Section viewed:', section);
  } catch {
  }
}

export function trackCtaClick(section: SectionId, ctaLabel: string) {
  if (typeof window === 'undefined') return;
  
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'keygrow_cta_click', {
        section,
        cta_label: ctaLabel
      });
    }
    
    console.log('[KeyGrow Analytics] CTA clicked:', { section, ctaLabel });
  } catch {
  }
}

export function useSectionAnalytics(sectionId: SectionId) {
  const sectionRef = useRef<HTMLElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const viewed = getViewedSections();
    if (viewed.has(sectionId)) {
      hasTracked.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !hasTracked.current) {
            hasTracked.current = true;
            markSectionViewed(sectionId);
            trackSectionView(sectionId);
          }
        });
      },
      {
        threshold: 0.5
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [sectionId]);

  return sectionRef;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
