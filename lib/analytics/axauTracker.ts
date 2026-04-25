// ────────────────────────────────────────────────────────────────────
// Browser-side AXAU analytics helper.
// Issues fire-and-forget POSTs to /api/analytics/axau/event.
// Uses sendBeacon for unload-safe events when available.
// Stores a stable visitor_id in localStorage (random UUID, not PII).
// All failures swallowed — analytics must NEVER break user flow.
// ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'axau_visitor_id';

export type AxauEventType =
  | 'page_view'
  | 'cta_click'
  | 'form_start'
  | 'form_complete'
  | 'section_view'
  | 'scroll_depth'
  | 'form_step2_reached'
  | 'faq_open';

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
  } catch {
    return 'no-storage';
  }
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
  } catch {
    return { utmSource: '', utmMedium: '', utmCampaign: '', ref: '' };
  }
}

export function trackAxauEvent(eventType: AxauEventType, meta: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const utm = readUtm();
    const payload = {
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
  } catch {
    /* never break user flow */
  }
}
