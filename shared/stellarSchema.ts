/**
 * Axiom Protocol — Stellar Payment Transfers Schema
 *
 * Tracks every payment initiated through Axiom Rail (SEP-10/24/31/38),
 * settled via Increase FDIC-insured ACH and domestic wire.
 * One row per transfer attempt. Status is updated via anchor polling.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const stellarTransferStatusEnum = pgEnum('stellar_transfer_status', [
  'pending_user_transfer_start',
  'pending_external',
  'pending_anchor',
  'pending_stellar',
  'pending_trust',
  'completed',
  'error',
  'refunded',
  'expired',
]);

export const stellarPaymentTransfers = pgTable('stellar_payment_transfers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  axiomWalletAddress: varchar('axiom_wallet_address', { length: 42 }).notNull(),
  stellarPublicKey: varchar('stellar_public_key', { length: 56 }),

  anchorId: varchar('anchor_id', { length: 100 }).notNull().default('axiom-rail'),
  corridorId: varchar('corridor_id', { length: 100 }).notNull(),
  anchorTransferId: varchar('anchor_transfer_id', { length: 200 }),

  sourceAmountAxusd: varchar('source_amount_axusd', { length: 40 }).notNull(),
  destinationCurrency: varchar('destination_currency', { length: 10 }).notNull(),
  destinationAmount: varchar('destination_amount', { length: 40 }),
  destinationAccount: varchar('destination_account', { length: 200 }),

  feeEstimate: varchar('fee_estimate', { length: 40 }),
  stellarTransactionHash: varchar('stellar_transaction_hash', { length: 200 }),

  status: stellarTransferStatusEnum('status').notNull().default('pending_user_transfer_start'),
  errorMessage: text('error_message'),

  sep24InteractiveUrl: text('sep24_interactive_url'),
  sep10JwtIssued: boolean('sep10_jwt_issued').notNull().default(false),

  sepProtocol: varchar('sep_protocol', { length: 10 }).notNull().default('sep24'),
  sep38QuoteId: varchar('sep38_quote_id', { length: 200 }),
  sep31StellarAccountId: varchar('sep31_stellar_account_id', { length: 56 }),
  sep31StellarMemo: varchar('sep31_stellar_memo', { length: 200 }),

  anchorRawResponse: jsonb('anchor_raw_response'),

  initiatedAt: timestamp('initiated_at').notNull().default(sql`now()`),
  completedAt: timestamp('completed_at'),
  lastPolledAt: timestamp('last_polled_at'),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

export type StellarPaymentTransfer = typeof stellarPaymentTransfers.$inferSelect;
export type NewStellarPaymentTransfer = typeof stellarPaymentTransfers.$inferInsert;
