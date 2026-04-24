/**
 * Analytics for Steward-Activated Land Program
 * Tracks landowner and steward funnel events
 */

export const ActivatedLandEvents = {
  // Landowner funnel
  LANDOWNER_PAGE_VIEW: 'landowner_page_view',
  LANDOWNER_APPLY_START: 'landowner_apply_start',
  LANDOWNER_APPLY_SUBMIT: 'landowner_apply_submit',
  
  // Steward funnel
  ACTIVATED_LAND_LEAD_CREATED: 'activated_land_lead_created',
  ACTIVATION_PLAN_GENERATED: 'activation_plan_generated',
  ACTIVATION_CYCLE_OPENED: 'activation_cycle_opened',
  ACTIVATION_WEEKLY_LOG_SUBMITTED: 'activation_weekly_log_submitted',
  CONVERSION_OPTION_RECORDED: 'conversion_option_recorded',
  
  // Playbook views
  PLAYBOOK_VIEW: 'playbook_view',
  SCRIPTS_VIEW: 'scripts_view',
  CHECKLISTS_VIEW: 'checklists_view'
} as const;

export type ActivatedLandEvent = typeof ActivatedLandEvents[keyof typeof ActivatedLandEvents];

const isProduction = typeof window !== 'undefined' && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1');

const sessionKey = 'activated_land_analytics_session';

function getSessionEvents(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = sessionStorage.getItem(sessionKey);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function addSessionEvent(eventKey: string): boolean {
  if (typeof window === 'undefined') return false;
  const events = getSessionEvents();
  if (events.has(eventKey)) return false;
  events.add(eventKey);
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify([...events]));
  } catch {}
  return true;
}

export function trackActivatedLand(
  event: ActivatedLandEvent,
  properties?: Record<string, unknown>
): void {
  const eventKey = `${event}_${JSON.stringify(properties || {})}`;
  
  // Deduplicate within session
  if (!addSessionEvent(eventKey)) return;
  
  const payload = {
    event,
    properties,
    timestamp: new Date().toISOString(),
    page: typeof window !== 'undefined' ? window.location.pathname : undefined
  };
  
  // Console log only in development
  if (!isProduction) {
    console.log('[ActivatedLandAnalytics]', event, properties);
  }
  
  // Send to analytics endpoint
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }
}
