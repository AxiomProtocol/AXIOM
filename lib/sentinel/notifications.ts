import type { SentinelAlertEvent, SentinelAlert, SentinelOperationalState } from './types';

type NotificationHandler = (alert: SentinelAlert) => Promise<void>;

const handlers: NotificationHandler[] = [];
const alertBuffer: SentinelAlert[] = [];
const MAX_BUFFER_SIZE = 100;

export function registerNotificationHandler(handler: NotificationHandler): void {
  handlers.push(handler);
}

export async function emitSentinelAlert(
  event: SentinelAlertEvent,
  state: SentinelOperationalState,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  const alert: SentinelAlert = {
    event,
    state,
    timestamp: new Date().toISOString(),
    message,
    metadata,
  };

  alertBuffer.push(alert);
  if (alertBuffer.length > MAX_BUFFER_SIZE) {
    alertBuffer.shift();
  }

  console.log(`[SENTINEL ALERT] ${event} | State: ${state} | ${message}`);

  for (const handler of handlers) {
    try {
      await handler(alert);
    } catch (err) {
      console.error(`[SENTINEL ALERT] Handler error:`, err);
    }
  }
}

export function getRecentAlerts(limit: number = 20): SentinelAlert[] {
  return alertBuffer.slice(-limit).reverse();
}

export function clearAlerts(): void {
  alertBuffer.length = 0;
}
