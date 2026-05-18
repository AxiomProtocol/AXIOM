/**
 * shared/treasuryVaultSchema.ts
 *
 * Drizzle schema for Treasury Vault on-chain event logging.
 * Kept in a separate file to avoid the SWC bundler drop-at-bottom issue
 * in shared/schema.ts (>9700 lines).
 *
 * Imported by server/db.ts alongside the other schema shards.
 */

import {
  decimal,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Persists consumed Sentinel rebalance nonces for cross-instance replay protection.
 *
 * Each nonce issued by /api/sentinel/rebalance-auth is inserted here before the
 * on-chain rebalance call.  The PRIMARY KEY (nonce) provides a unique constraint
 * enforced at the DB level — concurrent requests racing with the same nonce will
 * have exactly one succeed and the rest receive a duplicate-key error (→ 409).
 *
 * Expired rows are pruned lazily on each rebalance request.
 */
export const sentinelRebalanceNonces = pgTable('sentinel_rebalance_nonces', {
  nonce:      text('nonce').primaryKey(),
  expiresAt:  timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at').notNull().defaultNow(),
});

export type SentinelRebalanceNonce = typeof sentinelRebalanceNonces.$inferSelect;

export const treasuryVaultEvents = pgTable('treasury_vault_events', {
  id:          serial('id').primaryKey(),
  eventType:   varchar('event_type', { length: 40 }).notNull(),
  strategy:    varchar('strategy',   { length: 255 }),
  amountUsd:   decimal('amount_usd', { precision: 18, scale: 6 }).notNull().default('0'),
  txHash:      varchar('tx_hash',    { length: 66 }),
  logIndex:    integer('log_index'),
  blockNumber: integer('block_number'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  eventTypeIdx:  index('treasury_vault_events_event_type_idx').on(table.eventType),
  createdAtIdx:  index('treasury_vault_events_created_at_idx').on(table.createdAt),
  txHashIdx:     index('treasury_vault_events_tx_hash_idx').on(table.txHash),
  uniqTxLog:     unique('treasury_vault_events_tx_log_uniq').on(table.txHash, table.logIndex),
}));

export type TreasuryVaultEvent       = typeof treasuryVaultEvents.$inferSelect;
export type InsertTreasuryVaultEvent = typeof treasuryVaultEvents.$inferInsert;

/**
 * Records every scheduled harvest cron run — success, skip, or error.
 * Powers the cron run history panel on the operator vault dashboard.
 */
export const harvestCronRuns = pgTable('harvest_cron_runs', {
  id:           serial('id').primaryKey(),
  startedAt:    timestamp('started_at').notNull(),
  completedAt:  timestamp('completed_at').notNull(),
  status:       varchar('status', { length: 20 }).notNull(), // 'success' | 'skipped' | 'error'
  yieldUsdc:    decimal('yield_usdc', { precision: 18, scale: 6 }).notNull().default('0'),
  txHash:       varchar('tx_hash',    { length: 66 }),
  errorMessage: text('error_message'),
  durationMs:   integer('duration_ms'),
}, (table) => ({
  startedAtIdx: index('harvest_cron_runs_started_at_idx').on(table.startedAt),
  statusIdx:    index('harvest_cron_runs_status_idx').on(table.status),
}));

export type HarvestCronRun       = typeof harvestCronRuns.$inferSelect;
export type InsertHarvestCronRun = typeof harvestCronRuns.$inferInsert;
