import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
} from 'drizzle-orm/pg-core';

export const axauPurchaseRequests = pgTable('axau_purchase_requests', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  email: varchar('email', { length: 256 }),
  axusdAmount: decimal('axusd_amount', { precision: 24, scale: 6 }).notNull(),
  axauQuoted: decimal('axau_quoted', { precision: 24, scale: 6 }).notNull(),
  xauUsdPrice: decimal('xau_usd_price', { precision: 16, scale: 2 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  fulfillmentTxHash: varchar('fulfillment_tx_hash', { length: 66 }),
  fulfilledBy: varchar('fulfilled_by', { length: 42 }),
  fulfilledAt: timestamp('fulfilled_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  walletIdx: index('idx_axau_pr_wallet').on(table.walletAddress),
  statusIdx: index('idx_axau_pr_status').on(table.status),
  createdIdx: index('idx_axau_pr_created').on(table.createdAt),
}));

export type AxauPurchaseRequest = typeof axauPurchaseRequests.$inferSelect;
export type InsertAxauPurchaseRequest = typeof axauPurchaseRequests.$inferInsert;
