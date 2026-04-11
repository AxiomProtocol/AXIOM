import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const cryptoCollateralAssetEnum = pgEnum('crypto_collateral_asset', [
  'BTC',
  'ETH',
  'AXUSD',
]);

export const cryptoCreditStatusEnum = pgEnum('crypto_credit_status', [
  'pending_collateral',
  'active',
  'warning',
  'flagged',
  'closed',
]);

export const cryptoCreditLines = pgTable('crypto_credit_lines', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  participantWallet: varchar('participant_wallet', { length: 42 }).notNull(),
  collateralAsset: cryptoCollateralAssetEnum('collateral_asset').notNull(),
  collateralAmountRaw: varchar('collateral_amount_raw', { length: 60 }).notNull(),
  collateralUsdValueAtOpen: decimal('collateral_usd_value_at_open', { precision: 18, scale: 2 }),
  creditLimitUsd: decimal('credit_limit_usd', { precision: 18, scale: 2 }),
  drawnAmountUsd: decimal('drawn_amount_usd', { precision: 18, scale: 2 }).notNull().default('0'),
  interestRatePct: decimal('interest_rate_pct', { precision: 6, scale: 4 }).notNull().default('8.0'),
  status: cryptoCreditStatusEnum('status').notNull().default('pending_collateral'),
  bitgoWalletId: varchar('bitgo_wallet_id', { length: 200 }),
  bitgoAddressId: varchar('bitgo_address_id', { length: 200 }),
  depositAddress: varchar('deposit_address', { length: 200 }),
  openedAt: timestamp('opened_at').default(sql`now()`),
  closedAt: timestamp('closed_at'),
  lastHealthCheckAt: timestamp('last_health_check_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

export type CryptoCreditLine = typeof cryptoCreditLines.$inferSelect;
export type NewCryptoCreditLine = typeof cryptoCreditLines.$inferInsert;
