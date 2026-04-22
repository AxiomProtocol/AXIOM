/**
 * Capital Infrastructure — Notification Subscribers.
 *
 * Each subscriber inspects an event context and may emit zero or more
 * notification rows. Subscribers are pure-async, side-effect-only,
 * and isolated from settlement state. They are invoked AFTER the
 * settlement transaction commits (see §0.1) and any thrown error is
 * logged and swallowed by the caller.
 */

import { emitNotification } from '../notifications';

export interface NotificationContext {
  eventType:
    | 'settlement.created'
    | 'settlement.authorized'
    | 'settlement.executing'
    | 'settlement.settled'
    | 'settlement.failed'
    | 'settlement.cancelled'
    | 'settlement.pending_operator_approval'
    | 'settlement.submitted';
  instructionId: string;
  userId: string;
  assetId: string;
  assetSymbol: string;
  amount: string;
  actionType: string;
  correlationId?: string | null;
  relatedEventId?: string | null;
  reasonCode?: string | null;
}

type Subscriber = (ctx: NotificationContext) => Promise<void>;

const SUBSCRIBERS: Subscriber[] = [];

function subscribe(s: Subscriber) {
  SUBSCRIBERS.push(s);
}

// ── Default subscribers ────────────────────────────────────────────

// User in-app notification on terminal settlement transitions.
subscribe(async (ctx) => {
  if (ctx.eventType === 'settlement.settled') {
    await emitNotification({
      userId: ctx.userId,
      channel: 'in_app',
      topic: ctx.eventType,
      severity: 'INFO',
      subject: `Settlement complete: ${ctx.actionType} ${ctx.amount} ${ctx.assetSymbol}`,
      bodyJson: { instructionId: ctx.instructionId },
      correlationId: ctx.correlationId,
      relatedEventId: ctx.relatedEventId,
    });
  } else if (ctx.eventType === 'settlement.failed') {
    await emitNotification({
      userId: ctx.userId,
      channel: 'in_app',
      topic: ctx.eventType,
      severity: 'HIGH',
      subject: `Settlement failed: ${ctx.actionType} ${ctx.amount} ${ctx.assetSymbol}`,
      bodyJson: { instructionId: ctx.instructionId, reasonCode: ctx.reasonCode },
      correlationId: ctx.correlationId,
      relatedEventId: ctx.relatedEventId,
    });
  } else if (ctx.eventType === 'settlement.cancelled') {
    await emitNotification({
      userId: ctx.userId,
      channel: 'in_app',
      topic: ctx.eventType,
      severity: 'LOW',
      subject: `Settlement cancelled: ${ctx.actionType} ${ctx.amount} ${ctx.assetSymbol}`,
      bodyJson: { instructionId: ctx.instructionId },
      correlationId: ctx.correlationId,
      relatedEventId: ctx.relatedEventId,
    });
  }
});

// Operator notification on every state transition (always fanned out
// to channel='operator' so support/treasury teams have a single
// stream to monitor).
subscribe(async (ctx) => {
  await emitNotification({
    userId: null,
    channel: 'operator',
    topic: ctx.eventType,
    severity: ctx.eventType === 'settlement.failed' ? 'MEDIUM' : 'INFO',
    subject: `[op] ${ctx.eventType} ${ctx.actionType} ${ctx.amount} ${ctx.assetSymbol}`,
    bodyJson: {
      instructionId: ctx.instructionId,
      userId: ctx.userId,
      assetId: ctx.assetId,
      reasonCode: ctx.reasonCode ?? null,
    },
    correlationId: ctx.correlationId,
    relatedEventId: ctx.relatedEventId,
  });
});

export async function runSubscribers(ctx: NotificationContext): Promise<void> {
  // Run subscribers concurrently; individual failures don't block
  // others or propagate to the settlement caller.
  await Promise.allSettled(SUBSCRIBERS.map((s) => s(ctx).catch((e) => {
    console.error('[capinfra.notifications.subscriber] failed', ctx.eventType, e);
  })));
}
