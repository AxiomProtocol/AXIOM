import { pgTable, uuid, varchar, boolean, timestamp, text, jsonb, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const bridgeDirectionEnum = pgEnum('bridge_direction', [
  'fiat_to_crypto',
  'crypto_to_fiat',
]);

export const bridgeStatusEnum = pgEnum('bridge_status', [
  'initiated',
  'ach_pending',
  'ach_settled',
  'crypto_pending',
  'completed',
  'failed',
  'canceled',
]);

export const bridgeCryptoAssetEnum = pgEnum('bridge_crypto_asset', [
  'AXM',
  'AXUSD',
  'ETH',
  'USDC',
]);

export const bridgeTransfers = pgTable('bridge_transfers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  direction: bridgeDirectionEnum('direction').notNull(),
  status: bridgeStatusEnum('status').default('initiated').notNull(),
  fiatAmountCents: integer('fiat_amount_cents').notNull(),
  fiatCurrency: varchar('fiat_currency', { length: 3 }).default('USD'),
  cryptoAsset: bridgeCryptoAssetEnum('crypto_asset').notNull(),
  cryptoAmountStr: varchar('crypto_amount_str', { length: 50 }),
  exchangeRateStr: varchar('exchange_rate_str', { length: 50 }),
  fxSnapshotId: uuid('fx_snapshot_id'),
  feeCents: integer('fee_cents').default(0),
  estimatedSettlementMinutes: integer('estimated_settlement_minutes'),
  bitgoWalletId: varchar('bitgo_wallet_id', { length: 100 }),
  bitgoTxId: varchar('bitgo_tx_id', { length: 200 }),
  errorMessage: text('error_message'),
  achSettledAt: timestamp('ach_settled_at'),
  cryptoConfirmedAt: timestamp('crypto_confirmed_at'),
  completedAt: timestamp('completed_at'),
  failedAt: timestamp('failed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bridgeFxSnapshots = pgTable('bridge_fx_snapshots', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  bridgeTransferId: uuid('bridge_transfer_id'),
  fiatCurrency: varchar('fiat_currency', { length: 3 }).default('USD'),
  cryptoAsset: bridgeCryptoAssetEnum('crypto_asset').notNull(),
  rateStr: varchar('rate_str', { length: 50 }).notNull(),
  bidRateStr: varchar('bid_rate_str', { length: 50 }),
  askRateStr: varchar('ask_rate_str', { length: 50 }),
  spreadBps: integer('spread_bps'),
  source: varchar('source', { length: 100 }).default('coingecko'),
  validUntil: timestamp('valid_until'),
  capturedAt: timestamp('captured_at').defaultNow().notNull(),
});

export type BridgeTransfer = typeof bridgeTransfers.$inferSelect;
export type NewBridgeTransfer = typeof bridgeTransfers.$inferInsert;
export type BridgeFxSnapshot = typeof bridgeFxSnapshots.$inferSelect;
export type NewBridgeFxSnapshot = typeof bridgeFxSnapshots.$inferInsert;
