// ────────────────────────────────────────────────────────────────────
// Browser-side HOMEPAGE analytics helper.
// Same backend as AXAU tracker but writes with surface='homepage'.
// Tracks: page_view, section_view, scroll_depth, cta_click, outbound_click.
// All failures swallowed — analytics must NEVER break the page.
// ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'axau_visitor_id'; // shared visitor id across surfaces

export type HomepageEventType =
  | 'page_view'
  | 'section_view'
  | 'scroll_depth'
  | 'cta_click'
  | 'outbound_click';

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function visitorId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) { id = uuid(); window.localStorage.setItem(STORAGE_KEY, id); }
    return id;
  } catch { return 'no-storage'; }
}

function readUtm(): { utmSource: string; utmMedium: string; utmCampaign: string; ref: string } {
  if (typeof window === 'undefined') return { utmSource: '', utmMedium: '', utmCampaign: '', ref: '' };
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utmSource:   p.get('utm_source')   || '',
      utmMedium:   p.get('utm_medium')   || '',
      utmCampaign: p.get('utm_campaign') || '',
      ref:         p.get('ref')          || '',
    };
  } catch { return { utmSource: '', utmMedium: '', utmCampaign: '', ref: '' }; }
}

export function trackHomepageEvent(eventType: HomepageEventType, meta: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const utm = readUtm();
    const payload = {
      surface:   'homepage',
      eventType,
      visitorId: visitorId(),
      path:      window.location.pathname,
      referrer:  document.referrer || '',
      ...utm,
      meta,
    };
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/axau/event', blob);
      return;
    }
    fetch('/api/analytics/axau/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch { /* never break page */ }
}
