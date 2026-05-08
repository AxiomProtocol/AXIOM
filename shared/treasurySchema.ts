import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  boolean,
  decimal,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const treasuryAccounts = pgTable('treasury_accounts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar('provider', { length: 50 }).notNull(),
  accountType: varchar('account_type', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  legalEntityName: varchar('legal_entity_name', { length: 255 }),
  externalAccountId: varchar('external_account_id', { length: 300 }),
  chainId: integer('chain_id'),
  assetSymbol: varchar('asset_symbol', { length: 20 }).notNull(),
  custodyModel: varchar('custody_model', { length: 50 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('configured'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  providerIdx: index('ta_provider_idx').on(t.provider),
  statusIdx: index('ta_status_idx').on(t.status),
  assetIdx: index('ta_asset_idx').on(t.assetSymbol),
}));

export const partnerTreasuryTransactions = pgTable('partner_treasury_transactions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  treasuryAccountId: varchar('treasury_account_id', { length: 100 }),
  direction: varchar('direction', { length: 30 }).notNull(),
  assetSymbol: varchar('asset_symbol', { length: 20 }).notNull(),
  amount: decimal('amount', { precision: 28, scale: 8 }).notNull(),
  usdValue: decimal('usd_value', { precision: 20, scale: 2 }),
  externalTxId: varchar('external_tx_id', { length: 300 }),
  txHash: varchar('tx_hash', { length: 100 }),
  sourceProvider: varchar('source_provider', { length: 50 }),
  sourceType: varchar('source_type', { length: 50 }),
  counterparty: varchar('counterparty', { length: 255 }),
  purpose: text('purpose'),
  classification: varchar('classification', { length: 50 }),
  occurredAt: timestamp('occurred_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  accountIdx: index('pttx_account_idx').on(t.treasuryAccountId),
  assetIdx: index('pttx_asset_idx').on(t.assetSymbol),
  classIdx: index('pttx_class_idx').on(t.classification),
  providerIdx: index('pttx_provider_idx').on(t.sourceProvider),
  occurredIdx: index('pttx_occurred_idx').on(t.occurredAt),
}));

export const treasuryAllocations = pgTable('treasury_allocations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  allocationBucket: varchar('allocation_bucket', { length: 50 }).notNull(),
  assetSymbol: varchar('asset_symbol', { length: 20 }).notNull(),
  amount: decimal('amount', { precision: 28, scale: 8 }).notNull(),
  usdValue: decimal('usd_value', { precision: 20, scale: 2 }),
  sourceAccountId: varchar('source_account_id', { length: 100 }),
  destinationAccountId: varchar('destination_account_id', { length: 100 }),
  status: varchar('status', { length: 30 }).notNull().default('recorded'),
  notes: text('notes'),
  effectiveAt: timestamp('effective_at').defaultNow(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  bucketIdx: index('talloc_bucket_idx').on(t.allocationBucket),
  statusIdx: index('talloc_status_idx').on(t.status),
}));

export const reservePositions = pgTable('reserve_positions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  assetSymbol: varchar('asset_symbol', { length: 20 }).notNull(),
  positionType: varchar('position_type', { length: 50 }).notNull(),
  treasuryAccountId: varchar('treasury_account_id', { length: 100 }),
  quantity: decimal('quantity', { precision: 28, scale: 8 }).notNull(),
  markPrice: decimal('mark_price', { precision: 20, scale: 8 }),
  usdValue: decimal('usd_value', { precision: 20, scale: 2 }),
  valuationSource: varchar('valuation_source', { length: 50 }),
  valuationConfidence: varchar('valuation_confidence', { length: 20 }),
  snapshotAt: timestamp('snapshot_at').defaultNow().notNull(),
  // Settlement tracking — added migration 0058
  txHash: varchar('tx_hash', { length: 66 }),
  settlementStatus: varchar('settlement_status', { length: 50 }),
  settlementRef: varchar('settlement_ref', { length: 300 }),
  settlementNote: text('settlement_note'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  assetIdx: index('rp_asset_idx').on(t.assetSymbol),
  snapshotIdx: index('rp_snapshot_idx').on(t.snapshotAt),
  typeIdx: index('rp_type_idx').on(t.positionType),
  settlementIdx: index('rp_settlement_status_idx').on(t.settlementStatus),
  txHashIdx: index('rp_tx_hash_idx').on(t.txHash),
}));

export const custodyWalletRegistry = pgTable('custody_wallet_registry', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar('provider', { length: 50 }).notNull(),
  walletName: varchar('wallet_name', { length: 255 }),
  walletAddress: varchar('wallet_address', { length: 100 }),
  chain: varchar('chain', { length: 50 }),
  assetScope: varchar('asset_scope', { length: 255 }),
  purpose: varchar('purpose', { length: 255 }),
  legalEntityName: varchar('legal_entity_name', { length: 255 }),
  status: varchar('status', { length: 30 }).notNull().default('configured'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  providerIdx: index('cwr_provider_idx').on(t.provider),
  statusIdx: index('cwr_status_idx').on(t.status),
}));

export const disclosureSnapshots = pgTable('disclosure_snapshots', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  snapshotType: varchar('snapshot_type', { length: 50 }).notNull().default('treasury'),
  totalUsd: decimal('total_usd', { precision: 20, scale: 2 }),
  totalFiatUsd: decimal('total_fiat_usd', { precision: 20, scale: 2 }),
  totalUsdcUsd: decimal('total_usdc_usd', { precision: 20, scale: 2 }),
  totalPaxgUsd: decimal('total_paxg_usd', { precision: 20, scale: 2 }),
  totalAxusdSupplyUsd: decimal('total_axusd_supply_usd', { precision: 20, scale: 2 }),
  reserveRatio: decimal('reserve_ratio', { precision: 10, scale: 6 }),
  compositionJson: jsonb('composition_json'),
  sourceBreakdownJson: jsonb('source_breakdown_json'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  typeIdx: index('ds_type_idx').on(t.snapshotType),
  createdIdx: index('ds_created_idx').on(t.createdAt),
}));

export const partnerIntegrations = pgTable('partner_integrations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  partnerName: varchar('partner_name', { length: 100 }).notNull().unique(),
  integrationType: varchar('integration_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('configured'),
  productionEnabled: boolean('production_enabled').default(false),
  sandboxEnabled: boolean('sandbox_enabled').default(false),
  lastSyncAt: timestamp('last_sync_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('pi_status_idx').on(t.status),
}));

export type TreasuryAccount = typeof treasuryAccounts.$inferSelect;
export type InsertTreasuryAccount = typeof treasuryAccounts.$inferInsert;
export type PartnerTreasuryTransaction = typeof partnerTreasuryTransactions.$inferSelect;
export type InsertPartnerTreasuryTransaction = typeof partnerTreasuryTransactions.$inferInsert;
export type TreasuryAllocation = typeof treasuryAllocations.$inferSelect;
export type InsertTreasuryAllocation = typeof treasuryAllocations.$inferInsert;
export type ReservePosition = typeof reservePositions.$inferSelect;
export type InsertReservePosition = typeof reservePositions.$inferInsert;
export type CustodyWalletRegistry = typeof custodyWalletRegistry.$inferSelect;
export type InsertCustodyWalletRegistry = typeof custodyWalletRegistry.$inferInsert;
export type DisclosureSnapshot = typeof disclosureSnapshots.$inferSelect;
export type InsertDisclosureSnapshot = typeof disclosureSnapshots.$inferInsert;
export type PartnerIntegration = typeof partnerIntegrations.$inferSelect;
export type InsertPartnerIntegration = typeof partnerIntegrations.$inferInsert;
