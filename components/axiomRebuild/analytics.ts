const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

function getSessionKey(uniqueKey: string): string {
  return `axiom_tracked_${uniqueKey}`;
}

function hasTrackedThisSession(uniqueKey: string): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(getSessionKey(uniqueKey)) === 'true';
}

function markTrackedThisSession(uniqueKey: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(getSessionKey(uniqueKey), 'true');
}

export function track(eventName: string, payload: Record<string, unknown> = {}): void {
  const eventData = {
    event: eventName,
    timestamp: Date.now(),
    ...payload
  };
  
  if (isDev) {
    console.log('[Analytics]', eventName, payload);
  }
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('axiom_analytics', { detail: eventData }));
  }
}

export function trackOnce(eventName: string, uniqueKey: string, payload: Record<string, unknown> = {}): void {
  if (hasTrackedThisSession(uniqueKey)) return;
  markTrackedThisSession(uniqueKey);
  track(eventName, payload);
}

export function createSectionObserver(
  sectionId: string, 
  eventName: string,
  options?: { threshold?: number }
): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return null;
  
  return new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          trackOnce(eventName, `${eventName}_${sectionId}`, { section: sectionId });
        }
      });
    },
    { threshold: options?.threshold ?? 0.3 }
  );
}

export function trackCta(page: 'home' | 'keygrow', ctaLabel: string, destination: string): void {
  track(`${page}_cta_click`, { cta: ctaLabel, destination });
}

export function trackProofInteraction(page: 'home' | 'keygrow', action: string, details?: Record<string, unknown>): void {
  track(`${page}_proof_interaction`, { action, ...details });
}
