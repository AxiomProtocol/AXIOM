/**
 * shared/treasuryVaultSchema.ts
 *
 * Drizzle schema for Treasury Vault on-chain event logging.
 * Kept in a separate file to avoid the SWC bundler drop-at-bottom issue
 * in shared/schema.ts (>9700 lines).
 *
 * Imported by server/db.ts alongside the other schema shards.
 */

import { sql } from 'drizzle-orm';
import {
  decimal,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const treasuryVaultEvents = pgTable('treasury_vault_events', {
  id:          serial('id').primaryKey(),
  eventType:   varchar('event_type', { length: 40 }).notNull(),
  strategy:    varchar('strategy',   { length: 255 }),
  amountUsd:   decimal('amount_usd', { precision: 18, scale: 6 }).notNull().default('0'),
  txHash:      varchar('tx_hash',    { length: 66 }),
  blockNumber: integer('block_number'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  eventTypeIdx: index('treasury_vault_events_event_type_idx').on(table.eventType),
  createdAtIdx: index('treasury_vault_events_created_at_idx').on(table.createdAt),
  txHashIdx:    index('treasury_vault_events_tx_hash_idx').on(table.txHash),
}));

export type TreasuryVaultEvent       = typeof treasuryVaultEvents.$inferSelect;
export type InsertTreasuryVaultEvent = typeof treasuryVaultEvents.$inferInsert;
