import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  jsonb,
  integer,
  numeric,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

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

export const bridgeKycStatusEnum = pgEnum('bridge_kyc_status', [
  'not_started',
  'incomplete',
  'under_review',
  'approved',
  'rejected',
]);

export const bridgeExtAccountStatusEnum = pgEnum('bridge_ext_account_status', [
  'pending',
  'active',
  'failed',
  'deleted',
]);

// ─── bridge_transfers ─────────────────────────────────────────────────────────

export const bridgeTransfers = pgTable('bridge_transfers', {
  id:                       uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress:            varchar('wallet_address', { length: 42 }).notNull(),
  direction:                bridgeDirectionEnum('direction').notNull(),
  status:                   bridgeStatusEnum('status').default('initiated').notNull(),
  fiatAmountCents:          integer('fiat_amount_cents').notNull(),
  fiatCurrency:             varchar('fiat_currency', { length: 3 }).default('USD'),
  cryptoAsset:              bridgeCryptoAssetEnum('crypto_asset').notNull(),
  cryptoAmountStr:          varchar('crypto_amount_str', { length: 50 }),
  exchangeRateStr:          varchar('exchange_rate_str', { length: 50 }),
  fxSnapshotId:             uuid('fx_snapshot_id'),
  feeCents:                 integer('fee_cents').default(0),
  estimatedSettlementMinutes: integer('estimated_settlement_minutes'),
  bitgoWalletId:            varchar('bitgo_wallet_id', { length: 100 }),
  bitgoTxId:                varchar('bitgo_tx_id', { length: 200 }),
  // Bridge API fields
  bridgeTransferId:         varchar('bridge_transfer_id', { length: 100 }),
  bridgeCustomerId:         varchar('bridge_customer_id', { length: 100 }),
  bridgeState:              varchar('bridge_state', { length: 50 }),
  depositBankName:          varchar('deposit_bank_name', { length: 200 }),
  depositAccountNum:        varchar('deposit_account_num', { length: 50 }),
  depositRoutingNum:        varchar('deposit_routing_num', { length: 20 }),
  depositMemo:              varchar('deposit_memo', { length: 500 }),
  rawResponse:              jsonb('raw_response'),
  errorMessage:             text('error_message'),
  achSettledAt:             timestamp('ach_settled_at'),
  cryptoConfirmedAt:        timestamp('crypto_confirmed_at'),
  completedAt:              timestamp('completed_at'),
  failedAt:                 timestamp('failed_at'),
  metadata:                 jsonb('metadata'),
  createdAt:                timestamp('created_at').defaultNow().notNull(),
  updatedAt:                timestamp('updated_at').defaultNow().notNull(),
});

// ─── bridge_fx_snapshots ──────────────────────────────────────────────────────

export const bridgeFxSnapshots = pgTable('bridge_fx_snapshots', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  bridgeTransferId: uuid('bridge_transfer_id'),
  fiatCurrency:     varchar('fiat_currency', { length: 3 }).default('USD'),
  cryptoAsset:      bridgeCryptoAssetEnum('crypto_asset').notNull(),
  rateStr:          varchar('rate_str', { length: 50 }).notNull(),
  bidRateStr:       varchar('bid_rate_str', { length: 50 }),
  askRateStr:       varchar('ask_rate_str', { length: 50 }),
  spreadBps:        integer('spread_bps'),
  source:           varchar('source', { length: 100 }).default('coingecko'),
  validUntil:       timestamp('valid_until'),
  capturedAt:       timestamp('captured_at').defaultNow().notNull(),
});

// ─── bridge_customers ─────────────────────────────────────────────────────────

