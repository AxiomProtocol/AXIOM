/**
 * Steward Dashboard Analytics
 * 
 * Lightweight analytics for tracking steward dashboard interactions.
 * Uses CustomEvent and sessionStorage for deduplication.
 */

const IS_DEV = typeof window !== 'undefined' && process.env.NODE_ENV === 'development';
const DEDUPE_PREFIX = 'steward_analytics_';

interface AnalyticsPayload {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Track an analytics event
 */
export function track(eventName: string, payload: AnalyticsPayload = {}): void {
  if (typeof window === 'undefined') return;

  const eventData = {
    event: eventName,
    timestamp: new Date().toISOString(),
    ...payload
  };

  if (IS_DEV) {
    console.log(`[StewardAnalytics] ${eventName}`, payload);
  }

  try {
    const event = new CustomEvent('steward_analytics', {
      detail: eventData
    });
    window.dispatchEvent(event);
  } catch (err) {
    // Silently fail
  }
}

/**
 * Track an event only once per session (using sessionStorage deduplication)
 */
export function trackOnce(eventName: string, uniqueKey: string, payload: AnalyticsPayload = {}): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;

  const dedupeKey = `${DEDUPE_PREFIX}${eventName}_${uniqueKey}`;
  
  try {
    if (sessionStorage.getItem(dedupeKey)) {
      return; // Already tracked this session
    }

    track(eventName, payload);
    sessionStorage.setItem(dedupeKey, 'true');
  } catch (err) {
    // Silently fail if sessionStorage is unavailable
    track(eventName, payload);
  }
}

// Pre-defined event names for type safety
export const StewardEvents = {
  DASHBOARD_VIEW: 'steward_dashboard_view',
  OVERVIEW_ALERT_CLICK: 'steward_overview_alert_click',
  DROP_CREATED: 'drop_created',
  DROP_PUBLISHED: 'drop_published',
  DROP_RECONCILED: 'drop_reconciled',
  RESERVATION_CREATED: 'reservation_created',
  RESERVATION_CANCELLED: 'reservation_cancelled',
  RESERVATION_NO_SHOW_MARKED: 'reservation_no_show_marked',
  LAND_LEAD_SUBMITTED: 'land_lead_submitted',
  LAND_LEAD_QUALIFIED: 'land_lead_qualified',
  LAND_LEAD_ESCALATED: 'land_lead_escalated',
  SIGNAL_WINDOW_OPENED: 'signal_window_opened',
  GROUP_CREATED: 'group_created',
  TASK_COMPLETED: 'task_completed',
  MESSAGE_SENT: 'message_sent',
  WEEKLY_REPORT_SUBMITTED: 'weekly_report_submitted',
  REPUTATION_VIEWED: 'reputation_viewed',
  STEWARD_STATUS_CHANGED: 'steward_status_changed'
} as const;
