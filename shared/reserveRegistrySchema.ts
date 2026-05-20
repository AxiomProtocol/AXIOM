/**
 * shared/reserveRegistrySchema.ts
 *
 * Phase 2 — Drizzle schema for the AXUSD Reserve and Collateral Registry.
 *
 * NOTE: These tables are defined for Phase 2 but are NOT yet applied via
 * migration. The registry operates from the in-memory seed in Phase 2.
 * Phase 3 should apply this schema via a numbered migration file.
 *
 * Required future migration: create migration file 0059_reserve_registry.sql
 * using `npx drizzle-kit generate` after Phase 3 approval.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  decimal,
} from 'drizzle-orm/pg-core';

// ── reserve_approved_assets ───────────────────────────────────────────────────

export const reserveApprovedAssets = pgTable('reserve_approved_assets', {
  id:                     varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  assetAddress:           varchar('asset_address', { length: 42 }).notNull(),
  assetSymbol:            varchar('asset_symbol', { length: 20 }).notNull(),
  assetDecimals:          integer('asset_decimals').notNull(),
  chainId:                integer('chain_id').notNull().default(42161),

  // Classification
  sleeve:                 varchar('sleeve', { length: 60 }).notNull(),
  status:                 varchar('status', { length: 30 }).notNull().default('PLANNED'),
  disclosureStatus:       varchar('disclosure_status', { length: 30 }).notNull().default('OPERATOR_ONLY'),

  // Eligibility flags
  isLive:                 boolean('is_live').notNull().default(false),
  isPlanned:              boolean('is_planned').notNull().default(true),
  isRedeemable:           boolean('is_redeemable').notNull().default(false),
  isMintEligible:         boolean('is_mint_eligible').notNull().default(false),
  isDisclosureEligible:   boolean('is_disclosure_eligible').notNull().default(false),

  // Valuation
  valuationSource:        varchar('valuation_source', { length: 40 }).notNull().default('PLACEHOLDER'),
  priceUsdPerUnit:        decimal('price_usd_per_unit', { precision: 28, scale: 8 }),
  currentBalance:         decimal('current_balance', { precision: 36, scale: 8 }),
  grossValueUsd:          decimal('gross_value_usd', { precision: 28, scale: 2 }),
  lastValuedAt:           timestamp('last_valued_at'),

  // Haircut policy (stored as JSON for flexibility)
  haircutPolicy:          jsonb('haircut_policy').notNull(),

  // Eligible value (materialized for query performance)
  eligibleReserveValueUsd: decimal('eligible_reserve_value_usd', { precision: 28, scale: 2 }).notNull().default('0'),

  // Custody & attestation (stored as JSON)
  custody:                jsonb('custody').notNull(),

  // Notes
  adminNotes:             text('admin_notes').notNull().default(''),
  metadataUri:            varchar('metadata_uri', { length: 500 }),

  addedAt:                timestamp('added_at').defaultNow().notNull(),
  lastUpdatedAt:          timestamp('last_updated_at').defaultNow().notNull(),
}, (t) => ({
  sleeveIdx:  index('raa_sleeve_idx').on(t.sleeve),
  statusIdx:  index('raa_status_idx').on(t.status),
  symbolIdx:  index('raa_symbol_idx').on(t.assetSymbol),
  liveIdx:    index('raa_live_idx').on(t.isLive),
  chainIdx:   index('raa_chain_idx').on(t.chainId),
}));

// ── reserve_sleeve_config ─────────────────────────────────────────────────────

export const reserveSleeveConfig = pgTable('reserve_sleeve_config', {
  sleeve:                       varchar('sleeve', { length: 60 }).primaryKey(),
  sleeveName:                   varchar('sleeve_name', { length: 100 }).notNull(),
  sleeveDescription:            text('sleeve_description').notNull(),
  isEligibleForAxusdBacking:    boolean('is_eligible_for_axusd_backing').notNull().default(false),
  publicLabel:                  varchar('public_label', { length: 100 }).notNull(),
  disclosureCaution:            text('disclosure_caution'),
  maxSleeveAllocationBps:       integer('max_sleeve_allocation_bps').notNull().default(10000),
  isActive:                     boolean('is_active').notNull().default(true),
  createdAt:                    timestamp('created_at').defaultNow().notNull(),
  updatedAt:                    timestamp('updated_at').defaultNow().notNull(),
});

// ── reserve_attestations ──────────────────────────────────────────────────────

export const reserveAttestations = pgTable('reserve_attestations', {
  id:                 varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  assetId:            varchar('asset_id', { length: 100 }).notNull(),
  assetSymbol:        varchar('asset_symbol', { length: 20 }).notNull(),
  attestationStatus:  varchar('attestation_status', { length: 30 }).notNull(),
  attestationUrlOrCid: varchar('attestation_url_or_cid', { length: 500 }),
  attestedBalance:    decimal('attested_balance', { precision: 36, scale: 8 }),
  attestedValueUsd:   decimal('attested_value_usd', { precision: 28, scale: 2 }),
  attestorName:       varchar('attestor_name', { length: 200 }),
  attestedAt:         timestamp('attested_at'),
  expiresAt:          timestamp('expires_at'),
  notes:              text('notes'),
  rawPayload:         jsonb('raw_payload'),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  assetIdx:  index('ratt_asset_idx').on(t.assetId),
  statusIdx: index('ratt_status_idx').on(t.attestationStatus),
  timeIdx:   index('ratt_time_idx').on(t.attestedAt),
}));

// ── reserve_valuation_snapshots ───────────────────────────────────────────────

export const reserveValuationSnapshots = pgTable('reserve_valuation_snapshots', {
  id:                       varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  snapshotAt:               timestamp('snapshot_at').defaultNow().notNull(),
  totalGrossValueUsd:       decimal('total_gross_value_usd', { precision: 28, scale: 2 }),
  eligibleReserveValueUsd:  decimal('eligible_reserve_value_usd', { precision: 28, scale: 2 }),
  canonicalPsmReserveUsd:   decimal('canonical_psm_reserve_usd', { precision: 28, scale: 2 }),
  plannedGrossValueUsd:     decimal('planned_gross_value_usd', { precision: 28, scale: 2 }),
  operatorTreasuryValueUsd: decimal('operator_treasury_value_usd', { precision: 28, scale: 2 }),
  axusdCirculatingSupply:   decimal('axusd_circulating_supply', { precision: 36, scale: 8 }),
  coverageRatio:            decimal('coverage_ratio', { precision: 10, scale: 6 }),
  sleeveBreakdown:          jsonb('sleeve_breakdown'),
  warnings:                 jsonb('warnings'),
  createdAt:                timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  timeIdx: index('rvs_time_idx').on(t.snapshotAt),
}));

// ── reserve_exclusion_reasons ─────────────────────────────────────────────────

export const reserveExclusionReasons = pgTable('reserve_exclusion_reasons', {
  id:           varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  assetId:      varchar('asset_id', { length: 100 }).notNull(),
  assetSymbol:  varchar('asset_symbol', { length: 20 }).notNull(),
  reason:       varchar('reason', { length: 100 }).notNull(),
  detail:       text('detail').notNull(),
  excludedAt:   timestamp('excluded_at').defaultNow().notNull(),
  excludedBy:   varchar('excluded_by', { length: 200 }),
  resolvedAt:   timestamp('resolved_at'),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  assetIdx:  index('rer_asset_idx').on(t.assetId),
  activeIdx: index('rer_active_idx').on(t.isActive),
}));

// ── Type exports ─────────────────────────────────────────────────────────────

export type ReserveApprovedAsset = typeof reserveApprovedAssets.$inferSelect;
export type ReserveApprovedAssetInsert = typeof reserveApprovedAssets.$inferInsert;
export type ReserveSleeveConfig = typeof reserveSleeveConfig.$inferSelect;
export type ReserveAttestation = typeof reserveAttestations.$inferSelect;
export type ReserveValuationSnapshot = typeof reserveValuationSnapshots.$inferSelect;
export type ReserveExclusionReason = typeof reserveExclusionReasons.$inferSelect;
