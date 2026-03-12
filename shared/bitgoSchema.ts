import { pgTable, uuid, varchar, boolean, timestamp, text, jsonb, bigint, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const bitgoWalletCoinEnum = pgEnum('bitgo_wallet_coin', [
  'eth',
  'teth',
  'arbitrum',
  'tarbitrum',
  'usdc',
  'axm',
  'axusd',
]);

export const bitgoTxDirectionEnum = pgEnum('bitgo_tx_direction', [
  'send',
  'receive',
]);

export const bitgoTxStateEnum = pgEnum('bitgo_tx_state', [
  'signed',
  'unconfirmed',
  'confirmed',
  'rejected',
  'pendingApproval',
  'removed',
  'failed',
]);

export const bitgoPolicyTypeEnum = pgEnum('bitgo_policy_type', [
  'spending_limit',
  'address_whitelist',
  'velocity_limit',
  'require_approval',
]);

export const bitgoWallets = pgTable('bitgo_wallets', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  bitgoWalletId: varchar('bitgo_wallet_id', { length: 100 }).notNull().unique(),
  bitgoEnterpriseId: varchar('bitgo_enterprise_id', { length: 100 }),
  coin: bitgoWalletCoinEnum('coin').default('arbitrum'),
  label: varchar('label', { length: 255 }),
  receiveAddress: varchar('receive_address', { length: 100 }),
  confirmedBalanceStr: varchar('confirmed_balance_str', { length: 50 }).default('0'),
  spendableBalanceStr: varchar('spendable_balance_str', { length: 50 }).default('0'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bitgoTransactions = pgTable('bitgo_transactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  bitgoTxId: varchar('bitgo_tx_id', { length: 200 }),
  bitgoWalletId: varchar('bitgo_wallet_id', { length: 100 }).notNull(),
  coin: varchar('coin', { length: 50 }),
  direction: bitgoTxDirectionEnum('direction').notNull(),
  state: bitgoTxStateEnum('state').default('unconfirmed'),
  amountStr: varchar('amount_str', { length: 50 }),
  feeStr: varchar('fee_str', { length: 50 }),
  fromAddress: varchar('from_address', { length: 100 }),
  toAddress: varchar('to_address', { length: 100 }),
  txHash: varchar('tx_hash', { length: 200 }),
  confirmations: bigint('confirmations', { mode: 'number' }).default(0),
  blockHeight: bigint('block_height', { mode: 'number' }),
  label: text('label'),
  metadata: jsonb('metadata'),
  confirmedAt: timestamp('confirmed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bitgoWebhooks = pgTable('bitgo_webhooks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  bitgoWebhookId: varchar('bitgo_webhook_id', { length: 100 }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  coin: varchar('coin', { length: 50 }),
  walletId: varchar('wallet_id', { length: 100 }),
  payload: jsonb('payload').notNull(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  processingError: text('processing_error'),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
});

export const bitgoCustodyPolicies = pgTable('bitgo_custody_policies', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  bitgoWalletId: varchar('bitgo_wallet_id', { length: 100 }).notNull(),
  bitgoPolicyId: varchar('bitgo_policy_id', { length: 100 }),
  policyType: bitgoPolicyTypeEnum('policy_type').notNull(),
  label: varchar('label', { length: 255 }),
  isActive: boolean('is_active').default(true),
  config: jsonb('config').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bitgoStakingPositions = pgTable('bitgo_staking_positions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  bitgoWalletId: varchar('bitgo_wallet_id', { length: 100 }).notNull(),
  bitgoStakingId: varchar('bitgo_staking_id', { length: 100 }),
  coin: varchar('coin', { length: 50 }).notNull(),
  amountStr: varchar('amount_str', { length: 50 }).notNull(),
  validatorAddress: varchar('validator_address', { length: 200 }),
  status: varchar('status', { length: 50 }).default('active'),
  rewardsStr: varchar('rewards_str', { length: 50 }).default('0'),
  unstakingAt: timestamp('unstaking_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type BitGoWallet = typeof bitgoWallets.$inferSelect;
export type NewBitGoWallet = typeof bitgoWallets.$inferInsert;
export type BitGoTransaction = typeof bitgoTransactions.$inferSelect;
export type NewBitGoTransaction = typeof bitgoTransactions.$inferInsert;
export type BitGoWebhook = typeof bitgoWebhooks.$inferSelect;
export type BitGoCustodyPolicy = typeof bitgoCustodyPolicies.$inferSelect;
export type BitGoStakingPosition = typeof bitgoStakingPositions.$inferSelect;
