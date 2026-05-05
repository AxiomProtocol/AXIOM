/**
 * shared/reserveSnapshotsSchema.ts
 *
 * Drizzle schema for reserve_balance_snapshots — one row per asset per hour.
 * Tracks balance (raw units) and usdValue (nullable) at each hourly snapshot.
 * Unique constraint on (symbol, snapshot_hour) prevents duplicate writes when
 * the cron fires multiple times within the same clock-hour.
 */

import {
  pgTable,
  varchar,
  decimal,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const reserveBalanceSnapshots = pgTable(
  'reserve_balance_snapshots',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),

    symbol: varchar('symbol', { length: 20 }).notNull(),

    balance: decimal('balance', { precision: 36, scale: 18 }).notNull(),

    usdValue: decimal('usd_value', { precision: 28, scale: 8 }),

    snapshotHour: timestamp('snapshot_hour', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => ({
    uniqSymbolHour: uniqueIndex('rbs_symbol_hour_idx').on(t.symbol, t.snapshotHour),
    symbolTimeIdx: index('rbs_symbol_time_idx').on(t.symbol, t.snapshotHour),
  }),
);
