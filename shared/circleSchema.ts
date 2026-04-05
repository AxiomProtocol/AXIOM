import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';

export const circleScreeningResults = pgTable(
  'circle_screening_results',
  {
    id: serial('id').primaryKey(),
    walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
    chain: varchar('chain', { length: 20 }).notNull().default('ARB'),
    result: varchar('result', { length: 20 }).notNull(),
    riskScore: integer('risk_score').notNull().default(0),
    riskCategories: jsonb('risk_categories').notNull().default([]),
    screenedAt: timestamp('screened_at', { withTimezone: true }).notNull().defaultNow(),
    cachedUntil: timestamp('cached_until', { withTimezone: true }).notNull(),
  },
  (t) => ({
    addressChainUnique: unique().on(t.walletAddress, t.chain),
  })
);

export const circleWebhookEvents = pgTable('circle_webhook_events', {
  id: serial('id').primaryKey(),
  notificationId: varchar('notification_id', { length: 128 }).notNull().unique(),
  notificationType: varchar('notification_type', { length: 64 }).notNull(),
  clientId: varchar('client_id', { length: 128 }),
  rawPayload: jsonb('raw_payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});
