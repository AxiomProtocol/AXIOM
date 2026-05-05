import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Tracks deduplication state for automatic reserve balance alerts.
 *
 * Each row represents one alert condition (e.g. 'eth_low', 'axau_depleted').
 * The runner sets `condition_active = true` when the condition first triggers
 * and flips it back to `false` when the condition clears. Alerts are only
 * sent on the FALSE → TRUE transition, preventing repeated pages for a
 * sustained bad condition.
 */
export const reserveAlerts = pgTable('reserve_alerts', {
  id:                   varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  alertKey:             varchar('alert_key', { length: 100 }).notNull(),
  conditionActive:      boolean('condition_active').notNull().default(false),
  lastSentAt:           timestamp('last_sent_at'),
  conditionFirstSeenAt: timestamp('condition_first_seen_at'),
  conditionClearedAt:   timestamp('condition_cleared_at'),
  lastValueSnapshot:    text('last_value_snapshot'),
  channelsPaged:        text('channels_paged'),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  alertKeyUniq: uniqueIndex('ra_alert_key_uniq').on(t.alertKey),
  activeIdx:    index('ra_active_idx').on(t.conditionActive),
}));

export type ReserveAlert = typeof reserveAlerts.$inferSelect;
export type InsertReserveAlert = typeof reserveAlerts.$inferInsert;
