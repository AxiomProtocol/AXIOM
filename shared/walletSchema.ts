/**
 * Drizzle schema for the Axiom internal wallet / stored-balance layer.
 * Tables: axiom_wallet_balances, axiom_wallet_transactions
 */
import {
  pgTable,
  text,
  bigint,
  timestamp,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const axiomWalletBalances = pgTable(
  'axiom_wallet_balances',
  {
    userId:                  text('user_id').primaryKey(),
    availableCents:          bigint('available_cents', { mode: 'number' }).notNull().default(0),
    pendingCents:            bigint('pending_cents', { mode: 'number' }).notNull().default(0),
    lifetimeDepositedCents:  bigint('lifetime_deposited_cents', { mode: 'number' }).notNull().default(0),
    lifetimeAllocatedCents:  bigint('lifetime_allocated_cents', { mode: 'number' }).notNull().default(0),
    createdAt:               timestamp('created_at').notNull().defaultNow(),
    updatedAt:               timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    availableNonNeg: check('available_cents_non_neg', sql`${t.availableCents} >= 0`),
    pendingNonNeg:   check('pending_cents_non_neg',   sql`${t.pendingCents} >= 0`),
  }),
);

export const axiomWalletTransactions = pgTable('axiom_wallet_transactions', {
  id:                 text('id').primaryKey(),
  userId:             text('user_id').notNull().references(() => axiomWalletBalances.userId, { onDelete: 'cascade' }),
  type:               text('type').notNull(),
  amountCents:        bigint('amount_cents', { mode: 'number' }).notNull(),
  direction:          text('direction').notNull(),
  balanceAfterCents:  bigint('balance_after_cents', { mode: 'number' }).notNull(),
  status:             text('status').notNull().default('PENDING'),
  referenceType:      text('reference_type'),
  referenceId:        text('reference_id'),
  allocationAsset:    text('allocation_asset'),
  notes:              text('notes'),
  idempotencyKey:     text('idempotency_key').unique(),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
});

export type AxiomWalletBalance     = typeof axiomWalletBalances.$inferSelect;
export type NewAxiomWalletBalance  = typeof axiomWalletBalances.$inferInsert;
export type AxiomWalletTransaction = typeof axiomWalletTransactions.$inferSelect;
export type NewAxiomWalletTransaction = typeof axiomWalletTransactions.$inferInsert;
