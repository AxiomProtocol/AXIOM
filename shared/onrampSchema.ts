import { pgTable, pgEnum, serial, varchar, integer, decimal, timestamp, index } from 'drizzle-orm/pg-core';

export const onrampProviderEnum = pgEnum('onramp_provider', [
  'coinbase',
  'ramp',
  'transak',
]);

export const onrampStatusEnum = pgEnum('onramp_status', [
  'created',
  'pending',
  'completed',
  'failed',
]);

export const onrampPurchaseIntents = pgTable('onramp_purchase_intents', {
  id: serial('id').primaryKey(),
  intentId: varchar('intent_id', { length: 64 }).unique().notNull(),
  userId: varchar('user_id', { length: 255 }),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  provider: onrampProviderEnum('provider').notNull(),
  chainId: integer('chain_id').notNull(),
  asset: varchar('asset', { length: 20 }).notNull(),
  fiatCurrency: varchar('fiat_currency', { length: 10 }).notNull(),
  fiatAmount: decimal('fiat_amount', { precision: 18, scale: 2 }).notNull(),
  cryptoAmountEstimate: decimal('crypto_amount_estimate', { precision: 18, scale: 8 }),
  status: onrampStatusEnum('status').default('created').notNull(),
  providerReference: varchar('provider_reference', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  walletIdx: index('onramp_intents_wallet_idx').on(table.walletAddress),
  statusIdx: index('onramp_intents_status_idx').on(table.status),
  providerIdx: index('onramp_intents_provider_idx').on(table.provider),
  intentIdIdx: index('onramp_intents_intent_id_idx').on(table.intentId),
}));

export type OnrampPurchaseIntent = typeof onrampPurchaseIntents.$inferSelect;
export type InsertOnrampPurchaseIntent = typeof onrampPurchaseIntents.$inferInsert;