export const bridgeCustomers = pgTable('bridge_customers', {
  id:                uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress:     varchar('wallet_address', { length: 42 }).notNull().unique(),
  bridgeCustomerId:  varchar('bridge_customer_id', { length: 100 }),
  kycStatus:         bridgeKycStatusEnum('kyc_status').default('not_started').notNull(),
  fullName:          varchar('full_name', { length: 200 }),
  email:             varchar('email', { length: 255 }),
  type:              varchar('type', { length: 20 }).default('individual').notNull(),
  kycLinkUrl:        text('kyc_link_url'),
  kycLinkExpiresAt:  timestamp('kyc_link_expires_at'),
  rawResponse:       jsonb('raw_response'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
});

// ─── bridge_virtual_accounts ──────────────────────────────────────────────────

export const bridgeVirtualAccounts = pgTable('bridge_virtual_accounts', {
  id:                        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress:             varchar('wallet_address', { length: 42 }).notNull(),
  bridgeVirtualAccountId:    varchar('bridge_virtual_account_id', { length: 100 }).unique(),
  bridgeCustomerId:          varchar('bridge_customer_id', { length: 100 }).notNull(),
  sourceCurrency:            varchar('source_currency', { length: 3 }).default('usd').notNull(),
  destinationPaymentRail:    varchar('destination_payment_rail', { length: 50 }).default('arbitrum').notNull(),
  destinationCurrency:       varchar('destination_currency', { length: 20 }).default('usdc').notNull(),
  destinationAddress:        varchar('destination_address', { length: 42 }).notNull(),
  depositBankName:           varchar('deposit_bank_name', { length: 200 }),
  depositAccountNumber:      varchar('deposit_account_number', { length: 50 }),
  depositRoutingNumber:      varchar('deposit_routing_number', { length: 20 }),
  depositBeneficiaryName:    varchar('deposit_beneficiary_name', { length: 200 }),
  depositMemo:               varchar('deposit_memo', { length: 500 }),
  status:                    varchar('status', { length: 50 }).default('active').notNull(),
  rawResponse:               jsonb('raw_response'),
  createdAt:                 timestamp('created_at').defaultNow().notNull(),
  updatedAt:                 timestamp('updated_at').defaultNow().notNull(),
});

// ─── bridge_external_accounts ─────────────────────────────────────────────────

export const bridgeExternalAccounts = pgTable('bridge_external_accounts', {
  id:                        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress:             varchar('wallet_address', { length: 42 }).notNull(),
  bridgeExternalAccountId:   varchar('bridge_external_account_id', { length: 100 }).unique(),
  bridgeCustomerId:          varchar('bridge_customer_id', { length: 100 }).notNull(),
  bankName:                  varchar('bank_name', { length: 200 }),
  accountHolderName:         varchar('account_holder_name', { length: 200 }),
  accountType:               varchar('account_type', { length: 20 }).default('checking').notNull(),
  last4:                     varchar('last4', { length: 4 }),
  routingNumber:             varchar('routing_number', { length: 20 }),
  currency:                  varchar('currency', { length: 3 }).default('usd').notNull(),
  status:                    bridgeExtAccountStatusEnum('status').default('pending').notNull(),
  rawResponse:               jsonb('raw_response'),
  createdAt:                 timestamp('created_at').defaultNow().notNull(),
  updatedAt:                 timestamp('updated_at').defaultNow().notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type BridgeTransfer         = typeof bridgeTransfers.$inferSelect;
export type NewBridgeTransfer      = typeof bridgeTransfers.$inferInsert;
export type BridgeFxSnapshot       = typeof bridgeFxSnapshots.$inferSelect;
export type NewBridgeFxSnapshot    = typeof bridgeFxSnapshots.$inferInsert;
export type BridgeCustomer         = typeof bridgeCustomers.$inferSelect;
export type NewBridgeCustomer      = typeof bridgeCustomers.$inferInsert;
export type BridgeVirtualAccount   = typeof bridgeVirtualAccounts.$inferSelect;
export type NewBridgeVirtualAccount = typeof bridgeVirtualAccounts.$inferInsert;
export type BridgeExternalAccount  = typeof bridgeExternalAccounts.$inferSelect;
export type NewBridgeExternalAccount = typeof bridgeExternalAccounts.$inferInsert;
